const express = require('express')
const user_Route= express.Router()

// ProductController
const {
  homeListProduct,
  productDetails,
  handlLogoutUser,
  cakePage
} = require('../controllers/userController/productController')


//UserAuth
const{
  profileUpdate,
  getProfile,
}= require('../controllers/userController/ProfileCantroller')
const {varifyToken} = require('../middleware/userAuth')


//AddressController
const {
  showAddress,
  addAddress,
  defaultAddress,
  deleteAddress
} = require('../controllers/userController/addressController')

//Cart

const {
 addToCart,
 getCartItem,
 removeItemCart,
 updateCartQuantity
}= require('../controllers/userController/cartCantroller')


// Order

const{
 placeOrder,
 getOrderDetails,
 getAllOrders,
 cancelOrder,
 rezorpayLoad,
 varifyPayment,
 couponApply,
 cancelProduct,
 returnController,
 invoiceDownLoad,
 handleFailedPayment,
 handleRepayment
} = require('../controllers/userController/orderController')
const { addWishlist, getWishlist, deleteWishlishProduct, removeFromWishlist,  } = require('../controllers/userController/wishlistController')
const { getAllCoupons } = require('../controllers/adminController/couponController')
const { getWalletInfo, addMoneyToWallet, placeWalletOrder } = require('../controllers/userController/walletController')
const { fetchCategory } = require('../controllers/adminController/categoryControll')





// Product Routes
user_Route.get('/home-list-Product',homeListProduct)
          .get('/productshow/:id',productDetails)
          .get('/products-list',varifyToken,cakePage)
          .get('/categories',varifyToken,fetchCategory)

// Profile Routes          
user_Route         
          .get('/profile-update',varifyToken,getProfile)
          .post('/profile-update',varifyToken,profileUpdate)
  
 
// Address Routes          
user_Route      
          .get('/address-details',varifyToken,showAddress)
          .post('/add-address',varifyToken,addAddress)
          .put('/set-default-address/:id',varifyToken,defaultAddress)
          .delete('/delete-address/:id',varifyToken,deleteAddress)

// Cart Routes        
user_Route          
          .get('/cart/item',varifyToken,getCartItem)
          .put('/cart/update',varifyToken,updateCartQuantity)
          .delete('/cart/remove',varifyToken,removeItemCart)
          .post('/cart-add',varifyToken,addToCart)
      
// Order Routes
user_Route          
          .get('/orders',varifyToken,getAllOrders)
          .post('/order/payment',varifyToken,rezorpayLoad)
          .post('/verify-payment',varifyToken,varifyPayment)
          .post('/handle-failed-payment',varifyToken,handleFailedPayment)
          .post('/place-order',varifyToken,placeOrder)
          .get('/order-details/:orderId',varifyToken,getOrderDetails)
          .post('/cancel-order/:orderId',varifyToken,cancelOrder)
          .post('/cancel-product',varifyToken,cancelProduct)
          .get('/order-invoice/:orderId',varifyToken,invoiceDownLoad)
          .post('/verify-repayment',varifyToken,handleRepayment)


 // Wishlist Routes         
user_Route          
          .get('/mywishlist',varifyToken,getWishlist)
          .delete('/mywishlist/:productId',varifyToken,deleteWishlishProduct)
          .post('/wishlist/add',varifyToken,addWishlist)
          .delete('/mywishlist/:productId',varifyToken,removeFromWishlist)
  
 // Coupon Routes         
user_Route        
          .get('/coupons',varifyToken,getAllCoupons)
          .post('/apply-coupon',varifyToken,couponApply)

// Wallet Routes
user_Route          
          .get('/wallet/balance',varifyToken,getWalletInfo)
          .post('/wallet/add-money',varifyToken,addMoneyToWallet)
          .post('/wallet/deduct',varifyToken,placeWalletOrder)

  // Return Routes        
user_Route          
          .post('/return-request',varifyToken,returnController)
 
          
user_Route        
          .post('/logout',handlLogoutUser)
          

module.exports=user_Route