import express from 'express';
import Admin from "../models/adminModel.js";
import User from "../models/userModel.js";
import bcrypt from 'bcryptjs'; // For hashing passwords
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

// Route to get details of all admins
router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().select('-password');
    res.status(200).json(admins);
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Route to create a new admin
router.post('/signup', async (req, res) => {
  const { email, name, password } = req.body;

  try {
    // Check if the admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash the password
    const salt = 10;
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new admin
    const newAdmin = new Admin({
      email,
      name,
      password: hashedPassword,
      role: 'admin', // Optional: Set the role explicitly
    });

    // Save the admin to the database
    await newAdmin.save();

    // Return the created admin (without the password)
    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
      },
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected admin info route
router.get("/admin-info", authenticate, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password -__v -createdAt -updatedAt");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    const safeAdminData = {
      id: admin._id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    };

    res.json(safeAdminData);
  } catch (error) {
    console.error("Error fetching admin info:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Route to get all users
router.get('/sellers', authenticate, async (req, res) => {
  try {
    
    const users = await User.find().select('-password -__v -createdAt -updatedAt');
    
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;