import jwt from 'jsonwebtoken';
import ConsumerModel from '../models/consumers.js';

const authenticateConsumer = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret');
    const consumer = await ConsumerModel.findById(decoded.id);

    if (!consumer) {
      return res.status(401).json({ message: 'Consumer not found, authorization denied' });
    }

    req.consumer = {
      id: consumer._id,
      email: consumer.email,
      name: consumer.name
    };

    next();
  } catch (error) {
    console.error('Error in authentication middleware:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default authenticateConsumer;
