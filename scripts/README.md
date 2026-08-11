# Chainbridge Database Seeding Scripts

This directory contains comprehensive scripts to seed the Chainbridge database with realistic users, products, orders, and simulate 2 months of real system usage.

## Overview

The seeding system creates:
- **35 users** (5 per role: producer, processor, packer, delivery_agent, retailer, consumer, admin)
- **Realistic products** (agricultural and manufactured items with proper categories and pricing)
- **Orders with 2-month timeline** (spaced over 60 days with realistic progression)
- **Complete order lifecycles** (legs, payments, payouts, audit logs)
- **Disputes and resolutions** (admin-reviewed dispute scenarios)
- **Cloudinary image uploads** (product and profile images)

## Scripts

### 1. `download-images.ts`
Downloads free stock images from Unsplash and uploads them to Cloudinary.

**What it does:**
- Downloads 20 product images from Unsplash
- Downloads 10 profile images
- Uploads all images to your Cloudinary account
- Saves image metadata to JSON files for the seed script
- Saves local copies in `public/seed-images/`

**Run:**
```bash
npx tsx scripts/download-images.ts
```

**Requirements:**
- Cloudinary credentials configured in `.env`
- Internet connection for downloading images

### 2. `quick-seed.ts` (Recommended)
Quick database seeding script that handles existing data gracefully.

**What it does:**
- Creates 35 users across all roles with realistic names and emails
- Handles existing users gracefully (skips duplicates)
- Generates products for producers (agricultural) and retailers (manufactured)
- Creates orders spread over 60 days with realistic timelines
- Simulates order progression (70% completed, 30% in various states)
- Creates order legs (raw_supply, processing, packing, delivery)
- Generates payments and payouts
- Creates disputes with admin resolutions
- Adds comprehensive audit logs

**Run:**
```bash
npm run seed:database
# or
npx tsx scripts/quick-seed.ts
```

**Data characteristics:**
- Users: 5 per role using @chaibridge.com emails (adds to existing if any)
- Products: 3-8 per producer, 2-5 per retailer
- Orders: 2-8 per day over 60 days (180-480 total orders)
- Completion rate: 70% completed, 30% in various states
- Disputes: 15 realistic disputes with admin resolutions
- Audit logs: 200 comprehensive audit entries

### 3. `seed-database.ts` (Advanced)
Full database seeding script with Cloudinary image integration.

**What it does:**
- Same as quick-seed but with Cloudinary image upload
- Requires image data to be pre-downloaded via download-images.ts
- More complex setup but includes proper image handling

**Run:**
```bash
npm run seed:full
# or
npx tsx scripts/seed-database.ts
```

### 4. `seed-supabase-auth.ts` (Required for Login)
Supabase Auth seeding script that creates authentication users to match database users.

**What it does:**
- Reads users from the application database
- Creates corresponding users in Supabase Auth
- Sets all passwords to `password123` for consistency
- Auto-confirms emails so users can login immediately
- Links database users to Supabase Auth users by ID
- Handles duplicates gracefully (updates existing users)

**Run:**
```bash
npm run seed:supabase-auth
# or
npx tsx scripts/seed-supabase-auth.ts
```

**Why it's needed:**
The database seed script only creates users in the application database, but authentication requires users in Supabase Auth. This script bridges that gap.

### 6. `simulate-user-actions.sh`
Bash script that simulates real user interactions via API calls.

**What it does:**
- Demonstrates user registration flows
- Shows login and authentication
- Simulates product creation
- Demonstrates order placement
- Shows leg progression
- Simulates payment initiation
- Demonstrates dispute creation
- Shows admin verification and dispute resolution

**Run:**
```bash
./scripts/simulate-user-actions.sh
```

**Note:** This is a template script. For full simulation, run the database seed first.

## Quick Start

### Complete Seeding Process

1. **Quick seed (recommended):**
```bash
npm run seed:database
```

2. **Seed Supabase Auth (required for login):**
```bash
npm run seed:supabase-auth
```

3. **With images (optional):**
```bash
npm run seed:download-images
npm run seed:full
```

4. **Simulate user actions (optional):**
```bash
npm run seed:simulate
```

## Data Characteristics

### Users
- **Email format:** `firstname.lastname@chaibridge.com`
- **Phone numbers:** Kenyan format (+254...)
- **Verification status:** 70% verified
- **Creation dates:** Spread over 60 days

### Products
- **Agricultural products:** Vegetables, dairy, fruits, grains
- **Manufactured products:** Processed foods, frozen foods, bakery items
- **Pricing:** Realistic market rates with profit margins
- **Images:** Cloudinary-hosted with proper public IDs
- **Status:** Mostly active, some sold_out

### Orders
- **Timeline:** 60 days of simulated activity
- **Volume:** 2-8 orders per day
- **Lifecycle:** Complete progression from pending to paid
- **Payment mix:** M-Pesa integration simulation
- **Leg assignments:** Realistic service provider assignments

### Order Legs
- **Types:** raw_supply, processing, packing, delivery
- **Status distribution:** Following realistic completion rates
- **Amounts:** Calculated based on product costs and service fees
- **Timestamps:** Realistic progression over days

### Disputes
- **Reasons:** Quality issues, delays, damages, etc.
- **Resolution types:** Admin override and refund flags
- **Timeline:** Recent disputes (last 30 days)
- **Admin actions:** Proper resolution notes

## Configuration

Ensure your `.env` file contains:

```env
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxfg7om7j
NEXT_PUBLIC_CLOUDINARY_API_KEY=466934647797747
CLOUDINARY_API_SECRET=FmV2dYhtcTBdNYXZuV51T2AEZ48
```

## Package.json Scripts Added

```json
"seed:download-images": "npx tsx scripts/download-images.ts",
"seed:database": "npx tsx scripts/quick-seed.ts",
"seed:full": "npx tsx scripts/seed-database.ts",
"seed:supabase-auth": "npx tsx scripts/seed-supabase-auth.ts",
"seed:all": "npx tsx scripts/run-seed.ts",
"seed:simulate": "bash scripts/simulate-user-actions.sh"
```

## Database Schema Impact

The scripts work with the existing schema:
- `users` - Core user accounts
- `products` - Product listings
- `orders` - Customer orders
- `order_legs` - Order fulfillment steps
- `payments` - M-Pesa payment records
- `payouts` - Service provider payouts
- `disputes` - Dispute records
- `audit_logs` - System audit trail

## Customization

### Adjust User Counts
Edit `USERS_PER_ROLE` in `seed-database.ts`:
```typescript
const USERS_PER_ROLE = 10; // Change from 5 to 10
```

### Change Completion Rate
Edit `ORDER_COMPLETION_RATE` in `seed-database.ts`:
```typescript
const ORDER_COMPLETION_RATE = 0.8; // 80% completed instead of 70%
```

### Modify Simulation Duration
Edit `MONTHS_TO_SIMULATE` in `seed-database.ts`:
```typescript
const MONTHS_TO_SIMULATE = 3; // 3 months instead of 2
```

### Add Custom Products
Edit the product arrays in `seed-database.ts`:
```typescript
const AGRICULTURAL_PRODUCTS = [
  // Add your custom products here
  { name: 'Custom Product', category: 'Custom', unit: 'kg', priceRange: [100, 200] },
];
```

## Troubleshooting

### Cloudinary Upload Failures
- Check your API credentials in `.env`
- Ensure your Cloudinary account allows unsigned uploads
- Verify network connectivity

### Database Connection Issues
- Verify `DATABASE_URL` in `.env`
- Ensure PostgreSQL server is accessible
- Check database permissions

### Script Execution Errors
- Ensure all dependencies are installed: `npm install`
- Verify TypeScript configuration
- Check Node.js version compatibility

## Clean Reset

To reset the database and start fresh:

```bash
# WARNING: This deletes all data
npx drizzle-kit push --force
npx tsx scripts/download-images.ts
npx tsx scripts/seed-database.ts
```

## Verification

After seeding, verify the data:

```bash
# Check user counts
npx drizzle-kit studio

# Or run SQL queries
SELECT role, COUNT(*) FROM users GROUP BY role;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM orders;
SELECT status, COUNT(*) FROM order_legs GROUP BY status;
```

## Production Considerations

- **Never run seed scripts in production without backup**
- **Review all generated data before deploying**
- **Consider environment-specific configurations**
- **Test scripts in development environment first**

## Support

For issues or questions:
1. Check the main Chainbridge documentation
2. Review the HOW_IT_WORKS.md file
3. Verify database schema in db/schema.ts
4. Check API routes in app/api/