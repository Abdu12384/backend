const mongoose  = require('mongoose')


const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1
  },
  price:{
    type:Number,
    required:true
  }
},
{
  timestamps:true
}
)

CartSchema.index({user:1, product: 1, variant:1},{unique:true})

module.exports = mongoose.model('cart',CartSchema)