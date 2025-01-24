const jwt = require('jsonwebtoken')
const User = require('../model/userModel'); 



const varifyToken = async (req, res, next) => {
  const token = req.cookies.accessToken;

  if (!token) {
    return res.status(403).json({ message: "Please login to continue" });
  }

  try {
    const decoded = jwt.verify(token, process.env.USER_ACCESS_TOKEN_SECRET);
    
    const user = await User.findById(decoded.id || decoded.userId);
    
    if (!user) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive) {
      res.clearCookie('accessToken');
      res.clearCookie('refreshToken');
      return res.status(403).json({ 
        message: "User account is deactivated. Please contact support.",
        action: "logout"
      });
    }

    req.user = decoded;
    req.userId = decoded.id || decoded.userId;
    next();

  } catch (error) {
    console.error('Token verification failed', error.message);
    
    return res.status(403).json({
      message: 'Token expired or invalid',
      action: "logout"
    });
  }
};


module.exports={
  varifyToken
}