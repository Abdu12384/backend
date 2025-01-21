const mongoose = require('mongoose')

const couponSchema = new mongoose.Schema({
  code: { 
    type: String, 
    required: true, 
    unique: true 
  },
  discount: { 
    type: Number, 
    required: true
   },
  minAmount: { 
    type: Number, 
    required: true 
  },
  maxAmount: { 
    type: Number, 
    required: true 
  },
  start: { 
    type: Date, 
    default: Date.now 

  },
  expiryDate: {
     type: Date, 
     required: true 
    },
  status: { 
    type: String, 
    enum: ['Active', 'Expired'], 
    default: 'Active' },

},
{
  timestamps:true
}
)

module.exports = mongoose.model('Coupon', couponSchema);

