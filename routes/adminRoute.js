const express = require('express')
const admin_Route= express.Router()
const  {cloudinaryImgUpload}= require('../controllers/cloudinaryController')
const {showProduct,
        EditProduct,
        softDelete,
        addProduct,
        addProductOffer,
        removeProductOffer}= require('../controllers/adminController/productController')

const {getUsers,
      toggleUserStatus,
      loadLogout
} = require('../controllers/adminController/userMangement')

const {verifyAdminToken }= require('../middleware/adminAuth')

const {addCategory,
       fetchCategory,
       editCategory,
       softDeleteCategory,        
       addOfferCatogory,
       removeCategoryOffer
      }= require('../controllers/adminController/categoryControll')


 const {
  loadOrderDetails,
  updateOrderStatus,
  cancelOrder,
  getReturnRequests,
  updateReturnRequest,
  exportPdf
 } = require('../controllers/adminController/orderManagement')    

const { 
        addCoupon, 
        deleteCoupon,
         getAllCoupons
         } = require('../controllers/adminController/couponController')

const { salesData,
         generatePDFReport, 
         generateExcelReport 
        } = require('../controllers/adminController/salesReportManage')
const { getDashboardData, chartData } = require('../controllers/adminController/dashboardController')







// Image Upload Routes

admin_Route
        .get('/generate-upload-url',cloudinaryImgUpload)    
        
// Product Routes
 admin_Route
        .post('/add-product',verifyAdminToken,addProduct)
        .get('/products',verifyAdminToken,showProduct)
        .put('/products/:id',verifyAdminToken,EditProduct)
        .patch('/products/:id',verifyAdminToken,softDelete)
        .post('/product/:id/offer',verifyAdminToken,addProductOffer)
        .patch('/product/:id/remove-offer',verifyAdminToken,removeProductOffer)

   // User Routes     
admin_Route
        .get('/users',verifyAdminToken,getUsers)
        .put('/users/status/:id',verifyAdminToken,toggleUserStatus)


 // Category Routes       
admin_Route
        .post('/categories',verifyAdminToken,addCategory)
        .get('/categories',verifyAdminToken,fetchCategory)
        .put('/categories/:id',verifyAdminToken,editCategory)
        .post('/categories/:categoryId/offer',verifyAdminToken,addOfferCatogory)
        .patch('/categories/block/:id',verifyAdminToken,softDeleteCategory)
        .patch('/category/:id/remove-offer',verifyAdminToken,removeCategoryOffer)


 // Order Management Routes
admin_Route
        .get('/sales-data',verifyAdminToken,salesData)
        .get('/orders/manage',verifyAdminToken,loadOrderDetails)
        .patch('/orders/status/:id',verifyAdminToken,updateOrderStatus)
        .patch('/orders/cancel/:id',verifyAdminToken,cancelOrder)
        .patch('/return-request/:orderId/:productId',verifyAdminToken,updateReturnRequest)


  // Coupon Routes      
 admin_Route
        .post('/add-coupon',verifyAdminToken,addCoupon)
        .get('/coupons',verifyAdminToken,getAllCoupons)
        .delete('/delete-coupon/:couponId',verifyAdminToken,deleteCoupon)


   // PDF and Logout Routes     
 admin_Route
        .get('/generate-pdf',verifyAdminToken,generatePDFReport)
        .get('/generate-excel',verifyAdminToken,generateExcelReport)

 admin_Route
         .get('/dashboard',verifyAdminToken,getDashboardData)       
         .get('/dashboard/chart-data',verifyAdminToken,chartData)       

        .post('/logout',loadLogout)

module.exports=admin_Route