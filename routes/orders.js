const { Order } = require('../models/order');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/product');
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const router = express.Router();

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create a new Razorpay order
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency } = req.body;
        
        const options = {
            amount: amount * 100, // Amount in paisa
            currency: currency || 'INR',
            receipt: `receipt_${Date.now()}`
        };

        const razorpayOrder = await razorpay.orders.create(options);
        res.json({ success: true, order: razorpayOrder });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Verify Razorpay payment
router.post('/verify-payment', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        
        const generated_signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        res.json({ success: true, message: 'Payment verified successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Create a new order after successful payment
router.post('/', async (req, res) => {
    try {
        const { orderItems, shippingAddress1, shippingAddress2, city, zip, country, phone, status, user, razorpay_payment_id } = req.body;
        
        if (!razorpay_payment_id) {
            return res.status(400).json({ success: false, message: 'Payment ID is required' });
        }

        const orderItemsIds = await Promise.all(orderItems.map(async (orderItem) => {
            const product = await Product.findById(orderItem.product);
            if (!product) {
                throw new Error(`Product not found: ${orderItem.product}`);
            }
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product
            });
            newOrderItem = await newOrderItem.save();
            return newOrderItem._id;
        }));

        const totalPrices = await Promise.all(orderItemsIds.map(async (orderItemId) => {
            const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
            return orderItem?.product?.price * orderItem.quantity || 0;
        }));

        const totalPrice = totalPrices.reduce((a, b) => a + b, 0);

        let order = new Order({
            orderItems: orderItemsIds,
            shippingAddress1,
            shippingAddress2,
            city,
            zip,
            country,
            phone,
            status: status || 'Pending',
            totalPrice,
            user,
            razorpay_payment_id
        });

        order = await order.save();
        res.send(order);
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

module.exports = router;
