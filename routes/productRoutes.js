import express from 'express';
import Product from '../models/product.js';
import verifyAuth from '../middleware/verifyAuth.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';

const router = express.Router();

// Add new product
router.post('/add-product', verifyAuth, upload.array('images', 5), async (req, res) => {
  try {
    // Upload images to Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'products',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result.secure_url);
          }
        );

        uploadStream.end(file.buffer);
      });
    });

    const imageUrls = await Promise.all(uploadPromises);

    const product = new Product({
      title: req.body.title,
      brand: req.body.brand,
      colors: req.body.colors,
      imageUrls: imageUrls,
      originalPrice: Number(req.body.originalPrice),
      discountedPrice: Number(req.body.discountedPrice),
      category: req.body.category,
      subcategory: req.body.subcategory,
      quantity: Number(req.body.quantity),
      stockAlert: Number(req.body.stockAlert),
      weight: req.body.weight,
      description: req.body.description,
      highlights: req.body.highlights,
      warranty: req.body.warranty,
      shippingInfo: req.body.shippingInfo,
      manufacturingDate: req.body.manufacturingDate,
      user: req.user.id,
    });

    const savedProduct = await product.save();
    res.status(201).json({ message: 'Product added successfully', product: savedProduct });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's products
router.get('/my-products', verifyAuth, async (req, res) => {
  try {
    const products = await Product.find({ user: req.user.id });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get all products
router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});

// Get product by ID
router.get('/product/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }



    if (product.imageUrls && Array.isArray(product.imageUrls)) {
      product.imageUrls = product.imageUrls.map((url) => {
        return url.startsWith('blob:') ? processBlobUrl(url) : url;
      });
    }

    res.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ message: 'Error fetching product', error: error.message });
  }
});

// Update product by ID
router.put('/update-product/:id', verifyAuth, upload.array('images', 5), async (req, res) => {
  try {
    let newImageUrls = [];

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'products' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result.secure_url);
            }
          );
          uploadStream.end(file.buffer);
        });
      });
      newImageUrls = await Promise.all(uploadPromises);
    }

    const existingImageUrls = JSON.parse(req.body.existingImageUrls || '[]');
    const updatedImageUrls = [...existingImageUrls, ...newImageUrls];

    const { originalPrice, discountedPrice, stockAlert, highlights, ...otherData } = req.body;

    const parsedOriginalPrice = Number(originalPrice);
    const parsedDiscountedPrice = Number(discountedPrice);
    const parsedStockAlert = Number(stockAlert);

    if (isNaN(parsedOriginalPrice) || isNaN(parsedDiscountedPrice) || isNaN(parsedStockAlert)) {
      return res.status(400).json({ message: 'Invalid numeric values' });
    }
    if (parsedDiscountedPrice > parsedOriginalPrice) {
      return res.status(400).json({ message: 'Discounted price cannot be greater than original price' });
    }

    const productData = {
      ...otherData,
      originalPrice: parsedOriginalPrice,
      discountedPrice: parsedDiscountedPrice,
      stockAlert: parsedStockAlert,
      highlights: typeof highlights === 'string' ? JSON.parse(highlights) : highlights,
      imageUrls: updatedImageUrls,
      base64Images: [], // Clear base64Images if necessary
      weight: req.body.weight,
    };

    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.assign(existingProduct, productData);
    const updatedProduct = await existingProduct.save();

    res.json({ message: 'Product updated successfully', product: updatedProduct });
  } catch (error) {
    console.error('Error updating product:', error); // Enhanced error logging

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        message: 'Validation error',
        details: Object.keys(error.errors).reduce((acc, key) => {
          acc[key] = error.errors[key].message;
          return acc;
        }, {})
      });
    }

    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// Delete product by ID
router.delete('/product/:id', verifyAuth, async (req, res) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// Get all products with user details
router.get('/all-products', async (req, res) => {
  try {
    const products = await Product.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error('Error fetching products with user details:', error);
    res.status(500).json({ message: 'Error fetching products', error: error.message });
  }
});



export default router;
