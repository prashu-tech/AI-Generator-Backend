// In your models/ImageHistory.js
import mongoose from 'mongoose';

const imageHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String, // 🔥 MAKE SURE THIS EXISTS
    required: true
  },
  model: {
    type: String,
    default: 'flux'
  },
  chatContext: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true // This adds createdAt and updatedAt
});

export const ImageHistory = mongoose.model('ImageHistory', imageHistorySchema);
