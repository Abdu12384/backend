const mongoose = require('mongoose')

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: true
  },
  products:[
   { productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product', // Reference to Product model
      required: true
      }
   },
  ]
     
},
{
  timestamps:true
}
);

module.exports=mongoose.model('Wishlist', wishlistSchema);
