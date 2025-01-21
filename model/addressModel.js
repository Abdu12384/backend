const { default: mongoose } = require('mongoose')
const mogoose = require('mongoose')

const AddressSchema = new mogoose.Schema({
   userId:{
     type: mongoose.Schema.Types.ObjectId,
     ref:'User',
     required:true
   },
   fullName:{
     type:String,
     required:true
   },
   mobile:{
    type:Number,
    required:true
   },
   address:{
    type:String,
    required:true
   },
   country:{
    type:String,
    required:true
   },
   state:{
    type:String,
    required:true
   },
   city: {
    type: String,
    required: true 
  },
   pincode:{
    type:String,
    required:true
   },
   isDefault:{
    type:Boolean,
    default:false,
   }
},
{
  timestamps:true
}
)
module.exports = mongoose.model('Address',AddressSchema)