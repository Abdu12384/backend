
const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  offerName: { 
    type: String, 
    required: true 
  },
  offerPercentage: 
  { type: Number, 
    required: true, 
    min: 0,
     max: 100 
    },
  startDate: 
  { type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
}, { _id: false });

const CategorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: 
  { type: String, 
    required: true 
  },
  stock:{
    type:Number,
    default:0
  },
  isDeleted:{
    type:Boolean,
    default:false
  },
  offer: OfferSchema, 
  salesCount: {
    type: Number,
    default: 0 
  }
},
{
  timestamps:true
}

);

module.exports = mongoose.model('Category', CategorySchema);
