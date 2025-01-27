import jwt from 'jsonwebtoken';

const verifyAuth = (req, res, next) => {
  try {
    const authToken = req.headers.authorization?.split(' ')[1];
    if (!authToken) {
      return res.status(401).json({ message: 'Authorization token is required' });
    }

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    req.user = decoded; 
    next();  
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized, invalid token', error: error.message });
  }
};

export default verifyAuth;
