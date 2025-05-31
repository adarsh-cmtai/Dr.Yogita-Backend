// backend/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
    // Will be set upon successful payment verification
  },
  razorpaySignature: {
    type: String,
    // Will be set upon successful payment verification
  },
  ebook: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ebook', // Assuming your Ebook model is named 'Ebook'
    required: true,
  },
  user: { // Optional: If you have user accounts
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  customerDetails: {
    name: String,
    email: String,
    phone: String,
  },
  amount: { // Amount in paisa
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
    default: 'INR',
  },
  status: {
    type: String,
    enum: ['created', 'attempted', 'paid', 'failed'],
    default: 'created',
  },
  receipt: String,
  notes: mongoose.Schema.Types.Mixed, // For any additional notes from Razorpay
}, { timestamps: true });

module.exports = mongoose.model('Payment', PaymentSchema);