import express from 'express';
import jwt from 'jsonwebtoken';
import ConsumerModel from '../models/consumers.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Register new consumer
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address, dateOfBirth } = req.body;

    // Check if the consumer already exists
    const existingConsumer = await ConsumerModel.findOne({ email });
    if (existingConsumer) {
      return res.status(400).json({ message: 'Consumer already exists' });
    }

    // Create new consumer
    const newConsumer = new ConsumerModel({
      name,
      email,
      password,
      phoneNumber: phoneNumber || null,
      address: address || null,
      dateOfBirth: dateOfBirth || null,
      cart: []
    });

    await newConsumer.save();

    // Generate token
    const token = jwt.sign({ id: newConsumer._id }, process.env.JWT_SECRET || '7d4aa8f99e1d1a5f2dc46d43dc66b58585674c2276f5b66c4fe62c0fd97f8fd7', { expiresIn: '1h' });

    res.status(201).json({ token, message: 'Consumer registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authenticate a consumer
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const consumer = await ConsumerModel.findOne({ email }).select('+password');
    if (!consumer) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isPasswordValid = await consumer.isValidPassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate token
    const token = jwt.sign({ id: consumer._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

    res.status(200).json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fetch consumer details
router.get('/profile', authenticate, async (req, res) => {
  try {
    const consumerId = req.consumer?.id;
    const consumer = await ConsumerModel.findById(consumerId).select('-password');
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }
    res.status(200).json(consumer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add product to cart
router.post('/cart', authenticate, async (req, res) => {
  try {
    const consumerId = req.consumer?.id;
    const { productId, quantity } = req.body;

    const consumer = await ConsumerModel.findById(consumerId);
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    const cartItem = consumer.cart.find(item => item.productId.toString() === productId);
    if (cartItem) {
      cartItem.quantity += quantity;
    } else {
      consumer.cart.push({ productId, quantity });
    }

    await consumer.save();
    res.status(200).json({ message: 'Product added to cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove product from cart
router.delete('/cart/:productId', authenticate, async (req, res) => {
  try {
    const consumerId = req.consumer?.id;
    const { productId } = req.params;

    const consumer = await ConsumerModel.findById(consumerId);
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    consumer.cart = consumer.cart.filter(item => item.productId.toString() !== productId);
    await consumer.save();

    res.status(200).json({ message: 'Product removed from cart' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google Sign-In
router.post('/google-login', async (req, res) => {
  try {
    const { email, name, phoneNumber, address, dateOfBirth } = req.body;

    let consumer = await ConsumerModel.findOne({ email });

    if (!consumer) {
      consumer = new ConsumerModel({
        name,
        email,
        phoneNumber: phoneNumber || null,
        address: address || null,
        dateOfBirth: dateOfBirth || null,
        password: 'defaultpassword', // Placeholder password
        cart: []
      });

      await consumer.save();
    }

    // Generate token with _id 
    const token = jwt.sign({ id: consumer._id }, process.env.JWT_SECRET || '7d4aa8f99e1d1a5f2dc46d43dc66b58585674c2276f5b66c4fe62c0fd97f8fd7');

    res.status(200).json({ token, message: 'Google login successful' });
  } catch (error) {
    console.error('Error in Google login:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
