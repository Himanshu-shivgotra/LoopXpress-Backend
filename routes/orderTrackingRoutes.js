import express from 'express';
import { Order } from '../models/PaymentModel.js';

const router = express.Router();

// Middleware for validation
const validateOrderStatus = (req, res, next) => {
    const { status } = req.body;
    const allowedStatuses = ['Order Placed', 'Order Transit', 'Out for Delivery', 'Delivered'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed values are: ${allowedStatuses.join(', ')}`,
        });
    }
    next();
};

// Route to track an order by ID
router.route('/track/:orderId').get(async (req, res) => {
    const { orderId } = req.params;
    try {
        const order = await Order.findOne({ razorpay_order_id: orderId }).select('-razorpay_signature');
        if (order) {
            res.status(200).json({ success: true, order });
        } else {
            res.status(404).json({ success: false, message: 'Order not found' });
        }
    } catch (error) {

        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

// Route to update an order status by ID
router.route('/update/:orderId').put(validateOrderStatus, async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    try {
        const orders = await Order.updateMany(
            { razorpay_order_id: orderId },
            { status },
            { new: true }
        );

        if (orders.modifiedCount > 0) {
            const updatedOrders = await Order.find({ razorpay_order_id: orderId })
                .select('-razorpay_signature');
            res.status(200).json({ 
                success: true, 
                orders: updatedOrders 
            });
        } else {
            res.status(404).json({ 
                success: false, 
                message: 'No orders found with that ID' 
            });
        }
    } catch (error) {
        console.error(`[Order Update] Server error: ${error.message}`);
        res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
});

// Route to get all orders
router.route('/').get(async (req, res) => {

    try {
        const orders = await Order.find().select('-razorpay_signature');
        if (orders.length > 0) {
            res.status(200).json({ success: true, orders });
        } else {
            res.status(404).json({ success: false, message: 'No orders found' });
        }
    } catch (error) {
        console.error(`[Order Fetch] Server error: ${error.message}`);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

export default router;
