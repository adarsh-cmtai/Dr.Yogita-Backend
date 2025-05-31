// backend/config/razorpay.js
const Razorpay = require('razorpay');
require('dotenv').config(); // Ensures .env variables are loaded

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error("FATAL ERROR: Razorpay Key ID or Key Secret is not defined in .env file.");
  // process.exit(1); // Optionally exit if keys are critical for startup
}

const instance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

module.exports = instance;