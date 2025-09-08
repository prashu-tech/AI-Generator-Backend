import mongoose, { Schema } from 'mongoose';

const transformationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalImage: {
    url: String,
    publicId: String,
    width: Number,
    height: Number,
    format: String,
    bytes: Number
  },
  transformedImage: {
    url: String,
    publicId: String,
    style: {
      type: String,
      enum: ['ukiyoe', 'watercolor', 'cyberpunk', 'oil_painting'],
      required: true
    },
    processingTime: Number
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  creditsUsed: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

export const Transformation = mongoose.model('Transformation', transformationSchema);