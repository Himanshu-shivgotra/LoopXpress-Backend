import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import Razorpay from "razorpay"
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import gstRoutes from "./routes/gstRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import paymentRoute from "./routes/PaymentRoutes.js"
import orderRoute from "./routes/OrderTrackingRoutes.js"

dotenv.config();
const port = process.env.PORT || 5000;

connectDB();

const app = express();

// Enable CORS with dynamic origin
// app.use(
//   cors({
//     origin: '*',
//     optionsSuccessStatus: 200,
//     credentials: true
//   })
// );

app.use(cors({
  origin: (origin, callback) => {
    // List of allowed origins
    const allowedOrigins = [
      'https://loopxpress.vercel.app',
      'https://loop-xpress-backend.vercel.app'
    ];
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
  allowedHeaders: "Content-Type, Authorization",
}));


export const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
})

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/users", userRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/products", productRoutes);
app.use("/api/payment", paymentRoute)
app.use("/api/orders", orderRoute)

app.listen(port, () => console.log(`Server running on port: ${port}`));

app.get("/api/getkey", (req, res) => res.status(200).json({ key: process.env.RAZORPAY_API_KEY }))