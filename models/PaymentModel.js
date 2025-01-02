import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
    },
    razorpay_payment_id: {
        type: String,
        required: true,
    },
    razorpay_signature: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Success', 'Failed'],
        default: 'Success',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const orderSchema = new mongoose.Schema({
    razorpay_order_id: {
        type: String,
        required: true,
    },
    razorpay_payment_id: {
        type: String,
        required: true,
    },
    razorpay_signature: {
        type: String,
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Order Placed', 'Order Transit', 'Out for Delivery', 'Delivered'],
        default: 'Order Placed',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
});

export const Payment = mongoose.model("Payment", paymentSchema);
export const Order = mongoose.model("Order", orderSchema);
