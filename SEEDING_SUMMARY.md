# Chainbridge Database Seeding Summary

## Complete Seeding System Created

I've successfully created a comprehensive seed script system for Chainbridge that generates realistic users, products, orders, and simulates 2 months of real system usage.

## Created Files

### 1. scripts/quick-seed.ts (Recommended)
- Main seeding script that handles existing data gracefully
- Creates 35 users (5 per role) with realistic @chainbridge.co.ke emails
- Generates agricultural products for producers
- Generates manufactured products for retailers  
- Creates orders spread over 60 days with realistic progression
- Simulates order lifecycles (70% completed, 30% in various states)
- Creates order legs (raw_supply, processing, packing, delivery)
- Generates payments and payouts
- Creates disputes with admin resolutions
- Adds comprehensive audit logs

### 2. scripts/download-images.ts
- Downloads free stock images from Unsplash
- Uploads images to Cloudinary
- Saves image metadata for seed script
- Creates local backups in public/seed-images/

### 3. scripts/simulate-user-actions.sh
- Bash script demonstrating real API interactions
- Shows user registration, login, product creation
- Demonstrates order placement and leg progression
- Shows payment initiation and dispute creation
- Admin verification and resolution examples

### 4. scripts/README.md
- Comprehensive documentation for all scripts
- Usage instructions and customization options
- Troubleshooting guide
- Production considerations

### 5. scripts/run-seed.ts
- Orchestrates the complete seeding process
- Runs image download and database seeding
- Provides progress feedback

## Configuration

### Current Settings
- **Users per role:** 5 (35 total users)
- **Email domain:** @chainbridge.co.ke
- **Simulation period:** 2 months (60 days)
- **Order completion rate:** 70%
- **Orders per day:** 2-8 (180-480 total orders)
- **Products per producer:** 3-8
- **Products per retailer:** 2-5
- **Disputes:** 15 realistic scenarios
- **Audit logs:** 200 comprehensive entries

### Product Categories
**Agricultural (Producers):**
- Vegetables: Tomatoes, Potatoes, Carrots, Spinach, Sweet Corn
- Dairy: Milk, Eggs, Honey
- Fruits: Bananas
- Grains: Coffee Beans

**Manufactured (Retailers):**
- Processed Foods: Tomato Sauce, Flour, Canned Vegetables, Pasta
- Frozen Foods: Frozen Peas
- Bakery: Bread
- Cooking Essentials: Cooking Oil, Sugar
- Household: Soap, Detergent

## Usage

### Quick Start (Recommended)
```bash
npm run seed:database
```

### With Images (Optional)
```bash
npm run seed:download-images
npm run seed:full
```

### Simulate User Actions
```bash
npm run seed:simulate
```

## Package.json Scripts Added

```json
"seed:download-images": "npx tsx scripts/download-images.ts",
"seed:database": "npx tsx scripts/quick-seed.ts",
"seed:full": "npx tsx scripts/seed-database.ts",
"seed:all": "npx tsx scripts/run-seed.ts",
"seed:simulate": "bash scripts/simulate-user-actions.sh"
```

## Data Characteristics

### Users
- **Email format:** firstname.lastname@chainbridge.co.ke
- **Phone numbers:** Kenyan format (+254...)
- **Verification status:** 70% verified
- **Creation dates:** Spread over 60 days
- **Roles:** producer, processor, packer, delivery_agent, retailer, consumer, admin

### Products
- **Images:** Cloudinary-hosted with proper public IDs
- **Pricing:** Realistic market rates with profit margins
- **Status:** Mostly active, some sold_out
- **Descriptions:** Realistic product descriptions

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

## Realistic Features

### User Behavior Simulation
- Different activity patterns per role
- Realistic order timing (2-8 orders per day)
- Varied completion rates
- Natural progression through order states

### Business Logic Integration
- Proper leg assignment to service providers
- Realistic fee calculations (10-15% of order value)
- Payment confirmation triggers payout creation
- Dispute resolution affects leg status

### Data Relationships
- Users properly linked to their roles
- Products linked to correct seller types
- Orders include proper consumer-product relationships
- Legs assigned to appropriate service providers
- Payments linked to orders with M-Pesa simulation
- Payouts linked to completed legs
- Disputes linked to legs with admin resolutions

## Security & Safety

- **Graceful duplicate handling:** Script handles existing users
- **Database safety:** Uses transactions for data integrity
- **Validation:** All data follows schema constraints
- **Environment configuration:** Uses .env for credentials
- **No hard-coded secrets:** Cloudinary credentials from environment

## Customization Options

### Adjust User Counts
Edit `USERS_PER_ROLE` in `quick-seed.ts`:
```typescript
const USERS_PER_ROLE = 10; // Change from 5 to 10
```

### Change Completion Rate
Edit `ORDER_COMPLETION_RATE` in `quick-seed.ts`:
```typescript
const ORDER_COMPLETION_RATE = 0.8; // 80% completed instead of 70%
```

### Modify Simulation Duration
Edit simulation timeline in order generation loop
- Currently generates 60 days of activity
- Can be adjusted to any duration

### Add Custom Products
Edit product arrays in `quick-seed.ts`:
```typescript
const AGRICULTURAL_PRODUCTS = [
  // Add your custom products here
  { name: 'Custom Product', category: 'Custom', unit: 'kg', priceRange: [100, 200] },
];
```

## Key Features

1. **Idempotent:** Can be run multiple times without duplicate data
2. **Realistic timing:** Orders spread over actual time periods
3. **Role-appropriate actions:** Each role performs relevant actions
4. **Complete workflows:** Orders go through full lifecycle
5. **Error handling:** Graceful handling of conflicts and issues
6. **Comprehensive audit:** All actions logged for traceability
7. **Image support:** Optional Cloudinary integration
8. **API simulation:** Demonstrates real API usage patterns

## Next Steps

1. **Run the seed script:**
   ```bash
   npm run seed:database
   ```

2. **Verify the data:**
   ```bash
   npm run db:studio
   ```

3. **Test the application:**
   ```bash
   npm run dev
   ```

4. **Login with seeded users:**
   - Producer: linda.martinez@chainbridge.co.ke
   - Consumer: jennifer.brown@chainbridge.co.ke
   - Admin: charles.jackson@chainbridge.co.ke
   - Default password: password123

5. **View all user credentials:**
   - See SEEDED_USER_CREDENTIALS.md for complete account listing

## Summary

The seeding system is now complete and ready to use. It creates a realistic, production-like dataset that simulates 2 months of real system usage with proper relationships, realistic timing, and comprehensive business logic integration. The system is designed to be both comprehensive for testing and realistic for demonstration purposes.