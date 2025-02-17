import express from 'express';
import { approveOrder, checkout, createOrderRequest, paymentVerification, rejectOrder } from '../controllers/PaymentController.js';

const router = express.Router();


router.route("/checkout").post(checkout)
router.route("/paymentVerification").post(paymentVerification)
router.route("/createOrderRequest").post(createOrderRequest)
router.route("/approveOrder/:orderId").put(approveOrder)
router.route("/rejectOrder/:orderId").put(rejectOrder)



export default router;