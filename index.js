import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import gstRoutes from "./routes/gstRoutes.js";
import productRoutes from "./routes/productRoutes.js";

dotenv.config();
const port = process.env.PORT || 5000;

connectDB();

const app = express();

// Enable CORS with dynamic origin
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];
app.use(
  cors({
    origin: ['*'],
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials: true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.get('/', (req, res) => {
  res.send('All Good');
});
app.use("/api/users", userRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/products", productRoutes);

app.listen(port, () => console.log(`Server running on port: ${port}`));