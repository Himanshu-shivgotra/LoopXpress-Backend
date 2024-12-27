import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    req.user = {
      id: user._id,
      email: user.personalDetails.email,
      username: user.personalDetails.username // Assuming username is stored in personalDetails
    };

    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authenticate;