# How ChainBridge Works

This document explains the current implementation of ChainBridge as it exists in this repository. It is written from the perspective of the running application, not from a product-marketing angle.

## 1. What the system is trying to do

ChainBridge is a multi-role supply chain workflow app. It connects a buyer, a seller, and several service providers into a single order lifecycle that can be tracked from the first product request to payment confirmation and payout settlement.

The core idea is simple:

- a producer lists a product,
- a consumer or retailer places an order,
- the order is split into fulfillment legs,
- each leg is assigned to a service provider,
- payment is requested through M-Pesa,
- payment confirmation triggers payout records for the assigned workers,
- disputes and cancellations can intervene when a leg goes wrong.

## 2. The main domain objects

The application is centered around a few persistent entities defined in [db/schema.ts](db/schema.ts):

- Users: every person in the system has a role such as producer, processor, packer, delivery_agent, retailer, consumer, or admin.
- Products: items created by sellers for sale.
- Orders: a purchase request for a product and a quantity.
- Order legs: each order is broken into one or more fulfillment steps, such as raw supply, processing, packing, and delivery.
- Payments: the M-Pesa payment record for an order.
- Payouts: payments owed to the person assigned to a leg.
- Disputes: complaints raised against a leg when something goes wrong.

These entities are not just data; they define the business flow. The system uses them to decide what a role can do, how an order progresses, and when money should be moved.

## 3. The role model

The app is designed around distinct personas:

- Producer: creates products and owns the raw supply step for the product.
- Processor: handles the processing leg.
- Packer: handles the packing leg.
- Delivery agent: handles delivery.
- Retailer: can act like a buyer and also create resale listings.
- Consumer: buys products and tracks orders.
- Admin: sees the wider system state and can help resolve issues.

Role checks happen through [lib/auth/index.ts](lib/auth/index.ts). The app first loads the signed-in user from Supabase auth, then matches that identity to the application user record in the database. If the role is not allowed for the requested route or action, the app redirects the user to the correct dashboard.

## 4. Authentication and session handling

Authentication is built on Supabase, but the app also keeps a local user profile table in the database.

The flow is:

1. Supabase authenticates the identity.
2. The app fetches the matching row from the users table in the database.
3. The role and profile metadata from that row are used to authorize dashboards and server actions.

The auth helpers are in [lib/auth/index.ts](lib/auth/index.ts) and [lib/auth/actions.ts](lib/auth/actions.ts). The dashboard shell in [app/(dashboard)/layout.tsx](app/(dashboard)/layout.tsx) depends on this user lookup for navigation and role display.

## 5. Product and listing flow

Products are created through the producer experience. The producer dashboard loads the seller’s products, shows inventory, and presents a form for creating or updating listings.

A product has:

- a seller,
- a category,
- a unit,
- a price per unit,
- an available quantity,
- an optional description and image,
- an optional source order if it is a resale listing.

The app also supports retailers creating resale listings. That means a retailer can take an existing order or a sourcing relationship and turn it into a new product listing for resale. The resale logic is implemented in [lib/products/actions.ts](lib/products/actions.ts) and [lib/products/create-resale-listing.ts](lib/products/create-resale-listing.ts).

## 6. How an order is created

The order creation path starts in the consumer or retailer dashboard and flows through the server action layer.

The key files are:

- [lib/orders/actions.ts](lib/orders/actions.ts)
- [lib/orders/create-order.ts](lib/orders/create-order.ts)

When a buyer places an order, the system:

1. checks that the product exists,
2. verifies that requested quantity is available,
3. calculates the product cost,
4. builds optional service legs for processing, packing, and delivery,
5. creates a new order record,
6. creates the initial raw supply leg for the producer,
7. creates any additional service legs for the selected providers,
8. reduces the available product quantity.

The order total is the product subtotal plus the amounts attached to the optional service legs.

### Important detail

The system uses a transaction when creating an order. That means the inventory decrement and the order/leg inserts are treated as one atomic unit. If one step fails, the whole order creation is rolled back.

## 7. How order legs work

An order is not just a single database row. It is a workflow made of order legs.

Each leg has:

- a type: raw_supply, processing, packing, or delivery,
- an assigned user if one exists,
- a status,
- an amount,
- timestamps for assignment and completion.

The status machine is defined in [lib/orders/transition-leg.ts](lib/orders/transition-leg.ts). The legal transitions are intentionally narrow:

- pending → assigned or cancelled
- assigned → in_progress or cancelled
- in_progress → completed
- completed → paid

This prevents the UI and backend from allowing impossible workflow jumps.

The app also computes an overall order state from the leg statuses via [lib/orders/compute-order-status.ts](lib/orders/compute-order-status.ts). That is how the dashboards decide whether an order is pending, in progress, completed, or cancelled.

## 8. How work is progressed and approved

The service providers do not receive a generic task queue in the simplest sense. They interact with the system through the leg state machine.

A leg transition is allowed only when:

- the requested new status is legal,
- the actor is the assigned user for that leg or the system is making an allowed change,
- the leg exists.

The same transition logic is used by the UI and by server actions, which means the app’s rules stay consistent regardless of where the change originates.

## 9. Payment flow with M-Pesa

The payment experience is handled by the M-Pesa integration layer.

The flow is:

1. The consumer or retailer chooses to pay for an order.
2. The checkout UI posts to the STK push route in [app/api/mpesa/stk-push/route.ts](app/api/mpesa/stk-push/route.ts).
3. The route checks that the authenticated user owns the order and is allowed to make payments.
4. The app calls [lib/mpesa/stk-push.ts](lib/mpesa/stk-push.ts), which talks to the Daraja STK push API.
5. If Daraja accepts the request, the app stores a payment record with a checkout request ID.
6. M-Pesa sends a callback to [app/api/mpesa/callback/route.ts](app/api/mpesa/callback/route.ts).
7. The callback is processed by [lib/mpesa/verify-callback.ts](lib/mpesa/verify-callback.ts).

The callback processing logic is important because it is where the system decides whether a payment is truly successful.

### What the callback does

When the callback arrives, the app:

- validates the payload structure,
- finds the matching payment by checkout request ID,
- marks the payment as completed or failed,
- checks that the amounts match,
- creates payout records for the assigned service providers on each leg.

That means payment confirmation is not just a UI change; it is the event that unlocks the payout pipeline.

## 10. How payouts work

Payouts are separate from payments. A payment is the customer paying the order. A payout is the platform or business logic paying the service provider who completed a leg.

When a payment is processed successfully, the system creates payout rows in the database for the assigned user on each leg that is not cancelled. These payout rows begin with the status owed and can later be marked paid after the consumer confirms receipt or the business logic chooses to settle them.

The payout logic is connected to the revenue reports in [lib/orders/revenue.ts](lib/orders/revenue.ts).

## 11. Receipt confirmation and settlement

The consumer or retailer can confirm receipt after a leg reaches the completed state. That action updates the leg to paid and marks any related payout as paid.

This is implemented in [lib/orders/actions.ts](lib/orders/actions.ts) as the confirm receipt action.

In other words, the system has two stages:

- completion of the leg,
- settlement of the payout after confirmation.

## 12. Cancellation and dispute handling

The system also supports exceptional cases.

### Cancellation

An order can be cancelled only while the relevant legs are still in cancellable states, such as pending or assigned. The cancel logic in [lib/orders/cancel-order.ts](lib/orders/cancel-order.ts) updates the legs, removes pending payouts, updates the payment status, and restores product inventory.

### Disputes

A dispute can be raised for a specific leg by either the consumer or the assigned actor. The dispute record is created in [lib/disputes/raise-dispute.ts](lib/disputes/raise-dispute.ts). The admin experience later exposes these disputes so they can be reviewed and resolved.

## 13. How the UI is structured

The frontend uses Next.js App Router.

The main areas are:

- [app/page.tsx](app/page.tsx): landing/home page
- [app/(auth)](app/(auth)): login, register, password reset, and forgot-password screens
- [app/(dashboard)](app/(dashboard)): role-based dashboards for producer, consumer, retailer, delivery, processor, packer, and admin
- [components](components): reusable UI and feature components

The dashboards are mostly server-rendered pages that load data from the database and pass it into client components. The consumer checkout experience is a good example of this pattern: a multi-step client UI collects the order information, and a server action creates the order.

## 14. How data is exposed to the UI

Each dashboard page gathers the relevant business data from the database and transforms it into a shape the UI can render.

Examples:

- the producer dashboard shows products, incoming orders, and revenue,
- the consumer dashboard shows products, active orders, and order history,
- the retailer dashboard shows resale opportunities and revenue,
- the admin dashboard exposes user and order oversight tools.

The dashboard pages are the best entry point if you want to understand how the system behaves from a user perspective.

## 15. How the system is wired together

If you want to follow one complete business flow through the codebase, this is the most useful path:

1. Start with [db/schema.ts](db/schema.ts) to understand the business entities.
2. Follow [lib/orders/create-order.ts](lib/orders/create-order.ts) to see how an order is created.
3. Follow [lib/orders/transition-leg.ts](lib/orders/transition-leg.ts) to see how work progresses.
4. Follow [lib/mpesa/stk-push.ts](lib/mpesa/stk-push.ts) and [lib/mpesa/verify-callback.ts](lib/mpesa/verify-callback.ts) for payment handling.
5. Follow [lib/orders/revenue.ts](lib/orders/revenue.ts) for payout and revenue reporting.
6. Read the dashboard pages in [app/(dashboard)](app/(dashboard)) to see the end-user experience.

## 16. Practical developer notes

A few important implementation details are worth remembering:

- The app uses Drizzle ORM with a PostgreSQL-style schema.
- The system is strongly workflow-driven; most business rules live in server-side logic rather than in the UI.
- The payment and payout pipeline is one of the most important cross-cutting flows in the codebase.
- The app currently uses a pragmatic, implementation-focused approach to security: it validates data and auth state, but some production-grade checks such as full callback origin verification are still expressed as TODO-style logic rather than a complete implementation.

## 17. Short version

ChainBridge works like this:

- users authenticate and receive roles,
- sellers create products,
- buyers place orders,
- each order is broken into work legs,
- those legs move through a controlled state machine,
- payments are initiated through M-Pesa,
- successful payments create payout records,
- dashboards expose the current status to each role,
- disputes and cancellations provide exception handling.

That is the core of the system. The remainder of the codebase is mostly about shaping that workflow into a usable experience for each role.
