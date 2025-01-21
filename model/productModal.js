const mongoose = require('mongoose')

const variantSchema = new mongoose.Schema({
  weight:{
    type:String,
    required:true
   },
   regularPrice:{
    type:Number,
    required:true
   },
   salePrice:{
    type:Number,
    // required:true
   },
   stock:{
    type:Number,
    required:true
   },
 
  
})



const reviewSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
  },
  rating: { 
    type: Number, 
    min: 1, 
    max: 5, 
    required: true 
  },
  comment: { 
    type: String, 
    required: true 
  },

});

const offerSchema = new mongoose.Schema({
  offerName: {
    type: String,
    required: true
  },
  offerPercentage: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  }
});

const prodcutSchema = new mongoose.Schema({
   productName:{
     type:String,
     required:true
   },
   category:{
    type:String,
    required:true
   },
   qty:{
     type:Number,
     required:false,
     default:0
    },
    images:{
      type:[String],
      required:true
    },
    description:{
      type:String,
      required:true
    },
   
    category:{
     type: mongoose.Schema.Types.ObjectId, 
     ref:"Category",
     required:true
    },
 
   isDeleted:{
     type:Boolean,
     default:false
   },
   variants:[variantSchema],
   reviews: [reviewSchema], 
 type:{
    type:[String],
    enum:['Birthday','Wedding','Anniversary','Custom']
   },
   offer: offerSchema,

 gstRate: {
  type: Number, 
   required: true,
   default: 18, 
  },
  salesCount: {
    type: Number,
    default: 0, 
  },
},
{
  timestamps:true
}
)

module.exports = mongoose.model('Product',prodcutSchema)