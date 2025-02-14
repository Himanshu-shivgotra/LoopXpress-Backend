import express from 'express';
import Inventory from '../models/inventoryModel.js';
import verifyAuth from '../middleware/verifyAuth.js';
import Product from '../models/product.js';
import upload from '../middleware/upload.js';
import cloudinary from '../config/cloudinary.js';

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
                    imageUrls: imageUrls 
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

        // Validate required fields
        // const missingFields = [];
        // if (!productData.product.title) missingFields.push('title');
        // if (!productData.product.brand) missingFields.push('brand');

        // if (missingFields.length > 0) {
        //     return res.status(400).json({ 
        //         error: 'Complete product details are required',
        //         missingFields: missingFields,
        //         receivedProduct: productData.product
        //     });
        // }

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
            location: productData.location || 'Default Location',
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


export default router;