import sharp from 'sharp';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

// --- Configuration ---
const config = {
  // Source directory for your images
  sourceDir: 'public/images',

  // Quality settings (0-100)
  quality: {
    jpeg: 80, // For .jpg and .jpeg files
    png: 80,  // For .png files (uses pngquant)
  },

  // Files larger than this (in KB) will be compressed
  minSizeKB: 500,

  // You can also enforce a max width to resize large images
  maxWidthPixels: 1920, 
};
// -------------------

const compressImage = async (filePath) => {
  const fileExtension = path.extname(filePath).toLowerCase();
  const originalSizeInBytes = fs.statSync(filePath).size;
  const originalSizeInKB = (originalSizeInBytes / 1024).toFixed(2);

  if (originalSizeInKB < config.minSizeKB) {
    console.log(`\x1b[38;5;245m- Skipping ${path.basename(filePath)} (${originalSizeInKB} KB) - already below threshold.\x1b[0m`);
    return;
  }

  // Use a temporary file path to avoid read/write conflicts
  const tempFilePath = `${filePath}.tmp`;

  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();

    let newImage = image;

    // Resize if wider than max width
    if (metadata.width && metadata.width > config.maxWidthPixels) {
      newImage = newImage.resize({ width: config.maxWidthPixels });
      console.log(`\x1b[33m  Resizing ${path.basename(filePath)} to ${config.maxWidthPixels}px width.\x1b[0m`);
    }

    if (fileExtension === '.png') {
      newImage = newImage.png({ quality: config.quality.png, effort: 6 });
    } else if (fileExtension === '.jpeg' || fileExtension === '.jpg') {
      newImage = newImage.jpeg({ quality: config.quality.jpeg, mozjpeg: true });
    } else {
      console.log(`\x1b[38;5;245m- Skipping ${path.basename(filePath)} - unsupported format.\x1b[0m`);
      return;
    }

    await newImage.toFile(tempFilePath);

    const newSizeInBytes = fs.statSync(tempFilePath).size;
    const newSizeInKB = (newSizeInBytes / 1024).toFixed(2);
    const reduction = (((originalSizeInBytes - newSizeInBytes) / originalSizeInBytes) * 100).toFixed(2);

    // Replace original file with the compressed one
    fs.renameSync(tempFilePath, filePath);
    
    console.log(`\x1b[32m✔ Compressed ${path.basename(filePath)}: ${originalSizeInKB} KB -> ${newSizeInKB} KB (${reduction}% reduction)\x1b[0m`);

  } catch (error) {
    console.error(`\x1b[31m✖ Error compressing ${path.basename(filePath)}: ${error.message}\x1b[0m`);
    // Clean up temporary file on error
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
};

const run = () => {
  console.log('\n\x1b[36mStarting image compression...\x1b[0m');
  console.log(`\x1b[36mLooking for images larger than ${config.minSizeKB} KB in '${config.sourceDir}'\x1b[0m\n`);
  
  const imagePathPattern = path.join(config.sourceDir, '**', '*.{png,jpg,jpeg}');
  
  // Using glob sync for simplicity in this script
  const files = glob.sync(imagePathPattern, { nodir: true });

  if (files.length === 0) {
    console.log('\x1b[33mNo images found to compress.\x1b[0m');
    return;
  }

  Promise.all(files.map(compressImage))
    .then(() => {
      console.log('\n\x1b[36mImage compression complete.\x1b[0m');
    })
    .catch((error) => {
      console.error('\n\x1b[31mAn error occurred during the compression process:\x1b[0m', error);
    });
};

run(); 