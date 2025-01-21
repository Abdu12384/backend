const express = require('express')
const auth_Route= express.Router()
const {insertUser,
       varifyOTP,
       resendOtp,
       loadLogin,
       refreshControll,
       loadLogout,
       adminLogin,
       forgotPassword,
       resetPassword} = require('../controllers/authController')
const googleController = require('../controllers/googleController')



  auth_Route.post('/google/signup',googleController.googleSignup)
            .post('/signup',insertUser)
            .post('/verifyotp',varifyOTP)
            .post('/resendotp',resendOtp)
            .post('/login',loadLogin)
            .post('/admin/login',adminLogin)
            .post('/logout',loadLogout)
            .post('/refresh-token',refreshControll) 
            .post('/forgot-password',forgotPassword)
            .post('/reset-password',resetPassword)

  


  module.exports = auth_Route