# Chainbridge Application Flow

## Overview

Chainbridge is a direct marketplace for Kenya's supply chain, connecting farmers, processors, packers, delivery agents, retailers, and consumers in a single platform. The application uses Next.js with App Router, Supabase for authentication, PostgreSQL for data storage, and M-Pesa for payments.

## Complete User Flow

### 1. User Registration and Authentication

**Flow:**
1. User visits `/register` and selects their role (producer, processor, packer, delivery_agent, retailer, consumer)
2. User fills in registration details (name, email, phone, password)
3. System creates Supabase Auth user account
4. System creates corresponding database user profile with role
5. User receives email confirmation
6. User logs in via `/login` using email and password
7. System authenticates via Supabase Auth
8. System looks up user profile by Supabase Auth ID (falls back to email lookup for seeded users)
9. User is redirected to their role-specific dashboard

**Authentication Architecture:**
- Supabase Auth handles authentication (login, signup, password reset)
- Application database stores user profiles, roles, and business data
- Auth system uses dual lookup: ID-first, email-fallback for seeded users
- Session management via Supabase cookies and middleware

### 2. Role-Based Dashboards

Each role has a specialized dashboard:

**Producer Dashboard (`/producer`):**
- View and manage products
- Create new product listings
- Track order status
- View payouts and earnings
- Monitor inventory levels

**Processor Dashboard (`/processor`):**
- View assigned processing orders
- Accept/reject processing assignments
- Update processing status
- Track completed processing jobs
- View processing payouts

**Packer Dashboard (`/packer`):**
- View assigned packing orders
- Accept/reject packing assignments
- Update packing status
- Track completed packing jobs
- View packing payouts

**Delivery Agent Dashboard (`/delivery`):**
- View assigned delivery orders
- Accept/reject delivery assignments
- Update delivery status
- Track completed deliveries
- View delivery payouts

**Retailer Dashboard (`/retailer`):**
- Browse and purchase products from producers
- Create orders
- Track order status
- View order history
- Manage inventory

**Consumer Dashboard (`/consumer`):**
- Browse products from retailers
- Create orders
- Track order status
- View order history
- Report issues/disputes

**Admin Dashboard (`/admin`):**
- View all users and activities
- Monitor platform metrics
- Resolve disputes
- Manage system settings
- View audit logs

### 3. Product Creation and Listing

**Producer Flow:**
1. Producer logs in and navigates to producer dashboard
2. Producer clicks "Add Product"
3. Producer fills in product details:
   - Name, description, category
   - Price per unit, quantity available
   - Unit type (kg, pieces, etc.)
   - Upload product image (optional)
4. System saves product to database
5. Product becomes visible to retailers
6. Image uploaded to Cloudinary (if provided)

**Retailer Flow:**
1. Retailer can also create products (manufactured/processed items)
2. Similar process to producer
3. Products visible to consumers

### 4. Order Creation and Fulfillment

**Consumer Order Flow:**
1. Consumer browses products on marketplace
2. Consumer selects product and quantity
3. Consumer initiates order
4. System creates order record
5. System triggers M-Pesa payment
6. Consumer pays via M-Pesa
7. Payment callback confirms payment
8. Order moves to fulfillment phase

**Order Fulfillment Chain:**
Each order is broken into 4 sequential legs:

1. **Raw Supply Leg** (Producer → Processor)
   - Assigned to processor
   - Processor accepts and processes raw materials
   - Status: pending → assigned → in_progress → completed

2. **Processing Leg** (Processor → Packer)
   - Assigned to packer
   - Packer accepts and packs processed goods
   - Status: pending → assigned → in_progress → completed

3. **Packing Leg** (Packer → Delivery Agent)
   - Assigned to delivery agent
   - Delivery agent accepts and picks up packed goods
   - Status: pending → assigned → in_progress → completed

4. **Delivery Leg** (Delivery Agent → Consumer)
   - Delivery agent delivers to consumer
   - Consumer confirms receipt
   - Status: pending → assigned → in_progress → completed

**Order States:**
- **Pending:** Order created, awaiting payment
- **In Progress:** Payment confirmed, fulfillment started
- **Completed:** All legs completed, delivered to consumer
- **Cancelled:** Order cancelled by consumer or system

### 5. Payment Processing

**M-Pesa Integration:**
1. Consumer initiates payment via "Pay Now" button
2. System generates M-Pesa STK push request
3. Consumer receives M-Pesa prompt on phone
4. Consumer enters M-Pesa PIN to confirm payment
5. M-Pesa processes payment
6. M-Pesa sends callback to system with payment status
7. System updates payment record in database
8. Order fulfillment begins if payment successful

**Payment States:**
- **Initiated:** Payment request sent to M-Pesa
- **Pending Confirmation:** Waiting for M-Pesa callback
- **Completed:** Payment successful
- **Failed:** Payment failed
- **Cancelled:** Payment cancelled

### 6. Payout System

**Payout Flow:**
1. Order leg completed successfully
2. System calculates payout amount (leg amount)
3. System creates payout record for assigned user
4. Payout status: "owed"
5. Admin can mark payout as "paid"
6. Payout paid timestamp recorded

**Payout Recipients:**
- Processor receives payout for raw supply leg
- Packer receives payout for processing leg
- Packer receives payout for packing leg
- Delivery agent receives payout for delivery leg

### 7. Dispute Resolution

**Dispute Creation:**
1. Consumer or assigned user raises dispute on order leg
2. Dispute includes reason (quality issues, delays, damages, etc.)
3. Dispute status: "open"
4. Admin notified of new dispute

**Dispute Resolution:**
1. Admin reviews dispute details
2. Admin can resolve in two ways:
   - **Override:** Approve leg status and payment (for minor issues)
   - **Refund Flagged:** Flag for refund due to valid complaint
3. Admin adds resolution notes
4. Dispute status updated to "resolved_override" or "resolved_refund_flagged"
5. Resolution timestamp recorded

### 8. Audit Logging

**Audit Events:**
All significant actions are logged:
- User creation and updates
- Product creation and updates
- Order creation and status changes
- Leg assignments and status updates
- Payment and payout creation
- Dispute creation and resolution
- Admin actions

**Audit Log Structure:**
- Event type (user_created, order_completed, etc.)
- Actor ID (user who performed action)
- Resource type (user, product, order, etc.)
- Resource ID
- Details (additional context)
- Timestamp

### 9. Password Reset Flow

**Forgot Password:**
1. User navigates to `/forgot-password`
2. User enters email address
3. System generates password reset link
4. Link URL determined by environment:
   - Local: `http://localhost:3000/reset-password`
   - Production: `https://chainbridge-two.vercel.app/reset-password`
5. Supabase sends reset email to user
6. User clicks reset link in email
7. User is redirected to reset page
8. User enters new password
9. System updates password in Supabase Auth
10. User can login with new password

**Security Features:**
- Rate limiting per email address
- Email enumeration protection (same message for all emails)
- Link expiration (1 hour)
- HTTPS enforcement in production

### 10. Seeded Data System

**Seeding Process:**
1. Run `npm run seed:database` to create realistic test data
2. Run `npm run seed:supabase-auth` to create Supabase Auth users
3. System creates 94 users across all roles
4. Users have realistic Kenyan names and phone numbers
5. Email addresses use @chaibridge.com domain
6. All users share default password: `password123`

**Seeded Data Includes:**
- 94 users with various roles
- Agricultural products for producers
- Manufactured products for retailers
- Orders with realistic timestamps (2-month span)
- Order legs with varied statuses
- Payments and M-Pesa-like data
- Payouts for completed legs
- Disputes with admin resolutions
- Audit logs for all activities

**Seeded User Lookup:**
- Auth system attempts ID lookup first
- Falls back to email lookup for seeded users
- Allows seeded users to login with database email addresses

## Technical Architecture

### Frontend
- **Framework:** Next.js 16 with App Router
- **Styling:** Tailwind CSS
- **Components:** React with TypeScript
- **State Management:** React hooks and server actions

### Backend
- **Runtime:** Node.js with Edge runtime support
- **API:** Next.js API routes and server actions
- **Database:** PostgreSQL via Drizzle ORM
- **Authentication:** Supabase Auth
- **File Storage:** Cloudinary

### Database Schema
- **users:** User profiles and roles
- **products:** Product listings
- **orders:** Consumer orders
- **orderLegs:** Order fulfillment stages
- **payments:** Payment records
- **payouts:** Payout records
- **auditLogs:** System audit trail
- **disputes:** Dispute records

### Environment Configuration
- **Local:** http://localhost:3000
- **Production:** https://chainbridge-two.vercel.app
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Payments:** M-Pesa
- **Storage:** Cloudinary

## User Roles and Permissions

### Producer
- Create and manage products
- View assigned orders
- Receive payouts for raw supply

### Processor
- Accept processing assignments
- Update processing status
- Receive processing payouts

### Packer
- Accept packing assignments
- Update packing status
- Receive packing payouts

### Delivery Agent
- Accept delivery assignments
- Update delivery status
- Receive delivery payouts

### Retailer
- Purchase products from producers
- Create products for consumers
- Manage inventory

### Consumer
- Browse and purchase products
- Track orders
- Raise disputes

### Admin
- View all system activities
- Resolve disputes
- Manage payouts
- Monitor platform health

## Deployment Architecture

### Local Development
- Run `npm run dev` for development server
- Uses local .env configuration
- Connects to Supabase development database
- Password reset links point to localhost

### Production (Vercel)
- Deployed to Vercel
- Uses Vercel environment variables
- Connects to Supabase production database
- Password reset links point to chainbridge-two.vercel.app
- Automatic HTTPS via Vercel

## Security Considerations

1. **Authentication:** Supabase Auth with secure session management
2. **Authorization:** Role-based access control
3. **Data Protection:** Environment variables for sensitive data
4. **Rate Limiting:** Password reset rate limiting
5. **HTTPS:** Enforced in production
6. **Email Security:** Email enumeration protection
7. **Audit Trail:** Comprehensive logging of all actions

## Integration Points

1. **Supabase Auth:** User authentication and management
2. **Supabase Database:** PostgreSQL database hosting
3. **M-Pesa:** Mobile payments integration
4. **Cloudinary:** Image storage and CDN
5. **Vercel:** Application hosting and deployment

## Current Implementation Status

### Completed Features
- User authentication and role-based dashboards
- Product creation and management
- Order creation and fulfillment chain
- Payment processing with M-Pesa
- Payout system
- Dispute resolution
- Audit logging
- Password reset (localhost and Vercel)
- Seeded data system (94 users, realistic data)
- Environment-aware URL generation

### Configuration Required
- Vercel environment variable: `NEXT_PUBLIC_SITE_URL=https://chainbridge-two.vercel.app`
- Supabase redirect URLs: Add production domain
- Supabase email templates: Configure reset password template

### Ready for Testing
- All seeded users can login with `password123`
- Password reset works in both environments
- Full supply chain flow is functional
- Payment integration ready for M-Pesa testing
- All roles have appropriate dashboards and permissions

The application is now fully functional and ready for production deployment with proper configuration.