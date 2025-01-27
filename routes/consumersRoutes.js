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
    const token = jwt.sign({ id: newConsumer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

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
    const token = jwt.sign({ id: consumer._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.status(200).json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Fetch cart items
router.get('/cart', authenticate, async (req, res) => {
  try {
    const consumerId = req.consumer?.id;
    const consumer = await ConsumerModel.findById(consumerId).populate('cart.productId');
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }
    res.status(200).json(consumer.cart);
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
    const { productId, imageUrl, brand, category, subcategory, price, quantity, title } = req.body;

    // Validate required fields
    if (!productId || !imageUrl || !brand || !category || !price || !title) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    const consumer = await ConsumerModel.findById(consumerId).populate('cart.productId');
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    const cartItemIndex = consumer.cart.findIndex(item => item.productId.toString() === productId.toString());
    if (cartItemIndex !== -1) {
      return res.status(400).json({ message: 'Product already in cart' });
    }

    consumer.cart.push({ productId, quantity, imageUrl, brand, category, subcategory, price, title });

    await consumer.save();
    res.status(200).json({ message: 'Product added to cart', cart: consumer.cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/cart/update', authenticate, async (req, res) => {
  try {
    const consumerId = req.consumer?.id;
    const { productId, quantity } = req.body;

    // Validate required fields
    if (!productId || typeof quantity !== 'number') {
      return res.status(400).json({ message: 'Product ID and quantity must be provided' });
    }

    const consumer = await ConsumerModel.findById(consumerId);
    if (!consumer) {
      return res.status(404).json({ message: 'Consumer not found' });
    }

    const cartItemIndex = consumer.cart.findIndex(item => item.productId.toString() === productId.toString());
    if (cartItemIndex === -1) {
      return res.status(400).json({ message: 'Product not found in cart' });
    }

    // Update the quantity without triggering validation for other fields
    consumer.cart[cartItemIndex].quantity = quantity;

    // Save only the specific field updates
    await consumer.save({ validateModifiedOnly: true });

    res.status(200).json({ message: 'Cart updated', cart: consumer.cart });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


router.post('/google-login', async (req, res) => {
  try {
    const { email, name, phoneNumber, address, dateOfBirth, uid } = req.body;

    let consumer = await ConsumerModel.findOne({ email });
    if (!consumer) {
      consumer = await ConsumerModel.create(
        {
          name,
          email,
          phoneNumber: phoneNumber || null,
          address: address || null,
          dateOfBirth: dateOfBirth || null,
          password: uid,
          cart: []

        })
    }

    // Generate token with _id 
    const token = jwt.sign({ id: consumer._id }, process.env.JWT_SECRET, { expiresIn: '5h' });

    res.status(200).json({ token, message: 'Google login successful' });
  } catch (error) {
    console.error('Error in Google login:', error);
    res.status(500).json({ error: error.message });
  }
});

// Apple Sign-In
// router.post('/apple-login', async (req, res) => {

export default router;