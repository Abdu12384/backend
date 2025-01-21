const mongoose = require('mongoose')

const returnRequestSchema = new mongoose.Schema({
  reason: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'processing', 'completed'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  }
});

const orderSchema = new mongoose.Schema({
  userId:{
    type:mongoose.Schema.Types.ObjectId,
    ref:'User',
    required:true
  },
  products:[{
    productId:{
      type:mongoose.Schema.Types.ObjectId,
      ref:'Product',
      required:true
    },
    variantId:{
      type:mongoose.Schema.Types.ObjectId,
      required:true
    },
    productName: {
      type: String,
      required: true,
    },
    productImage: {
      type: String,
      required: true, 
    },
    quantity:{
      type:Number,
      required:true,
    },
    price:{
      type:Number,
      required:true
    },
    isCanceled:{
      type:Boolean,
      default:false
    },
    paymentStatus:{
      type: String,
      enum:['pending','completed','processing','failed','refunded'],
      default:'pending'
     },
    returnRequest:returnRequestSchema
  }],
  totalPrice:{
    type: Number,
    required:true
  },
  orderDate:{
    type:Date,
    default:Date.now
  },
  status:{
    type:String,
    enum:['pending','shipped','delivered','cancelled'],
    default:'pending'
  },
  shippingAddressId:{
    type: mongoose.Schema.Types.ObjectId,
    ref:'Address',
    required:true
  },
  paymentInfo:{
    type:String,
    required:true
  },
  paymentStatus:{
    type: String,
    enum:['pending','completed','failed','refunded'],
    default:'pending'
   },
  subtotal:{
    type: Number,
  },
  shippingCost:{
    type: Number,
    default: 0
  },
  discount:{
    type:Number,
  },
  isDeleted:{
    type:Boolean,
    default:false
  },
  gstRate: {
    type: Number, 
    required: true,
  },
  gstAmount: {
    type: Number, 
    required: true,
  },
  cancelReason:{
    type:String,
  }
},
{
  timestamps:true
})

module.exports = mongoose.model('Order',orderSchema)