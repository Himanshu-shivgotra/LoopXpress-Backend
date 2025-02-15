import crypto from "crypto";
import { Order, Payment } from "../models/PaymentModel.js";
import { instance } from "../index.js";

export const checkout = async (req, res) => {
    try {
        const { amount } = req.body;

        // Validate amount
        if (!amount) {
            return res.status(400).json({ success: false, message: "Amount is required" });
        }
        if (Number(amount) > 1000000) {
            return res.status(400).json({
                success: false,
                message: "Amount exceeds the maximum allowed value of ₹10,00,000",
            });
        }

        const options = {
            amount: Math.round(Number(amount) * 100),
            currency: "INR",
        };
        const order = await instance.orders.create(options);

        res.status(200).json({
            success: true,
            order,
        });
    } catch (error) {
        console.error("Error during checkout:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

export const paymentVerification = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, items } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !amount || !currency || !items) {
            return res.status(400).json({ success: false, message: "Invalid payment data" });
        }

        const body = `${razorpay_order_id}|${razorpay_payment_id}`;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
            .update(body.toString())
            .digest("hex");

        const isAuthentic = expectedSignature === razorpay_signature;

        if (isAuthentic) {
            // Save payment details to the database
            await Payment.create({
                razorpay_order_id,
                razorpay_payment_id,
                razorpay_signature,
                amount,
                currency
            });

            // Save each item in the order
            for (const item of items) {
                if (item.title && item.brand && item.category && item.subcategory) {
                    await Order.create({
                        razorpay_order_id,
                        razorpay_payment_id,
                        razorpay_signature,
                        status: "Order Placed",
                        amount,
                        currency,
                        title: item.title,
                        brand: item.brand,
                        category: item.category,
                        subcategory: item.subcategory
                    });
                }
            }

            res.status(200).json({
                success: true,
                message: "Payment verified successfully",
                payment_id: razorpay_payment_id,
                order_id: razorpay_order_id,
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Payment verification failed",
            });
        }
    } catch (error) {
        console.error("Error during payment verification:", error.message);
        res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

