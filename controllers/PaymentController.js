import crypto from "crypto";
import { Order, Payment } from "../models/PaymentModel.js";
import { instance } from "../index.js";

export const checkout = async (req, res) => {
    try {
        const { orderId, amount } = req.body;
    
        // Validate required fields
        if (!orderId || !amount) {
            return res.status(400).json({
                success: false,
                message: "Order ID and amount are required"
            });
        }

        // Verify order exists and is approved
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }
        if (order.approvalStatus !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: "Order is not approved for payment"
            });
        }

        // Create Razorpay order
        const options = {
            amount: Number(amount), // Ensure amount is a number
            currency: "INR",
        };
        const razorpayOrder = await instance.orders.create(options);

        // Update order with Razorpay order ID
        await Order.findByIdAndUpdate(orderId, {
            razorpay_order_id: razorpayOrder.id
        });

        res.status(200).json({
            success: true,
            order: razorpayOrder,
        });
    } catch (error) {
        console.error("Error during checkout:", error);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message // Include error message for debugging
        });
    }
};

export const paymentVerification = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId, amount } = req.body;

        // Validate all required fields
        const requiredFields = [
            'razorpay_order_id', 
            'razorpay_payment_id', 
            'razorpay_signature', 
            'orderId', 
            'amount'
        ];
        
        const missingFields = requiredFields.filter(field => !req.body[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        // Verify the payment signature
        const body = `${razorpay_order_id}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Payment verification failed: Invalid signature",
            });
        }

        // Save payment details
        const payment = await Payment.create({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            amount: Number(amount),
            currency: "INR",
            order: orderId
        });

        // Update the order status
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { 
                payment: payment._id
            },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Payment verified successfully",
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            order: updatedOrder
        });

    } catch (error) {
        console.error("Error during payment verification:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

export const createOrderRequest = async (req, res) => {
    try {
        const { amount, items, address , title} = req.body;

        // Validate amount
        if (!amount) {
            return res.status(400).json({ success: false, message: "Amount is required" });
        }

        // Validate items array
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "Items array is required and must not be empty" 
            });
        }

        // Validate address
        if (!address) {
            return res.status(400).json({ 
                success: false, 
                message: "Address is required" 
            });
        }

        // Create order requests without payment details
        const orderRequests = await Promise.all(items.map(async (item) => {
            return await Order.create({
                amount: item.price,
                discountedPrice: item.price,
                currency: "INR",
                title: item.title,
                brand: item.brand || "Unknown",
                category: item.category || "General",
                subcategory: item.subcategory || "General",
                approvalStatus: 'Pending',
                address: address 
            });
        }));

        res.status(200).json({
            success: true,
            message: "Order request created successfully",
            orderRequests
        });
    } catch (error) {
        console.error("Error creating order request:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
};

// Add new controller for approving orders
export const approveOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByIdAndUpdate(
            orderId,
            { approvalStatus: 'Approved' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({
            success: true,
            message: "Order approved successfully",
            order
        });
    } catch (error) {
        console.error("Error approving order:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const rejectOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findByIdAndUpdate(
            orderId,
            { approvalStatus: 'Rejected' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({
            success: true,
            message: "Order rejected successfully",
            order
        });
    } catch (error) {
        console.error("Error rejecting order:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);
        
        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Error fetching order:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

