import { asyncHandler } from '../utils/asyncHandler.js';
import { ImageHistory } from '../models/ImageHistory.js';
import cloudinary from '../../config/cloudinary.js'; // From Step 4 of Cloudinary setup
import { Readable } from 'stream'; // For converting blobs/files to streams
import fetch from 'node-fetch'; // For Pollinations API calls
import rateLimit from 'express-rate-limit';

// Set max to a very high number (effectively unlimited)
const generationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: Number.MAX_SAFE_INTEGER, // Effectively unlimited (9007199254740991)
  message: 'Too many generations. Try again later.',
  keyGenerator: (req, res) => {
    return req.user ? req.user._id.toString() : req.ip;
  }
});


const API_BASE = 'https://image.pollinations.ai'; 
const TEXT_API = 'https://text.pollinations.ai';



// Helper: Upload to Cloudinary (returns public URL)
async function uploadToStorage(blobOrFile) {
  let buffer;

  // Handle Node.js fetch Blob or multer File
  if (blobOrFile && typeof blobOrFile.arrayBuffer === 'function') {
    buffer = Buffer.from(await blobOrFile.arrayBuffer());
  } else if (blobOrFile?.buffer) {
    buffer = blobOrFile.buffer;
  } else {
    console.log('Invalid blobOrFile:', blobOrFile); // Debug invalid input
    throw new Error('No valid blob or file provided for upload');
  }

  console.log('Buffer created, size:', buffer.length); // Debug buffer
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "ai-images", resource_type: "image" },
      (error, result) => {
        if (error) {
          console.log('Cloudinary error details:', {
            message: error.message,
            http_code: error.http_code,
            signature: error.signature,
            stringToSign: error.stringToSign
          });
          return reject(error);
        }
        // 🔥 IMPORTANT: Make sure to return secure_url
        console.log('Cloudinary upload successful:', result.secure_url);
        resolve(result.secure_url); // Return the full URL
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}


 // In your dashboardController.js - Update generateImage function

const generateImage = asyncHandler(async (req, res) => {
  const { prompt, model = 'flux', width = 1024, height = 1024, seed, enhance = true, safe = true } = req.body;

  let url = `${API_BASE}/prompt/${encodeURIComponent(prompt)}?model=${model}&width=${width}&height=${height}&enhance=${enhance}&safe=${safe}`;
  if (seed) url += `&seed=${seed}`;

  console.log('Fetching from URL:', url);
  const response = await fetch(url);
  console.log('Fetch response status:', response.status, 'OK:', response.ok);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Pollinations API failed: ${response.status} - ${errorText}`);
  }

  const blob = await response.blob();
  console.log('Blob received:', blob ? 'Valid' : 'Undefined');

  if (!blob || typeof blob.arrayBuffer !== 'function') {
    throw new Error('Invalid blob object received from response');
  }

  // 🔥 Upload to Cloudinary and get URL
  const imageUrl = await uploadToStorage(blob);
  console.log('✅ Image uploaded to Cloudinary:', imageUrl);

  // 🔥 CRITICAL: Save to database with proper error handling
  try {
    const historyEntry = new ImageHistory({
      user: req.user._id,
      prompt,
      imageUrl, // This should be the full Cloudinary URL
      model
    });

    const savedEntry = await historyEntry.save();
    console.log('✅ Database save successful:', {
      id: savedEntry._id,
      imageUrl: savedEntry.imageUrl,
      user: savedEntry.user
    });

    // Send response
    res.json({ 
      success: true, 
      imageUrl: savedEntry.imageUrl, // Use the saved URL
      historyId: savedEntry._id 
    });

  } catch (dbError) {
    console.error('❌ Database save failed:', dbError);
    throw new Error('Failed to save image to database: ' + dbError.message);
  }
});


// Edit Image
const editImage = [generationLimiter, asyncHandler(async (req, res) => {
  const { prompt, imageUrl, model = 'kontext' } = req.body;

  let url = `${API_BASE}/prompt/${encodeURIComponent(prompt)}?model=${model}&image=${encodeURIComponent(imageUrl)}`;

  console.log('Fetching edit from URL:', url); // Debug URL
  const response = await fetch(url);
  console.log('Fetch response status:', response.status, 'OK:', response.ok);

  if (!response.ok) throw new Error('Image edit failed');

  const blob = await response.blob();
  const newImageUrl = await uploadToStorage(blob);

  const historyEntry = new ImageHistory({
    user: req.user._id,
    prompt,
    imageUrl: newImageUrl,
    model
  });
  await historyEntry.save();

  res.json({ success: true, imageUrl: newImageUrl, historyId: historyEntry._id });
})];

// Get User History
const getHistory = asyncHandler(async (req, res) => {
  const history = await ImageHistory.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, history });
});

// Save Chat History
const saveHistory = asyncHandler(async (req, res) => {
  const { historyId, chatContext } = req.body;
  const entry = await ImageHistory.findOne({ _id: historyId, user: req.user._id });
  if (!entry) throw new Error('History not found');

  entry.chatContext = chatContext;
  await entry.save();

  res.json({ success: true });
});

// Add this test function to your controller
const testDatabase = asyncHandler(async (req, res) => {
  try {
    // Test creating a simple record
    const testEntry = new ImageHistory({
      user: req.user._id,
      prompt: 'Test prompt',
      imageUrl: 'https://test.cloudinary.com/test.jpg',
      model: 'test'
    });

    const saved = await testEntry.save();
    console.log('✅ Test database save successful:', saved);

    // Test retrieving it
    const retrieved = await ImageHistory.findById(saved._id);
    console.log('✅ Test database retrieve successful:', retrieved);

    // Clean up
    await ImageHistory.findByIdAndDelete(saved._id);

    res.json({ success: true, message: 'Database test passed' });
  } catch (error) {
    console.error('❌ Database test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


export { generateImage, editImage, getHistory, saveHistory, uploadToStorage, testDatabase };