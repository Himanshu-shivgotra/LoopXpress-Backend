import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import authenticate from '../middleware/authenticate.js'; // Import middleware

const router = express.Router();

// Signup route
router.post('/submit-form', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Error saving user data:', error);
    res.status(500).json({ message: 'Error saving user data' });
  }
});

// Login route
router.post('/signin', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ 'personalDetails.email': email }).select(
      '+personalDetails.password'
    );
    console.log("signin user", user)

    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Compare the provided password with the stored hashed password
    const isMatch =await user.isValidPassword(password, user.personalDetails.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    // Generate a JWT token
    const token = jwt.sign(
      { id: user._id, email: user.personalDetails.email },
      process.env.JWT_SECRET || 'your_jwt_secret',
      { expiresIn: '2h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.personalDetails.email,
        fullName: user.personalDetails.fullName,
      },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Protected user info route
router.get('/user-info', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-personalDetails.password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update perssonal info route
router.put('/update-personal-info', authenticate, async (req, res) => {
  try {
    const { personalDetails, businessDetails } = req.body;

    // Update using findByIdAndUpdate to avoid triggering save middleware
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'personalDetails.fullName': personalDetails.fullName,
          'personalDetails.email': personalDetails.email,
          'personalDetails.phoneNumber': personalDetails.phoneNumber,
          'personalDetails.address': personalDetails.address,
          
        }
      },
      { new: true, runValidators: true }
    ).select('-personalDetails.password'); 

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update business info route
router.put('/update-business-info', authenticate, async (req, res) => {
  try {
    const { businessDetails } = req.body;

    // Update using findByIdAndUpdate to avoid triggering save middleware
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      {
        $set: {
          'businessDetails.businessName': businessDetails.businessName,
          'businessDetails.businessType': businessDetails.businessType,
          'businessDetails.businessPhone': businessDetails.businessPhone,
          'businessDetails.businessEmail': businessDetails.businessEmail,
          'businessDetails.gstNumber': businessDetails.gstNumber,
        }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'Business info updated successfully',
      businessDetails: updatedUser.businessDetails,
    });
  } catch (error) {
    console.error('Error updating business info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update password route
router.put('/update-password', authenticate, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Both current and new passwords are required.' });
  }

  try {
    const user = await User.findById(req.user.id).select('+personalDetails.password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.isValidPassword(currentPassword, user.personalDetails.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.personalDetails.password = newPassword; // Update the password directly
    await user.save();

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ 'personalDetails.email': email });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // Token expires in 1 hour

    await user.save();

    // Send email with the reset link
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      secure: false,
      tls: {
        rejectUnauthorized: false,
      },
    });

    const resetLink = `${process.env.WEB_URL}/auth/reset-password/${resetToken}`;

    const mailOptions = {
      to: user.personalDetails.email,
      from: 'loop@gmail.com',
      subject: 'Password Reset',
      text: `Click the following link to reset your password: ${resetLink}`,
    };
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Password reset link sent to your email.' });
  } catch (error) {
    console.error('Error in forgot-password route:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});



// Reset password route
router.post('/reset-password/:token', async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }, 
    });

    if (!user) {
      console.log('Token not found or expired:', token);
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    user.personalDetails.password = newPassword;
    user.resetPasswordToken = null; 
    user.resetPasswordExpires = null;

    await user.save();

    res.status(200).json({ message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});

// Verify reset token route
router.get('/reset-password/:token', async (req, res) => {
  const { token } = req.params;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    res.status(200).json({ message: 'Token is valid' });
  } catch (error) {
    console.error('Error verifying reset token:', error);
    res.status(500).json({ message: 'An error occurred. Please try again later.' });
  }
});

export default router;