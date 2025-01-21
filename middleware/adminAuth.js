const jwt = require('jsonwebtoken');

const verifyAdminToken = (req, res, next) => {
  const token = req.cookies.adminAccessToken; 
  console.log('access token here',token);
  

  if (!token) {
    return res.status(403).json({ message: 'Unauthorized: No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.ADMIN_ACCESS_TOKEN_SECRET); 
    console.log('jhjkhkh',decoded);

    if (!decoded.isAdmin) {
      return res.status(403).json({ message: 'Access denied: Not an admin' });
    }
    
    req.admin = decoded; 
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports ={
  verifyAdminToken
} 
