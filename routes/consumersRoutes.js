import express from 'express';
import jwt from 'jsonwebtoken';
import ConsumerModel from '../models/consumers.js';
import authenticate from '../middleware/authenticate.js';
import verifyAuth from '../middleware/verifyAuth.js';

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
      dateOfBirth: dateOfBirth || null
    });

    await newConsumer.save();

    // Generate token
    const token = jwt.sign({ id: newConsumer._id }, process.env.JWT_SECRET || 'your_jwt_secret', { expiresIn: '1h' });

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

// Google Sign-In
router.post('/google-login', async (req, res) => {
  try {
    const { uid, email, name, phoneNumber, address, dateOfBirth } = req.body;

    let consumer = await ConsumerModel.findOne({ email });

    if (!consumer) {
      consumer = new ConsumerModel({
        uid,
        email,
        name,
        phoneNumber: phoneNumber || null,
        address: address || null,
        dateOfBirth: dateOfBirth || null,
        password: 'defaultpassword' // Placeholder password
      });

      await consumer.save();
    }

    // Generate token with _id, not uid
    const token = jwt.sign({ id: consumer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ token, message: 'Google login successful' });
  } catch (error) {
    console.error('Error in Google login:', error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
