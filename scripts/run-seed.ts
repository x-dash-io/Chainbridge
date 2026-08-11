import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🌱 Starting Complete Chainbridge Seeding Process');
console.log('============================================\n');

async function runCommand(command: string, description: string) {
  console.log(`📋 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(command);
    console.log(`✅ ${description} completed`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    return true;
  } catch (error: any) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

async function main() {
  const steps = [
    {
      command: 'npx tsx scripts/download-images.ts',
      description: 'Downloading and uploading images to Cloudinary'
    },
    {
      command: 'npx tsx scripts/seed-database.ts',
      description: 'Seeding database with realistic data'
    }
  ];

  let allSuccess = true;

  for (const step of steps) {
    const success = await runCommand(step.command, step.description);
    if (!success) {
      allSuccess = false;
      console.log(`⚠️  Continuing despite failure...`);
    }
    console.log();
  }

  console.log('============================================');
  if (allSuccess) {
    console.log('🎉 Seeding process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login with one of the seeded users (e.g., james.smith@chaibridge.com)');
    console.log('3. Explore the dashboards and verify the data');
  } else {
    console.log('⚠️  Seeding process completed with some errors');
    console.log('Please review the error messages above');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});