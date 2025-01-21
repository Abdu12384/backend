const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    
      fullName:{
        type:String,
        required:true, 
      },
      email:{
        type:String,
        required:true,
        unique:true
      },
      password:{
         type:String,
         required:true
      },
      mobile:{
        type:String,
        required:true
      },
      profileImage:{
        type:String,
        default:'',
      },
      googleId:{
        type:String
      },
      isAdmin:{
        type:Boolean,
        default:false
      },
      addressId:{
       type: mongoose.Schema.Types.ObjectId,
       ref:'Address'
      },
      resetPasswordToken:{
        type:String
      },
      resetPasswordExpire:{
        type:Date
      },
      isActive:{
         type:Boolean,
         default:true
      }
 
},
  {
    timestamps: true
  }
)

module.exports= mongoose.model('User',userSchema)