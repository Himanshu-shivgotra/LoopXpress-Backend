import express from 'express';
import Inventory from '../models/inventoryModel.js';
import verifyAuth from '../middleware/verifyAuth.js';
import Product from '../models/product.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';
import Cart from '../models/cartModel.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Add inventory for a product
router.post('/add-product-inventory', verifyAuth, upload.array('images', 5), async (req, res) => {
    try {
        let productData;
        let imageUrls = [];
        
        // Handle image uploads if files exist
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
            imageUrls = await Promise.all(uploadPromises);
        }

        // Handle both JSON and form-data requests
        if (req.is('multipart/form-data')) {
            if (!req.body) {
                return res.status(400).json({ 
                    error: 'Product data is required in form-data'
                });
            }
            try {
                productData = {
                    product: req.body,
                    quantity: req.body.quantity,
                    location: req.body.location,
                    imageUrls: imageUrls ,
                    isWarehouseInventory:req.body.isWarehouseInventory,
                };
            } catch (parseError) {
                return res.status(400).json({ 
                    error: 'Invalid product JSON in form-data',
                    details: parseError.message
                });
            }
        } else if (req.is('application/json')) {
            productData = req.body;
        } else {
            return res.status(400).json({ 
                error: 'Content-Type must be either application/json or multipart/form-data',
                receivedContentType: req.get('Content-Type')
            });
        }

        // Validate product data exists
        if (!productData || Object.keys(productData).length === 0) {
            return res.status(400).json({ 
                error: 'Request body is empty',
                headers: req.headers
            });
        }

        // Validate product object exists
        if (!productData.product) {
            return res.status(400).json({ 
                error: 'Product object is required',
                received: productData
            });
        }

        // Create new product object with image URLs
        const newProduct = {
            title: productData.product.title,
            brand: productData.product.brand,
            colors: productData.product.colors || [],
            imageUrls: imageUrls.length > 0 ? imageUrls : (productData.product.imageUrls || []),
            base64Images: productData.product.base64Images || [],
            originalPrice: productData.product.originalPrice || 0,
            discountedPrice: productData.product.discountedPrice || 0,
            category: productData.product.category || 'Uncategorized',
            subcategory: productData.product.subcategory || 'Uncategorized',
            quantity: productData.product.quantity || 0,
            weight: productData.product.weight || '0 kg',
            description: productData.product.description || '',
            highlights: productData.product.highlights || [],
            stockAlert: productData.product.stockAlert || 0,
            manufacturingDate: productData.product.manufacturingDate || new Date(),
            warranty: productData.product.warranty || 'No warranty',
            user: req.user.id,
            shippingInfo: productData.product.shippingInfo || 'Standard shipping'
        };
        const productDB =  await Product.create(newProduct);
        // Create inventory with proper quantity conversion
        const inventory = new Inventory({
            productId: productDB._id,
            quantity: Number(productData.quantity) || 0,
            isWarehouseInventory: productData.isWarehouseInventory,
        });

        const savedInventory = await inventory.save();
        
        res.status(201).json({ 
            message: 'Inventory added successfully', 
            inventory: savedInventory 
        });
    } catch (error) {
        console.error('Error adding inventory:', error);
        res.status(500).json({ 
            error: error.message 
        });
    }
});

// Get all inventory items
router.get('/', verifyAuth, async (req, res) => {
    try {
        const inventory = await Inventory.find({}).populate("productId").sort({ lastUpdated: -1 });
        // Transform the data to match the frontend expectations
        const transformedInventory = inventory.map(item => ({
            id: item._id,
            product: item.productId, // Include the populated product data
            location: item.location || 'no Location',
            quantity: item.quantity || 'No Quantity',
            isWarehouseInventory:item.isWarehouseInventory || 'true',
            lastUpdated: item.lastUpdated,
            // Add other necessary fields from both inventory and product
            // ...(item.productId && {
            //     productDetails: {
            //         title: item.productId.title,
            //         brand: item.productId.brand,
            //         imageUrls: item.productId.imageUrls,
            //         // Add other product fields you need
            //     }
            // })
        }));
        res.json(transformedInventory); // Return the transformed data
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ 
            error: 'Failed to fetch inventory',
            details: error.message 
        });
    }
});

// Add to cart route
router.post('/add-to-cart', authenticate, async (req, res) => {
    try {
        const { 
            productId, 
            quantity, 
        } = req.body;
        const userId = req.user.id;

        // Validate productId exists
        if (!productId) {
            return res.status(400).json({ 
                error: 'Product ID is required',
            });
        }
        // Find or create cart for user
        let cart = await Cart.findOne({ user: userId });
        
        if (!cart) {
            cart = new Cart({
                user: userId,
                items: []
            });
        }

        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(item => 
            item.product && item.product.toString() === productId
        );
        
        if (existingItemIndex !== -1) {
            // Update quantity if product exists
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            // Add new product to cart
            cart.items.push({
                product: productId,
                quantity: quantity || 1,
            });
        }

        await cart.save();
        
        res.status(200).json({
            message: 'Product added to cart successfully',
            cart
        });
    } catch (error) {
        console.error('Error adding to cart:', error);
        res.status(500).json({ 
            error: 'Failed to add product to cart',
            details: error.message 
        });
    }
});

// Get cart count route
router.get('/cart/count', verifyAuth, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        const count = cart ? cart.items.reduce((acc, item) => acc + item.quantity, 0) : 0;
        
        res.status(200).json({ count });
    } catch (error) {
        console.error('Error getting cart count:', error);
        res.status(500).json({ 
            error: 'Failed to get cart count',
            details: error.message 
        });
    }
});

// Get cart items route
router.get('/get-cart', authenticate, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.product',
                select: 'title brand category discountedPrice originalPrice imageUrls quantity location subcategory'
            });
        
        if (!cart) {
            return res.status(200).json({ items: [] });
        }

        // Transform the cart items to match the frontend expectations
        const transformedItems = cart.items.map(item => ({
            _id: item._id,
            product: {
                _id: item.product._id,
                title: item.product.title,
                brand: item.product.brand,
                category: item.product.category,
                discountedPrice: item.product.discountedPrice,
                originalPrice: item.product.originalPrice,
                imageUrls: item.product.imageUrls,
                quantity: item.product.quantity,
                location: item.product.location,
                subcategory:item.product.subcategory
            },
            quantity: item.quantity
        }));

        res.status(200).json({ items: transformedItems });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ 
            error: 'Failed to fetch cart items',
            details: error.message 
        });
    }
});

// Remove item from cart
router.delete('/cart/:itemId', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Filter out the item to be removed
        cart.items = cart.items.filter(item => item._id.toString() !== itemId);
        await cart.save();

        res.status(200).json({ message: 'Item removed successfully', cart });
    } catch (error) {
        console.error('Error removing item:', error);
        res.status(500).json({ 
            error: 'Failed to remove item from cart',
            details: error.message 
        });
    }
});

// Increase item quantity
router.put('/cart/:itemId/increase', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Find and update the item quantity
        const item = cart.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        item.quantity += 1;
        await cart.save();

        res.status(200).json({ message: 'Quantity increased successfully', cart });
    } catch (error) {
        console.error('Error increasing quantity:', error);
        res.status(500).json({ 
            error: 'Failed to increase quantity',
            details: error.message 
        });
    }
});

// Decrease item quantity
router.put('/cart/:itemId/decrease', authenticate, async (req, res) => {
    try {
        const { itemId } = req.params;
        const userId = req.user.id;

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Find and update the item quantity
        const item = cart.items.find(item => item._id.toString() === itemId);
        if (!item) {
            return res.status(404).json({ error: 'Item not found in cart' });
        }

        // Ensure quantity doesn't go below 1
        if (item.quantity > 1) {
            item.quantity -= 1;
        }

        await cart.save();

        res.status(200).json({ message: 'Quantity decreased successfully', cart });
    } catch (error) {
        console.error('Error decreasing quantity:', error);
        res.status(500).json({ 
            error: 'Failed to decrease quantity',
            details: error.message 
        });
    }
});

// Clear cart route
router.delete('/clear-cart', authenticate, async (req, res) => {
    try {
        const userId = req.user.id;
        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

        // Clear all items from the cart
        cart.items = [];
        await cart.save();

        res.status(200).json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ 
            error: 'Failed to clear cart',
            details: error.message 
        });
    }
});

export default router;