import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { db } from '../db/client';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

// Supabase admin client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase credentials in environment variables');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEFAULT_PASSWORD = 'password123';

/**
 * Create a user in Supabase Auth with a specific ID
 */
async function createSupabaseUserWithEmail(email: string, password: string, userData: any): Promise<{ user: any, isNew: boolean }> {
  try {
    console.log(`Creating Supabase Auth user: ${email}`);
    
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        name: userData.name,
        role: userData.role,
        phone: userData.phone,
        full_name: userData.name
      }
    });

    if (error) {
      // If user already exists, skip it
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log(`User ${email} already exists in Supabase Auth, skipping`);
        return { user: null, isNew: false };
      }
      throw error;
    }

    console.log(`Created Supabase Auth user: ${email} (ID: ${data.user.id})`);
    return { user: data.user, isNew: true };
  } catch (error: any) {
    console.error(`Error creating user ${email}:`, error.message);
    throw error;
  }
}

/**
 * Main seeding function
 */
async function seedSupabaseAuth() {
  console.log('Starting Supabase Auth seeding...');
  console.log('================================');

  try {
    // Fetch all users from the database
    console.log('Fetching users from database...');
    const dbUsers = await db.select().from(users);
    console.log(`Found ${dbUsers.length} users in database`);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const dbUser of dbUsers) {
      try {
        console.log(`\nProcessing: ${dbUser.name} (${dbUser.email})`);
        
        // Create user in Supabase Auth (skip if already exists)
        const { user: supabaseUser, isNew } = await createSupabaseUserWithEmail(
          dbUser.email,
          DEFAULT_PASSWORD,
          dbUser
        );

        if (supabaseUser) {
          console.log(`Supabase Auth user created: ${supabaseUser.id}`);
          createdCount++;
        } else {
          console.log(`User already exists in Supabase Auth, skipping`);
          skippedCount++;
        }

      } catch (error: any) {
        console.error(`Failed to process user ${dbUser.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n================================');
    console.log('Supabase Auth seeding completed!');
    console.log(`Total users processed: ${dbUsers.length}`);
    console.log(`Created: ${createdCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('\nAll users can now login with password: ' + DEFAULT_PASSWORD);
    console.log('\nNOTE: The auth system will look up users by email for seeded users,');
    console.log('and by ID for users created through the normal registration flow.');

  } catch (error) {
    console.error('Fatal error during seeding:', error);
    throw error;
  }
}

// Run the seeding
seedSupabaseAuth()
  .then(() => {
    console.log('Supabase Auth seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Supabase Auth seeding failed:', error);
    process.exit(1);
  });