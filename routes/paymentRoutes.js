// backend/routes/paymentRoutes.js
const express = require('express');
const {
    createCashfreeOrder,
    cashfreeWebhook,
    getCashfreeOrderStatus
} = require('../controllers/paymentController');

const router = express.Router();

// Cashfree Endpoints
router.post('/cashfree-create-order', createCashfreeOrder);
router.post('/cashfree-webhook', cashfreeWebhook); // Cashfree will POST to this
router.get('/cashfree-order-status/:yourOrderId', getCashfreeOrderStatus);


// You can remove or comment out Razorpay specific routes if not used
// const { createOrder, verifyPayment } = require('../controllers/paymentController'); // Old Razorpay
// router.post('/create-order', createOrder);
// router.post('/verify-payment', verifyPayment);

module.exports = router;