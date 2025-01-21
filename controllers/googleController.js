
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../model/userModel');
const bcrypt = require('bcrypt');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id:userId },
    process.env.USER_ACCESS_TOKEN_SECRET,
    { expiresIn: '45m' }
  );
  
  const refreshToken = jwt.sign(
    { id:userId },
    process.env.USER_REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};



const googleSignup = async (req, res) => {
    console.log('working');
    const { tokenId } = req.body;
    console.log(tokenId);
    
    try {

        const ticket = await client.verifyIdToken({
            idToken: tokenId,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        // console.log('Ticket:', ticket);

        const payload = ticket.getPayload();
        const { email, name, picture } = payload;
        console.log('User Info:', email, name, picture);


        let user = await User.findOne({ email });
        
        console.log(user);
        
  
        if (user) {

            if (!user.isActive) {
                return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
            }
        
            const { accessToken, refreshToken } = generateTokens(user._id);
            user.refreshToken = refreshToken;
            await user.save();

            // Set tokens in cookies
            console.log('Tokens for Existing User:', { accessToken, refreshToken });

            res.cookie('accessToken', accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            return res.status(200).json({
                user: {
                    id: user._id,
                    email: user.email,
                    name: user.fullName,
                    profileImage: user.profileImage,
                    isActive:user.isActive
                },
                role: 'user'
            });
        }


        user = await User.create({
            email,
            fullName: name,
            profileImage: picture,
            googleId: payload.sub,
            mobile: '9809809', 
            password: await bcrypt.hash('123456',10), 
        });


        const { accessToken, refreshToken } = generateTokens(user._id);
        user.refreshToken = refreshToken;
        await user.save();
         
 // Set tokens in cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 15 * 60 * 1000 
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });


        return res.status(200).json({
            user: {
                id: user._id,
                email: user.email,
                name: user.fullName,
                profileImage: user.profileImage,
                isActive:user.isActive
            },
            role: 'user'
        });

    } catch (error) {
        console.error('Google signup/signin error:', error);
        return res.status(500).json({ success: false, message: 'Authentication failed' });
    }
};

module.exports = {
  googleSignup
};






// // Middleware to verify access token from cookies
// exports.verifyToken = async (req, res, next) => {
//   try {
//     const token = req.cookies.accessToken;
//     if (!token) {
//       return res.status(401).json({ success: false, message: 'Access token not found' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.userId = decoded.userId;
//     next();
//   } catch (error) {
//     res.status(401).json({ success: false, message: 'Invalid token' });
//   }
// };

// module.exports={
//    googleSignup
// }