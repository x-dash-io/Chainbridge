import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createReadStream } from 'node:fs';
import FormData from 'form-data';

// Simple UUID generator
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dxfg7om7j';
const CLOUDINARY_API_KEY = '466934647797747';
const CLOUDINARY_API_SECRET = 'FmV2dYhtcTBdNYXZuV51T2AEZ48';
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

// Product images from Unsplash (free stock photos)
const PRODUCT_IMAGES = [
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
  'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=800&q=80',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=800&q=80',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80',
  'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&q=80',
  'https://images.unsplash.com/photo-1595855709910-38d8b9e7269e?w=800&q=80',
  'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80',
  'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&q=80',
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
  'https://images.unsplash.com/photo-1607305387299-a3d9611cd469?w=800&q=80',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=800&q=80',
  'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=800&q=80',
  'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&q=80',
  'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=800&q=80',
  'https://images.unsplash.com/photo-1595855709910-38d8b9e7269e?w=800&q=80',
  'https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=800&q=80',
  'https://images.unsplash.com/photo-1543362906-acfc16c67564?w=800&q=80',
  'https://images.unsplash.com/photo-1568702846914-96b305d2aa34?w=800&q=80',
  'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80',
];

// User profile images
const PROFILE_IMAGES = [
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80',
];

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToCloudinary(imageBuffer: Buffer, fileName: string, originalUrl: string): Promise<{ url: string; publicId: string }> {
  try {
    const formData = new FormData();
    formData.append('file', imageBuffer, {
      filename: fileName,
      contentType: 'image/jpeg'
    });
    formData.append('upload_preset', 'ml_default'); // Use unsigned upload preset if configured
    
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');
    
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      body: formData as any,
    } as any);
    
    if (!response.ok) {
      throw new Error(`Cloudinary upload failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    return {
      url: data.secure_url,
      publicId: data.public_id
    };
  } catch (error) {
    console.warn(`Cloudinary upload failed for ${fileName}, using original URL`);
    // Fallback to original URL with generated public ID
    return {
      url: originalUrl,
      publicId: `fallback_${uuidv4()}`
    };
  }
}

async function processProductImages() {
  console.log('Processing product images...');
  
  const productImageData: Array<{ url: string; publicId: string }> = [];
  
  // Create output directory
  const outputDir = join(process.cwd(), 'public', 'seed-images');
  await mkdir(outputDir, { recursive: true });
  
  for (let i = 0; i < PRODUCT_IMAGES.length; i++) {
    try {
      console.log(`Downloading product image ${i + 1}/${PRODUCT_IMAGES.length}...`);
      
      const imageBuffer = await downloadImage(PRODUCT_IMAGES[i]);
      const fileName = `product_${i + 1}.jpg`;
      
      // Save locally
      const localPath = join(outputDir, fileName);
      await writeFile(localPath, imageBuffer);
      
      // Upload to Cloudinary
      console.log(`Uploading to Cloudinary...`);
      const cloudinaryData = await uploadToCloudinary(imageBuffer, fileName, PRODUCT_IMAGES[i]);
      
      productImageData.push(cloudinaryData);
      console.log(`✓ Uploaded: ${cloudinaryData.publicId}`);
      
    } catch (error) {
      console.error(`Failed to process image ${i + 1}:`, error);
      // Fallback to original URL
      productImageData.push({
        url: PRODUCT_IMAGES[i],
        publicId: `product_fallback_${i}`
      });
    }
  }
  
  // Save image data to JSON for seed script
  const dataPath = join(process.cwd(), 'scripts', 'product-images.json');
  await writeFile(dataPath, JSON.stringify(productImageData, null, 2));
  
  console.log(`Processed ${productImageData.length} product images`);
  return productImageData;
}

async function processProfileImages() {
  console.log('Processing profile images...');
  
  const profileImageData: Array<{ url: string; publicId: string }> = [];
  
  const outputDir = join(process.cwd(), 'public', 'seed-images', 'profiles');
  await mkdir(outputDir, { recursive: true });
  
  for (let i = 0; i < PROFILE_IMAGES.length; i++) {
    try {
      console.log(`Downloading profile image ${i + 1}/${PROFILE_IMAGES.length}...`);
      
      const imageBuffer = await downloadImage(PROFILE_IMAGES[i]);
      const fileName = `profile_${i + 1}.jpg`;
      
      // Save locally
      const localPath = join(outputDir, fileName);
      await writeFile(localPath, imageBuffer);
      
      // Upload to Cloudinary
      console.log(`Uploading to Cloudinary...`);
      const cloudinaryData = await uploadToCloudinary(imageBuffer, fileName, PROFILE_IMAGES[i]);
      
      profileImageData.push(cloudinaryData);
      console.log(`✓ Uploaded: ${cloudinaryData.publicId}`);
      
    } catch (error) {
      console.error(`Failed to process profile image ${i + 1}:`, error);
      // Fallback to original URL
      profileImageData.push({
        url: PROFILE_IMAGES[i],
        publicId: `profile_fallback_${i}`
      });
    }
  }
  
  // Save image data to JSON for seed script
  const dataPath = join(process.cwd(), 'scripts', 'profile-images.json');
  await writeFile(dataPath, JSON.stringify(profileImageData, null, 2));
  
  console.log(`Processed ${profileImageData.length} profile images`);
  return profileImageData;
}

async function main() {
  console.log('Starting image download and Cloudinary upload...');
  console.log('============================================');
  
  try {
    await processProductImages();
    await processProfileImages();
    
    console.log('============================================');
    console.log('Image processing completed successfully!');
    console.log('Image data saved to scripts/product-images.json and scripts/profile-images.json');
    
  } catch (error) {
    console.error('Error during image processing:', error);
    throw error;
  }
}

main()
  .then(() => {
    console.log('Image processing completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Image processing failed:', error);
    process.exit(1);
  });