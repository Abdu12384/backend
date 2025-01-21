const User = require('../model/userModel')
const bcrypt= require('bcrypt')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
const OTP = require('../model/OTPmodel')
const chalk = require('chalk');


const jwt = require('jsonwebtoken')
const { response } = require('express')
const { text } = require('stream/consumers')
const { log } = require('console')



const USER_ACCESS_TOKEN_SECRET = process.env.USER_ACCESS_TOKEN_SECRET
const USER_REFRESH_TOKEN_SECRET = process.env.USER_REFRESH_TOKEN_SECRET



 const generateAdminTokens = (admin) =>{
    const adminAccessToken = jwt.sign(
      {id:admin._id, email:admin.email, isAdmin:true, role:'admin'},
      process.env.ADMIN_ACCESS_TOKEN_SECRET,
      {expiresIn:'15m'}
    )

    const adminRefreshToken = jwt.sign(
       {id: admin._id, email:admin.email, isAdmin:true, role:'admin'},
       process.env.ADMIN_REFRESH_TOKEN_SECRET,
       {expiresIn:'7d'}
    )
    return {adminAccessToken,adminRefreshToken}
 }



   

 const transporter = nodemailer.createTransport({
    service:'gmail',
    auth:{
      user:'kbsbakes786@gmail.com',
      pass:'uijs jkre agzy escf'
    }
 })

 const generateOTP = () =>{
    return crypto.randomInt(100000,999999)
 }

 const sendOtpToEmail = async (email,otp)=>{
  
 const mailOptions = {
    from:'kbsbakes786@gmail.com',
    to:email,
    subject:'Your OTP for KBS Bakes Registration',
    html: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP for KBS Bakes Registration</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 40px 30px; text-align: center; background-color: #FF6B6B; border-radius: 8px 8px 0 0;">
                  <h1 style="color: #ffffff; font-size: 28px; margin: 0;">KBS Bakes</h1>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px 30px;">
                  <h2 style="color: #333333; font-size: 24px; margin-top: 0;">Your Registration OTP</h2>
                  <p style="color: #666666; font-size: 16px; line-height: 1.5;">Thank you for registering with KBS Bakes. To complete your registration, please use the following One-Time Password (OTP):</p>
                  <div style="background-color: #f0f0f0; border-radius: 4px; padding: 20px; text-align: center; margin: 30px 0;">
                    <span style="font-size: 32px; font-weight: bold; color: #FF6B6B; letter-spacing: 5px;">${otp}</span>
                  </div>
                  <p style="color: #666666; font-size: 16px; line-height: 1.5;">This OTP is valid for 10 minutes. Please do not share this code with anyone.</p>
                  <p style="color: #666666; font-size: 16px; line-height: 1.5;">If you didn't request this OTP, please ignore this email.</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px; text-align: center; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
                  <p style="color: #999999; font-size: 14px; margin: 0;">© 2023 KBS Bakes. All rights reserved.</p>
                  <p style="color: #999999; font-size: 14px; margin: 10px 0 0;">123 Bakery Street, Cake City, CB 12345</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `
  }  
  
   return new Promise((resolve,reject)=>{
     transporter.sendMail(mailOptions, (error,info)=>{
         if(error){
           console.error('Error sending OTP')
           reject('Error sending OTP')
         }else{
           console.log('OTP sent:',info,response);
           resolve('OTP sent successfully')
           
         }
     })
   })

 }





const insertUser = async(req,res)=>{
  const {fullName, email, password, mobile}=req.body

  try {
    const existingUser= await User.findOne({email});
    if(existingUser){
      return res.status(400).json({message:"Email already in use"})
    }
    
    // const existingOTP = await OTP.findOne({email})
    //  if(existingOTP){
    //    return res.status(400).json({message:"OTP already sent, please varify"})
    //  } 

    const otp = generateOTP()
    console.log(otp);
    
    const hashedPassword =await bcrypt.hash(password,10)

    const otpDoc = new OTP({
      fullName,
      otp,
      email,
      password:hashedPassword,
      mobile,
      expiry: Date.now() + 2 * 60 * 1000,
    })

      await otpDoc.save()
      await sendOtpToEmail(email,otp)

       res.status(201).json({message:"Sent otp Sucessfully"})
        
   } catch (error) {
     console.error(error)
    res.status(500).json({error:"Server error"})
   }
}





 const varifyOTP = async (req,res)=>{
   const {email, otp}= req.body
    console.log('this comming otp',req.body);
    
   try {
     const otpRecord = await OTP.findOne({email, otp})
      if(!otpRecord){
         return res.status(400).json({message:"Invalid OTP"})
      }

      if(otpRecord.expiry < Date.now()){
         await OTP.deleteOne({email})
         return res.status(400).json({message:"OTP expired"})
      }
      
      const user = new User({
        fullName: otpRecord.fullName,
        email: otpRecord.email,
        password: otpRecord.password,
        mobile: otpRecord.mobile,
        isActive:true
      })
       
      
      await user.save()
      console.log(user);
      

      const deleteResult =await OTP.deleteOne({email,otp})
       console.log(deleteResult);
       
      res.status(201).json({message:"User Registered succefull"})

   } catch (error) {
     console.error(error)
     res.status(500).json({message:"Server error"})
   }
 }




   const resendOtp= async(req,res)=>{
      const {email} = req.body
      console.log('resend otp',email);
      
      if(!email){
        return res.status(400).json({success:false, message:'Email is required'})
      }       
      try {
      const otp = generateOTP()
      await OTP.updateOne(
        {email},
        {otp, expiry:Date.now() + 2 * 60 * 1000},
        {upsert:true}
      )

       
      await sendOtpToEmail(email,otp)
         res.json({success:true, message:'OTP resent successfully'})
         } catch (error) {
          console.error('Error resendign OTP:',error)
          res.status(500).json({message:'Failed to resend OTP'})
         }
   }




   const loadLogin= async (req,res)=>{
       const {email, password} = req.body
       
       try {
         const user= await User.findOne({email})
         if(!user)return res.status(404).json({message:"User not email found"})

          if(!user.isActive){
             return res.status(404).json({message:"Access denined. User account is blocked"})
          }
          if(user.isAdmin){
            return res.status(404).json({message:"Access denined. Admin not a user"})
          }
          
          const isMatch = await bcrypt.compare(password, user.password)
          if(!isMatch) return res.status(401).json({message:"Invalide cridentials"})
            
            console.log(email);
            const accessToken = jwt.sign(
              {id:user._id,user:'user'},
              USER_ACCESS_TOKEN_SECRET,
              {expiresIn:"1d"}
            )
            
            const refreshToken= jwt.sign(
              {id:user._id,role:'user'},
              USER_REFRESH_TOKEN_SECRET,
              {expiresIn:"7d"}
            )
            
            user.refreshToken=refreshToken
              await user.save()
              
           res.cookie("accessToken",accessToken,{
               httpOnly:true,
               secure: process.env.NODE_ENV === "production",
               sameSite:"lax",
               maxAge:2 * 60 * 60 * 1000,
           })
          res.cookie("refreshToken", refreshToken,{
             httpOnly:true,
             secure: process.env.NODE_ENV === "production",
             sameSite:"lax",
             maxAge:7 * 24 * 60 * 60 * 1000
          })
           
          res.status(200).json({
            user:{
              fullName:user.fullName,
              email:user.email,
              profileImage:user.profileImage,
              mobile:user.mobile,
              isActive:user.isActive
            },
            role:'user'
          })
       } catch (error) {
         res.status(500).json({message:"Server error"})
       }
   } 


   const refreshControll = async (req, res) => {
    const adminToken = req.cookies.adminRefreshToken;
    const userToken = req.cookies.refreshToken;
    
    console.log('admin', adminToken);
    console.log('user', userToken);
    

    if (!adminToken && !userToken) {
      return res.status(401).json({ 
        success: false,
        message: "No refresh token found" 
      });
    }
  
    let response = {
      success: false,
      adminToken: null,
      userToken: null,
      message: []
    };
  
    // Handle Admin Token if it exists
    if (adminToken) {
      try {
        const decoded = jwt.verify(adminToken, process.env.ADMIN_REFRESH_TOKEN_SECRET);
        
        const newAdminToken = jwt.sign(
          { id: decoded.id, role: 'admin', isAdmin: true },
          process.env.ADMIN_ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );
  
        res.cookie('adminAccessToken', newAdminToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000
        });
  
        response.success = true;
        response.adminToken = newAdminToken;
        response.message.push('Admin token refreshed');
        

        if (!userToken) {
          return res.json(response);
        }
      } catch (error) {

        res.clearCookie('adminRefreshToken');
        response.message.push('Invalid admin token');
        
        if (!userToken) {
          return res.status(403).json(response);
        }
      }
    }
  

    if (userToken) {
      try {
        const decoded = jwt.verify(userToken, process.env.USER_REFRESH_TOKEN_SECRET);
        
        const newUserToken = jwt.sign(
          { id: decoded.id, role: 'user' },
          process.env.USER_ACCESS_TOKEN_SECRET,
          { expiresIn: '15m' }
        );
  
        res.cookie('accessToken', newUserToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 15 * 60 * 1000
        });
  
        response.success = true;
        response.userToken = newUserToken;
        response.message.push('User token refreshed');
      } catch (error) {
        // Clear invalid user token
        res.clearCookie('refreshToken');
        response.message.push('Invalid user token');
        
        // If admin token wasn't successful either
        if (!response.adminToken) {
          response.success = false;
          return res.status(403).json(response);
        }
      }
    }
  
    // Return final response with all results
    return res.json(response);
  };


   const loadLogout= async(req,res)=>{
     console.log('logout here');
     const refreshToken = req.cookies.refreshToken;
     if (!refreshToken) return res.status(204).end(); 
       try {
          const user = await User.findById(refreshToken)
          if(user){
            user.refreshToken=null
            await user.save()
          }

         res.clearCookie('accessToken',{
           httpOnly:true,
           secure:true,
           sameSite:'strict',
           maxAge:0,
         })

         res.clearCookie('refreshToken',{
           httpOnly:true,
           secure:true,
           sameSite:'strict',
           maxAge:0,
         })


       res.status(200).json({message:"Logout Successfully"})
      } catch (error) {
         console.error(error)
          res.status(500).json({message:"Error logging out"})
        
       }
   }





   const adminLogin = async(req,res)=>{
   const {email,password} = req.body
       console.log(email,password);
       
     try {

       const admin = await User.findOne({email})     
    
        if(!admin||!admin.isAdmin){
           return res.status(401).json({message:'Access denied: Not an admin'})
        }
      
      const isMatch = await bcrypt.compare(password,admin.password)
        if(!isMatch){
           return res.status(401).json({message:'Invalid Credentials!'})
        }  

         
        const {adminAccessToken, adminRefreshToken} = generateAdminTokens(admin)

         res.cookie('adminRefreshToken',adminRefreshToken,{
             httpOnly:true,
             secure:true,
             sameSite:'lax'
         })
         res.cookie('adminAccessToken',adminAccessToken,{
             httpOnly:true,
             secure:true,
             sameSite:'lax'
         }),

         res.status(200).json({
          admin:{
            fullName:admin.fullName,
            email:admin.email,
            profileImage:admin.profileImage
          },
          // role:'admin'
        })
         
     } catch (error) {
      res.status(500).json({message:"Sever error"})
     }


   }


   const forgotPassword = async(req, res)=>{
    const {email} = req.body
    console.log('forgot pass',req.body);
    
      try {
        const user = await User.findOne({email})

        if(!user){
          return res.status(404).json({ message: 'User not found'});
        }
        console.log(user);
        

        const resetToken = crypto.randomBytes(32).toString('hex')

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpire = Date.now() + 3600000;

        console.log('User with new reset token:', {
          email: user.email,
          resetPasswordToken: user.resetPasswordToken,
          resetPasswordExpire: user.resetPasswordExpire
        });
    
        
         await user.save();


         const savedUser = await User.findOne({email});
         console.log('Saved user verification:', {
           email: savedUser.email,
           resetPasswordToken: savedUser.resetPasswordToken,
           resetPasswordExpire: savedUser.resetPasswordExpire
         });
     


        const resetUrl  = `http://localhost:5173/user/reset-password/${resetToken}`
        const mailOptions = {
           to:user.email,
           subject:'Password Reset Request',
           html:`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7fa; font-family: 'Poppins', Arial, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="min-width: 100%; background-color: #f4f7fa;">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 40px 0; background-color: #5046e5; border-radius: 8px 8px 0 0;">
                            <img src="https://placeholder.svg?height=80&width=80&text=🔒" alt="Security Icon" style="display: block; width: 80px; height: 80px; margin: 0 auto;">
                        </td>
                    </tr>
                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 20px; text-align: center;">
                                        <h1 style="margin: 0; color: #333333; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-bottom: 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                                        <p style="margin: 0 0 15px;">Hello there,</p>
                                        <p style="margin: 0 0 15px;">We received a request to reset the password for your account. Don't worry, we've got you covered! Just click the button below to set a new password:</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding: 30px 0;">
                                        <table border="0" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td align="center" style="border-radius: 50px; background: linear-gradient(45deg, #5046e5, #7e74ff);">
                                                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 50px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Reset Password</a>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding-bottom: 20px; color: #666666; font-size: 16px; line-height: 1.6;">
                                        <p style="margin: 0 0 15px;">For your security, this link will expire in 1 hour. After that, you'll need to request a new password reset.</p>
                                        <p style="margin: 0 0 15px;">If you didn't request this change, please ignore this email or contact our support team if you have any concerns.</p>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 20px; background-color: #f8fafc; border-radius: 8px;">
                                        <p style="margin: 0 0 10px; color: #666666; font-size: 14px;">Button not working? Copy and paste this link into your browser:</p>
                                        <p style="margin: 0; color: #5046e5; word-break: break-all; font-size: 14px;">${resetUrl}</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; background-color: #5046e5; border-radius: 0 0 8px 8px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="color: #ffffff; font-size: 14px; text-align: center;">
                                        <p style="margin: 0 0 10px;">This is an automated message. Please do not reply to this email.</p>
                                        <p style="margin: 0;">© 2024 Your Company. All rights reserved.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
        }

        await transporter.sendMail(mailOptions)
        res.status(200).json({ success: true, message: 'Reset link sent to your email!' });

      } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });

      }
   }






   const resetPassword = async(req, res) =>{
    const {token, newPassword} = req.body
  console.log('reset work ',token,newPassword);
  
    try {
    const user = await User.findOne({
      resetPasswordToken:token,

    })

    console.log(user);
    

    if(!user){
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
    
        const hashedPassword = await bcrypt.hash(newPassword, 10)
    
        user.password = hashedPassword
        user.resetPasswordToken = undefined
        user.resetPasswordExpire = undefined

        await user.save()

        res.status(200).json({ message: 'Password reset successful' });

    } catch (error) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }
   }


module.exports={
   insertUser,
   varifyOTP,
   resendOtp,
   loadLogin,
   refreshControll,
   loadLogout,
   forgotPassword,
   resetPassword,
   adminLogin
}