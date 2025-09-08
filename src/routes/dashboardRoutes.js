import multer from "multer";
import { Router } from 'express';
import { generateImage, editImage, getHistory, saveHistory, uploadToStorage } from '../controllers/dashboardController.js';
import { verifyToken } from "../middlewares/auth.js"; 
import { asyncHandler } from "../utils/asyncHandler.js";
import cloudinary from '../../config/cloudinary.js'; // From Step 4 of Cloudinary setup



const router = Router();



router.route("/generate").post(verifyToken, generateImage);  // Generate new image
router.route("/edit").post(verifyToken, editImage);  // Edit existing image
router.route("/history").get(verifyToken, getHistory);   // Get user's image history
router.route("/history").post(verifyToken, saveHistory);   // Save new entry to history


// In src/routes/dashboardRoutes.js
router.get('/test-cloudinary-import', asyncHandler(async (req, res) => {
  try {
    console.log('Testing cloudinary:', typeof cloudinary === 'object' && cloudinary.config);
    res.json({ success: true, message: 'Cloudinary is defined' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
}));


const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/upload",
  verifyToken,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const imageUrl = await uploadToStorage(req.file);
    res.json({ success: true, imageUrl });
  })
);

export default router;