const mongoose = require('mongoose');


const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', 
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0, 
  },
  transactions: [
    {
      transactionId: {
        type: String,
        required: true,
      },
      description: {
        type: String,
      },
      date: {
        type: Date,
        required: true,
        default: Date.now,
      },
      amount: {
        type: Number,
        required: true,
      },
      type:{
        type:String,
      },
      status: {
        type: String,
        enum: ['completed', 'pending', 'failed'],
        required: true,
        default: 'pending',
      },
    },
  ],

},
{
  timestamps:true
}
);

module.exports = mongoose.model('wallet', walletSchema);
