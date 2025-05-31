// backend/controllers/paymentController.js
const axios = require('axios');
const crypto = require('crypto');
// const Payment = require('../models/Payment'); // Optional: if you're saving payment records
const Ebook = require('../models/Ebook');
const NutritionPlan = require('../models/NutritionPlan'); // Import NutritionPlan model

const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const isProduction = process.env.NODE_ENV === 'production';
const CASHFREE_API_BASE_URL = isProduction ? process.env.CASHFREE_API_BASE_URL_PROD : process.env.CASHFREE_API_BASE_URL_TEST;
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01'; // Use a recent API version

// Check for essential Cashfree configuration
if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY || !CASHFREE_API_BASE_URL) {
    console.error("FATAL ERROR: Cashfree App ID, Secret Key, or API Base URL is not defined in .env file.");
    // process.exit(1); // Consider if critical
}
if (!process.env.FRONTEND_URL) {
    console.warn("WARNING: FRONTEND_URL is not defined in .env. This is needed for Cashfree return_url.");
}
if (!process.env.BACKEND_API_URL_FOR_WEBHOOKS) {
    console.warn("WARNING: BACKEND_API_URL_FOR_WEBHOOKS is not defined in .env. This is needed for Cashfree notify_url (webhooks).");
}

// @desc    Create Cashfree Order (for JS SDK payment_session_id)
// @route   POST /api/payment/cashfree-create-order
// @access  Public
exports.createCashfreeOrder = async (req, res) => {
    try {
        const { amount, currency = 'INR', notes, customerDetails } = req.body;
        // 'notes' should now contain: itemId, itemType ('ebook' or 'nutritionPlan'), itemName (optional)

        // --- Validations ---
        if (!amount) return res.status(400).json({ success: false, error: 'Amount is required.' });
        if (isNaN(Number(amount)) || Number(amount) <= 0) return res.status(400).json({ success: false, error: 'Invalid amount provided.' });
        
        if (!notes || !notes.itemId || !notes.itemType) {
            return res.status(400).json({ success: false, error: 'Item ID and Item Type are required in notes.' });
        }
        
        if (!customerDetails || !customerDetails.id || !customerDetails.phone || !customerDetails.email) {
            return res.status(400).json({ success: false, error: 'Customer ID, phone, and email are required.' });
        }

        let item;
        let itemTypeName = ""; // For order note, e.g., "E-book", "Nutrition Plan"
        let itemSlugForOrderId = "item"; // For generating unique order ID part

        if (notes.itemType === 'ebook') {
            item = await Ebook.findById(notes.itemId);
            itemTypeName = "E-book";
            if(item) itemSlugForOrderId = item.slug.replace(/[^a-zA-Z0-9]/g, '').substring(0,10);
        } else if (notes.itemType === 'nutritionPlan') {
            item = await NutritionPlan.findById(notes.itemId);
            itemTypeName = "Nutrition Plan";
             if(item) itemSlugForOrderId = item.slug.replace(/[^a-zA-Z0-9]/g, '').substring(0,10);
        } else {
            return res.status(400).json({ success: false, error: 'Invalid item type specified.' });
        }

        if (!item) {
            return res.status(404).json({ success: false, error: `${itemTypeName || 'Item'} with ID ${notes.itemId} not found.` });
        }

        // Server-side price check (Cashfree expects amount in currency units)
        if (Number(amount) !== item.price) {
            console.warn(`Price mismatch: Frontend sent ${amount} INR, Item price is ${item.price} INR for ID ${item._id} (Type: ${notes.itemType})`);
            return res.status(400).json({ success: false, error: `Price mismatch. Expected ${item.price} INR for ${item.title}.` });
        }

        const order_id = `CF_ORDER_${itemSlugForOrderId}_${Date.now()}`; // Your internal unique order ID

        const payload = {
            order_id: order_id,
            order_amount: Number(amount),
            order_currency: currency.toUpperCase(),
            customer_details: {
                customer_id: customerDetails.id, // Your internal customer ID
                customer_email: customerDetails.email,
                customer_phone: customerDetails.phone,
                customer_name: customerDetails.name || undefined,
            },
            order_meta: {
                return_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-status?order_id={order_id}`, // {order_id} is Cashfree's placeholder
                notify_url: `${process.env.BACKEND_API_URL_FOR_WEBHOOKS || 'http://localhost:5001'}/api/payment/cashfree-webhook`,
                // payment_methods: "cc,dc,nb,upi,app,paylater,emi" // Often better to let Cashfree manage this based on your account settings.
            },
            order_note: `${itemTypeName} Purchase: ${item.title} (ID: ${item._id})`,
            order_tags: { // Custom tags
                itemId: item._id.toString(),
                itemType: notes.itemType,
                itemSlug: item.slug, // Store slug for easier reference
                customerNameForTag: customerDetails.name || 'N/A',
            }
        };

        console.log("Attempting to create Cashfree order with payload:", JSON.stringify(payload, null, 2));

        const response = await axios.post(`${CASHFREE_API_BASE_URL}/orders`, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-client-id': CASHFREE_APP_ID,
                'x-client-secret': CASHFREE_SECRET_KEY,
                'x-api-version': CASHFREE_API_VERSION,
            }
        });

        const cashfreeOrderData = response.data;
        console.log("Cashfree order created successfully:", cashfreeOrderData);
       
        res.status(200).json({
            success: true,
            payment_session_id: cashfreeOrderData.payment_session_id,
            cf_order_id: cashfreeOrderData.cf_order_id, // Cashfree's own order ID for this transaction
            your_order_id: order_id, // The order_id you sent in the request
        });

    } catch (error) {
        const errorResponse = error.response?.data;
        console.error("Cashfree Create Order - Backend Error:", error.message);
        if (errorResponse) {
            console.error("Cashfree Error Details:", JSON.stringify(errorResponse, null, 2));
        }
        res.status(error.response?.status || 500).json({
            success: false,
            error: errorResponse?.message || error.message || 'Failed to create Cashfree order on the server.'
        });
    }
};

// @desc    Handle Cashfree Webhook
// @route   POST /api/payment/cashfree-webhook
// @access  Public (Cashfree calls this)
exports.cashfreeWebhook = async (req, res) => {
    console.log("Cashfree Webhook received. Body:", JSON.stringify(req.body, null, 2));
    // console.log("Webhook Headers:", JSON.stringify(req.headers, null, 2));

    const receivedSignature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const payloadString = JSON.stringify(req.body); // Raw payload string for signature verification

    // --- CRUCIAL: Signature Verification ---
    if (timestamp && receivedSignature && payloadString && CASHFREE_SECRET_KEY) {
        try {
            const message = timestamp + payloadString;
            const expectedSignature = crypto
                .createHmac('sha256', CASHFREE_SECRET_KEY)
                .update(message)
                .digest('base64');

            if (expectedSignature !== receivedSignature) {
                console.error("Webhook signature mismatch! Expected:", expectedSignature, "Got:", receivedSignature, "Timestamp:", timestamp);
                // In production, you MUST return 401 or similar if signature fails
                // return res.status(401).send('Invalid webhook signature.'); 
                console.warn("Proceeding despite signature mismatch (DEV/TEST ONLY)"); // For dev
            } else {
                console.log("Webhook signature verified successfully.");
            }
        } catch (sigError) {
            console.error("Error during webhook signature verification:", sigError.message);
            // return res.status(500).send('Error verifying webhook signature.');
            console.warn("Proceeding despite signature verification error (DEV/TEST ONLY)"); // For dev
        }
    } else {
        console.warn("Webhook missing signature, timestamp, or secret key. Proceeding without verification (NOT FOR PRODUCTION).");
    }
    // --- END SIGNATURE VERIFICATION ---

    const { data, event_time, type } = req.body;

    if (data && data.order && data.order.order_id && data.order.order_status) {
        const yourOrderId = data.order.order_id; // This is YOUR order_id
        const cfOrderId = data.order.cf_order_id; // Cashfree's order ID
        const orderStatus = data.order.order_status;
        const paymentAmount = data.order.order_amount;
        const itemTypeFromTags = data.order.order_tags?.itemType;
        const itemIdFromTags = data.order.order_tags?.itemId;

        console.log(`Webhook: Your Order ID: ${yourOrderId}, CF Order ID: ${cfOrderId}, Status: ${orderStatus}, Amount: ${paymentAmount}, ItemType: ${itemTypeFromTags}, ItemID: ${itemIdFromTags}`);

        // TODO: Update your database based on the order status
        // Example: Find an internal order record by 'yourOrderId' and update its status.
        // If 'PAID', grant access to the purchased item (ebook, nutrition plan).

        if (orderStatus === "PAID") {
            console.log(`Order ${yourOrderId} marked as PAID via webhook.`);
            // Example fulfillment logic:
            if (itemTypeFromTags && itemIdFromTags) {
                console.log(`Fulfilling order for ${itemTypeFromTags} ID: ${itemIdFromTags}. Customer: ${data.customer_details?.customer_email}`);
                // e.g., await grantAccessToItem(data.customer_details.customer_email, itemIdFromTags, itemTypeFromTags);
                // e.g., await sendPurchaseConfirmationEmail(data.customer_details.customer_email, itemDetails);
            } else {
                console.warn(`Webhook PAID: Item ID/Type not found in order_tags for order ${yourOrderId}. Cannot auto-fulfill.`);
            }
        } else if (["FAILED", "USER_DROPPED", "VOID", "CANCELLED", "EXPIRED", "ERROR"].includes(orderStatus)) {
            console.log(`Order ${yourOrderId} status is ${orderStatus} via webhook.`);
            // Update order status in your DB to reflect failure/cancellation.
        } else {
            console.log(`Order ${yourOrderId} status update: ${orderStatus}. No specific action configured for this status.`);
        }
    } else {
        console.warn("Webhook received without expected data.order fields (order_id, order_status). Type:", type);
    }

    res.status(200).send('Webhook Acknowledged'); // Always send 200 OK to Cashfree
};

// @desc    Get Cashfree Order Status (polled by client after payment attempt)
// @route   GET /api/payment/cashfree-order-status/:yourOrderId
// @access  Public
exports.getCashfreeOrderStatus = async (req, res) => {
    try {
        const { yourOrderId } = req.params; // This is YOUR internal order_id
        if (!yourOrderId) {
            return res.status(400).json({ success: false, error: "Your Order ID is required." });
        }

        console.log(`Client polling status for internal order ID: ${yourOrderId}`);

        const response = await axios.get(`${CASHFREE_API_BASE_URL}/orders/${yourOrderId}`, {
            headers: {
                'x-client-id': CASHFREE_APP_ID,
                'x-client-secret': CASHFREE_SECRET_KEY,
                'x-api-version': CASHFREE_API_VERSION,
            }
        });
        const orderDataFromCashfree = response.data;
        // console.log("Cashfree Get Order Status API response:", JSON.stringify(orderDataFromCashfree, null, 2));
       
        res.status(200).json({
            success: true,
            status: orderDataFromCashfree.order_status, // e.g., "PAID", "ACTIVE", "FAILED"
            orderData: orderDataFromCashfree, // Full order data from Cashfree
            // You can extract item details from order_tags if needed by the client success page
            itemType: orderDataFromCashfree.order_tags?.itemType,
            itemId: orderDataFromCashfree.order_tags?.itemId,
            itemSlug: orderDataFromCashfree.order_tags?.itemSlug,
        });

    } catch (error) {
        const errorResponse = error.response?.data;
        console.error("Get Cashfree Order Status - Backend Error:", error.message);
        if (errorResponse) console.error("Cashfree Error Details (Get Status):", errorResponse);
        res.status(error.response?.status || 500).json({
            success: false,
            error: errorResponse?.message || error.message || "Failed to get order status."
        });
    }
};