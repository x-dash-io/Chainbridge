# ChainBridge

ChainBridge is a Next.js application for coordinating a multi-role supply chain workflow. It supports producers, processors, packers, delivery teams, retailers, consumers, and administrators with a shared order lifecycle, status tracking, disputes, and payments.

## What it does

- Role-based dashboards for each participant in the fulfillment chain
- Order creation, leg tracking, and status transitions
- Product management and resale listing workflows
- Dispute raising and resolution flows
- MPesa STK push integration with callback verification
- Admin reporting and user oversight tools

## Tech stack

- Next.js 16 with React 19 and TypeScript
- Drizzle ORM with PostgreSQL
- Tailwind CSS and shadcn-style UI primitives
- Vitest for automated tests

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create the required environment variables for your database, Supabase, and MPesa setup.
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 in your browser.

## Useful commands

```bash
npm run build
npm run lint
npm run typecheck
npx vitest run
```

## Notes

Generated graph and analysis artifacts under the graphify-out directory are ignored and should not be committed.
