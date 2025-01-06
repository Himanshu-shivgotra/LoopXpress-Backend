import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import ConsumerModel from '../models/consumers.js';

const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '7d4aa8f99e1d1a5f2dc46d43dc66b58585674c2276f5b66c4fe62c0fd97f8fd7');
    console.log("decoded", decoded);
    console.log("auth", process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    const consumer = await ConsumerModel.findById(decoded.id);

    if (!user && !consumer) {
      return res.status(401).json({ message: 'User or Consumer not found, authorization denied' });
    }

    if (user) {
      req.user = {
        id: user._id,
        email: user.personalDetails.email,
        fullname: user.personalDetails.fullName
      };
    } else if (consumer) {
      req.consumer = {
        id: consumer._id,
        email: consumer.email,
        name: consumer.name
      };
    }

    next();

  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authenticate;
