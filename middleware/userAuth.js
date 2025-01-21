const jwt = require('jsonwebtoken')



const varifyToken = (req, res, next)=>{
    const token = req.cookies.accessToken
 console.log('working',token);
 
     if(!token){
       return res.status(403).json({message:"Please login to continue"})
     }

       try {
         const decoded = jwt.verify(token,process.env.USER_ACCESS_TOKEN_SECRET)
         req.user = decoded
         console.log(decoded);
         
         req.userId = decoded.id || decoded.userId;
         console.log('id here',req.userId);
        
          next()
       } catch (error) {
          console.error('Token verification failed',error.message)
          return res.status(403).json({message:' expire token'})
       }
}

module.exports={
  varifyToken
}