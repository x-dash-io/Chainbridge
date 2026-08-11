import { db } from '../db/client';
import { users, products, orders, orderLegs, payments, payouts, disputes, auditLogs } from '../db/schema';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Configuration
const USERS_PER_ROLE = 5;
const DOMAIN = 'chaibridge.com';
const MONTHS_TO_SIMULATE = 2;
const ORDER_COMPLETION_RATE = 0.7;

// User roles
const ROLES = ['producer', 'processor', 'packer', 'delivery_agent', 'retailer', 'consumer', 'admin'] as const;

// Realistic data for users
const FIRST_NAMES = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

// Agricultural products
const AGRICULTURAL_PRODUCTS = [
  { name: 'Fresh Tomatoes', category: 'Vegetables', unit: 'kg', priceRange: [50, 150] },
  { name: 'Organic Potatoes', category: 'Vegetables', unit: 'kg', priceRange: [80, 200] },
  { name: 'Sweet Corn', category: 'Grains', unit: 'kg', priceRange: [60, 120] },
  { name: 'Fresh Milk', category: 'Dairy', unit: 'liter', priceRange: [60, 100] },
  { name: 'Free-range Eggs', category: 'Dairy', unit: 'dozen', priceRange: [300, 500] },
  { name: 'Bananas', category: 'Fruits', unit: 'kg', priceRange: [40, 80] },
  { name: 'Organic Carrots', category: 'Vegetables', unit: 'kg', priceRange: [70, 140] },
  { name: 'Fresh Spinach', category: 'Vegetables', unit: 'kg', priceRange: [90, 180] },
  { name: 'Honey', category: 'Dairy', unit: 'liter', priceRange: [800, 1500] },
  { name: 'Coffee Beans', category: 'Grains', unit: 'kg', priceRange: [500, 900] },
];

// Manufactured products
const MANUFACTURED_PRODUCTS = [
  { name: 'Processed Tomato Sauce', category: 'Processed Foods', unit: 'liter', priceRange: [200, 400] },
  { name: 'Packaged Flour', category: 'Processed Foods', unit: 'kg', priceRange: [150, 300] },
  { name: 'Canned Vegetables', category: 'Processed Foods', unit: 'can', priceRange: [80, 150] },
  { name: 'Frozen Peas', category: 'Frozen Foods', unit: 'kg', priceRange: [250, 450] },
  { name: 'Bread', category: 'Bakery', unit: 'loaf', priceRange: [50, 100] },
  { name: 'Pasta', category: 'Processed Foods', unit: 'kg', priceRange: [200, 350] },
  { name: 'Cooking Oil', category: 'Cooking Essentials', unit: 'liter', priceRange: [300, 600] },
  { name: 'Sugar', category: 'Cooking Essentials', unit: 'kg', priceRange: [120, 250] },
  { name: 'Soap', category: 'Household', unit: 'bar', priceRange: [50, 120] },
  { name: 'Detergent', category: 'Household', unit: 'liter', priceRange: [200, 400] },
];

// Image URLs for products (using free stock images)
const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800',
  'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=800',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=800',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800',
  'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800',
  'https://images.unsplash.com/photo-1595855709910-38d8b9e7269e?w=800',
  'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800',
  'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=800',
];

// Utility functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateEmail(firstName: string, lastName: string, role: string): string {
  const cleanName = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  return `${cleanName}@${DOMAIN}`;
}

function generatePhone(): string {
  return `+254${randomInt(700, 799)}${randomInt(100000, 999999)}`;
}

// Load image data from JSON files
async function loadImageData(): Promise<{ productImages: any[], profileImages: any[] }> {
  try {
    const productImagesPath = './scripts/product-images.json';
    const profileImagesPath = './scripts/profile-images.json';
    
    const productImagesContent = await readFile(productImagesPath, 'utf-8');
    const profileImagesContent = await readFile(profileImagesPath, 'utf-8');
    
    return {
      productImages: JSON.parse(productImagesContent),
      profileImages: JSON.parse(profileImagesContent)
    };
  } catch (error) {
    console.warn('Could not load image data, will use original URLs');
    return {
      productImages: [],
      profileImages: []
    };
  }
}

// Generate users
async function generateUsers() {
  console.log('Generating users...');
  
  const createdUsers: any[] = [];
  
  for (const role of ROLES) {
    for (let i = 0; i < USERS_PER_ROLE; i++) {
      const firstName = randomChoice(FIRST_NAMES);
      const lastName = randomChoice(LAST_NAMES);
      const email = generateEmail(firstName, lastName, role);
      
      const user = await db.insert(users).values({
        id: uuidv4(),
        name: `${firstName} ${lastName}`,
        email: email,
        phone: generatePhone(),
        role: role,
        verified: randomInt(0, 10) > 2, // 70% verified
        createdAt: randomDate(
          new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          new Date()
        )
      }).returning();
      
      createdUsers.push(user[0]);
      console.log(`Created ${role}: ${user[0].name} (${user[0].email})`);
    }
  }
  
  return createdUsers;
}

// Generate products for producers and retailers
async function generateProducts(userMap: Map<string, any[]>) {
  console.log('Generating products...');
  
  const producers = userMap.get('producer') || [];
  const retailers = userMap.get('retailer') || [];
  
  const allProducts = [];
  
  // Agricultural products from producers
  for (const producer of producers) {
    const numProducts = randomInt(3, 8);
    
    for (let i = 0; i < numProducts; i++) {
      const productTemplate = randomChoice(AGRICULTURAL_PRODUCTS);
      const price = randomFloat(productTemplate.priceRange[0], productTemplate.priceRange[1]);
      const quantity = randomInt(50, 500);
      const imageUrl = randomChoice(PRODUCT_IMAGES);
      const publicId = `product_${randomBytes(8).toString('hex')}`;
      
      const product = await db.insert(products).values({
        id: uuidv4(),
        sellerId: producer.id,
        sellerRole: 'producer',
        name: productTemplate.name,
        category: productTemplate.category,
        unit: productTemplate.unit,
        pricePerUnit: price.toFixed(2),
        quantityAvailable: quantity,
        purchaseCost: (price * 0.6).toFixed(2), // 40% margin
        description: `High-quality ${productTemplate.name.toLowerCase()} sourced directly from local farms. ${productTemplate.category} with natural growing methods.`,
        imageUrl: imageUrl,
        imagePublicId: publicId,
        status: 'active',
        createdAt: randomDate(
          new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
          new Date()
        )
      }).returning();
      
      allProducts.push(product[0]);
      console.log(`Created product: ${product[0].name} by ${producer.name}`);
    }
  }
  
  // Manufactured products from retailers
  for (const retailer of retailers) {
    const numProducts = randomInt(2, 5);
    
    for (let i = 0; i < numProducts; i++) {
      const productTemplate = randomChoice(MANUFACTURED_PRODUCTS);
      const price = randomFloat(productTemplate.priceRange[0], productTemplate.priceRange[1]);
      const quantity = randomInt(20, 200);
      const imageUrl = randomChoice(PRODUCT_IMAGES);
      const publicId = `product_${randomBytes(8).toString('hex')}`;
      
      const product = await db.insert(products).values({
        id: uuidv4(),
        sellerId: retailer.id,
        sellerRole: 'retailer',
        name: productTemplate.name,
        category: productTemplate.category,
        unit: productTemplate.unit,
        pricePerUnit: price.toFixed(2),
        quantityAvailable: quantity,
        purchaseCost: (price * 0.7).toFixed(2), // 30% margin
        description: `Premium ${productTemplate.name.toLowerCase()} with quality assurance. ${productTemplate.category} meeting industry standards.`,
        imageUrl: imageUrl,
        imagePublicId: publicId,
        status: 'active',
        createdAt: randomDate(
          new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
          new Date()
        )
      }).returning();
      
      allProducts.push(product[0]);
      console.log(`Created product: ${product[0].name} by ${retailer.name}`);
    }
  }
  
  return allProducts;
}

// Generate orders with realistic 2-month timeline
async function generateOrders(userMap: Map<string, any[]>, allProducts: any[]) {
  console.log('Generating orders...');
  
  const consumers = userMap.get('consumer') || [];
  const processors = userMap.get('processor') || [];
  const packers = userMap.get('packer') || [];
  const deliveryAgents = userMap.get('delivery_agent') || [];
  const admins = userMap.get('admin') || [];
  
  const allOrders = [];
  const startDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
  const endDate = new Date();
  
  // Generate orders spread over 2 months
  for (let day = 0; day < 60; day++) {
    const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    const ordersForDay = randomInt(2, 8); // 2-8 orders per day
    
    for (let i = 0; i < ordersForDay; i++) {
      const consumer = randomChoice(consumers);
      const product = randomChoice(allProducts);
      const quantity = randomInt(1, 20);
      const totalAmount = (parseFloat(product.pricePerUnit) * quantity).toFixed(2);
      
      const order = await db.insert(orders).values({
        id: uuidv4(),
        consumerId: consumer.id,
        productId: product.id,
        quantity: quantity,
        totalAmount: totalAmount,
        createdAt: randomDate(
          new Date(currentDate.getTime() - 2 * 60 * 60 * 1000), // Within that day
          currentDate
        )
      }).returning();
      
      allOrders.push(order[0]);
      
      // Create order legs
      const legs = [];
      
      // Raw supply leg (assigned to producer)
      const rawSupplyAmount = (parseFloat(product.purchaseCost || '0') * quantity).toFixed(2);
      const rawSupplyLeg = await db.insert(orderLegs).values({
        id: uuidv4(),
        orderId: order[0].id,
        legType: 'raw_supply',
        assignedUserId: product.sellerId,
        status: 'pending',
        amount: rawSupplyAmount,
        assignedAt: null,
        completedAt: null
      }).returning();
      legs.push(rawSupplyLeg[0]);
      
      // Processing leg (if manufactured product)
      if (product.category === 'Processed Foods' || product.category === 'Frozen Foods' || product.category === 'Bakery') {
        const processor = randomChoice(processors);
        const processingAmount = (parseFloat(totalAmount) * 0.15).toFixed(2);
        const processingLeg = await db.insert(orderLegs).values({
          id: uuidv4(),
          orderId: order[0].id,
          legType: 'processing',
          assignedUserId: processor.id,
          status: 'pending',
          amount: processingAmount,
          assignedAt: null,
          completedAt: null
        }).returning();
        legs.push(processingLeg[0]);
      }
      
      // Packing leg
      const packer = randomChoice(packers);
      const packingAmount = (parseFloat(totalAmount) * 0.10).toFixed(2);
      const packingLeg = await db.insert(orderLegs).values({
        id: uuidv4(),
        orderId: order[0].id,
        legType: 'packing',
        assignedUserId: packer.id,
        status: 'pending',
        amount: packingAmount,
        assignedAt: null,
        completedAt: null
      }).returning();
      legs.push(packingLeg[0]);
      
      // Delivery leg
      const deliveryAgent = randomChoice(deliveryAgents);
      const deliveryAmount = (parseFloat(totalAmount) * 0.12).toFixed(2);
      const deliveryLeg = await db.insert(orderLegs).values({
        id: uuidv4(),
        orderId: order[0].id,
        legType: 'delivery',
        assignedUserId: deliveryAgent.id,
        status: 'pending',
        amount: deliveryAmount,
        assignedAt: null,
        completedAt: null
      }).returning();
      legs.push(deliveryLeg[0]);
      
      // Simulate order lifecycle based on completion rate
      const shouldComplete = Math.random() < ORDER_COMPLETION_RATE;
      
      if (shouldComplete) {
        await simulateOrderProgression(order[0], legs, currentDate);
      } else {
        // Leave some orders in various states
        await simulatePartialProgression(order[0], legs, currentDate);
      }
      
      console.log(`Created order #${day}-${i}: ${product.name} for ${consumer.name}`);
    }
  }
  
  return allOrders;
}

// Simulate complete order progression
async function simulateOrderProgression(order: any, legs: any[], orderDate: Date) {
  const delays = [0.5, 1, 2, 1]; // Days between leg completions
  
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const delayDays = delays[i] || 1;
    const assignedAt = new Date(orderDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
    const completedAt = new Date(assignedAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000);
    
    await db.update(orderLegs)
      .set({
        status: 'completed',
        assignedAt: assignedAt,
        completedAt: completedAt
      })
      .where(eq(orderLegs.id, leg.id));
    
    // Create payout
    await db.insert(payouts).values({
      id: uuidv4(),
      orderLegId: leg.id,
      userId: leg.assignedUserId,
      amount: leg.amount,
      status: 'paid',
      createdAt: completedAt,
      paidAt: new Date(completedAt.getTime() + 24 * 60 * 60 * 1000)
    });
    
    // Create audit log
    await db.insert(auditLogs).values({
      id: uuidv4(),
      eventType: 'leg_completed',
      actorId: leg.assignedUserId,
      resourceType: 'order_leg',
      resourceId: leg.id,
      details: `Completed ${leg.legType} leg for order ${order.id}`,
      createdAt: completedAt
    });
  }
  
  // Create payment record
  await db.insert(payments).values({
    id: uuidv4(),
    orderId: order.id,
    checkoutRequestId: `checkout_${randomBytes(16).toString('hex')}`,
    mpesaReceipt: `MPESA_${randomBytes(10).toString('hex').toUpperCase()}`,
    amount: order.totalAmount,
    status: 'completed',
    createdAt: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000)
  });
}

// Simulate partial order progression (for incomplete orders)
async function simulatePartialProgression(order: any, legs: any[], orderDate: Date) {
  const states = ['pending', 'assigned', 'in_progress', 'completed'];
  const finalState = randomChoice(['pending', 'assigned', 'in_progress']);
  
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const legStateIndex = states.indexOf(finalState);
    const targetState = states[Math.min(legStateIndex + randomInt(-1, 1), states.length - 1)];
    
    let assignedAt = null;
    let completedAt = null;
    
    if (targetState !== 'pending') {
      assignedAt = new Date(orderDate.getTime() + randomInt(1, 5) * 24 * 60 * 60 * 1000);
    }
    
    if (targetState === 'completed' && assignedAt) {
      completedAt = new Date(assignedAt.getTime() + randomInt(1, 3) * 24 * 60 * 60 * 1000);
    }
    
    await db.update(orderLegs)
      .set({
        status: targetState as any,
        assignedAt: assignedAt,
        completedAt: completedAt
      })
      .where(eq(orderLegs.id, leg.id));
    
    // Create payout only for completed legs
    if (targetState === 'completed' && completedAt) {
      await db.insert(payouts).values({
        id: uuidv4(),
        orderLegId: leg.id,
        userId: leg.assignedUserId,
        amount: leg.amount,
        status: 'paid',
        createdAt: completedAt,
        paidAt: new Date(completedAt.getTime() + 24 * 60 * 60 * 1000)
      });
    }
  }
  
  // Create payment record based on order status
  const paymentStatus = finalState === 'completed' ? 'completed' : randomChoice(['initiated', 'pending_confirmation']);
  await db.insert(payments).values({
    id: uuidv4(),
    orderId: order.id,
    checkoutRequestId: `checkout_${randomBytes(16).toString('hex')}`,
    mpesaReceipt: paymentStatus === 'completed' ? `MPESA_${randomBytes(10).toString('hex').toUpperCase()}` : null,
    amount: order.totalAmount,
    status: paymentStatus,
    createdAt: new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000)
  });
}

// Generate disputes
async function generateDisputes(userMap: Map<string, any[]>, allOrders: any[]) {
  console.log('Generating disputes...');
  
  const consumers = userMap.get('consumer') || [];
  const admins = userMap.get('admin') || [];
  
  // Get recent order legs
  const recentLegs = await db.select()
    .from(orderLegs)
    .where(and(
      // Legs from last 30 days
      // Add date filter if needed
    ))
    .limit(50);
  
  const disputeReasons = [
    'Product quality not as described',
    'Delivery delay beyond acceptable timeframe',
    'Damaged goods received',
    'Quantity discrepancy',
    'Poor packaging condition',
    'Communication issues with provider',
    'Wrong item delivered'
  ];
  
  // Create disputes for some legs
  for (const leg of recentLegs.slice(0, 15)) {
    const consumer = randomChoice(consumers);
    const admin = randomChoice(admins);
    const reason = randomChoice(disputeReasons);
    const resolutionType = randomChoice(['resolved_override', 'resolved_refund_flagged']);
    
    const dispute = await db.insert(disputes).values({
      id: uuidv4(),
      orderLegId: leg.id,
      raisedByUserId: consumer.id,
      resolvedByAdminId: admin.id,
      reason: reason,
      status: resolutionType as any,
      resolutionNotes: `Admin reviewed the case and determined ${resolutionType === 'resolved_override' ? 'to override the leg status and approve payment' : 'to flag for refund due to valid customer complaint'}. Action taken after careful consideration of evidence provided.`,
      createdAt: randomDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      ),
      resolvedAt: randomDate(
        new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        new Date()
      )
    }).returning();
    
    console.log(`Created dispute: ${reason} - ${resolutionType}`);
  }
}

// Generate audit logs
async function generateAuditLogs(userMap: Map<string, any[]>) {
  console.log('Generating audit logs...');
  
  const allUsers = Object.values(userMap).flat();
  const eventTypes = [
    'user_login',
    'product_created',
    'product_updated',
    'order_created',
    'order_cancelled',
    'payment_initiated',
    'payment_completed',
    'payout_processed',
    'dispute_raised',
    'dispute_resolved',
    'user_verified'
  ];
  
  for (let i = 0; i < 200; i++) {
    const user = randomChoice(allUsers);
    const eventType = randomChoice(eventTypes);
    const resourceType = eventType.includes('product') ? 'product' : 
                       eventType.includes('order') ? 'order' :
                       eventType.includes('payment') ? 'payment' :
                       eventType.includes('dispute') ? 'dispute' : 'user';
    
    await db.insert(auditLogs).values({
      id: uuidv4(),
      eventType: eventType,
      actorId: user.id,
      resourceType: resourceType,
      resourceId: uuidv4(),
      details: `${eventType.replace('_', ' ')} performed by ${user.name}`,
      createdAt: randomDate(
        new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        new Date()
      )
    });
  }
  
  console.log('Generated 200 audit log entries');
}

// Main seeding function
async function seedDatabase() {
  console.log('Starting database seeding...');
  console.log('===========================');
  
  try {
    // Generate users
    const createdUsers = await generateUsers();
    
    // Map users by role
    const userMap = new Map<string, any[]>();
    for (const role of ROLES) {
      userMap.set(role, createdUsers.filter((u: any) => u.role === role));
    }
    
    // Generate products
    const allProducts = await generateProducts(userMap);
    
    // Generate orders
    const allOrders = await generateOrders(userMap, allProducts);
    
    // Generate disputes
    await generateDisputes(userMap, allOrders);
    
    // Generate audit logs
    await generateAuditLogs(userMap);
    
    console.log('===========================');
    console.log('Database seeding completed successfully!');
    console.log(`Created ${createdUsers.length} users`);
    console.log(`Created ${allProducts.length} products`);
    console.log(`Generated orders with realistic 2-month timeline`);
    console.log(`Added disputes and resolutions`);
    console.log(`Generated comprehensive audit logs`);
    
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  });