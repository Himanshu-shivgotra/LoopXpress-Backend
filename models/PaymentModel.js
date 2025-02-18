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
        required: false,
    },
    razorpay_payment_id: {
        type: String,
        required: false,
    },
    razorpay_signature: {
        type: String,
        required: false,
    },
    amount: {
        type: Number,
        required: true,
    },
    discountedPrice:{
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    subcategory: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['Order Placed', 'Order Transit', 'Out for Delivery', 'Delivered'],
        default: 'Order Placed',
    },
    approvalStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    address: {
        type: String,
        required: true
    },
});


export const Payment = mongoose.model("Payment", paymentSchema);
export const Order = mongoose.model("Order", orderSchema);
