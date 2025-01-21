const User = require('../../model/userModel')
const Address = require('../../model/addressModel')
const { use } = require('../../routes/userRoute')
const bcrypt = require('bcrypt');
const { json } = require('express');


const profileUpdate = async(req, res) =>{

    const {
      fullName,
      email,
      mobile,
      profileImage,
      currentPassword,
      newPassword
    }= req.body
    
  
    console.log('here user',req.body);
    try {
      const user = await User.findById(req.userId)

      
       
      if(!user) return res.status(404).json({error:"User not found"})


         if(currentPassword){
           const isMatch = await bcrypt.compare(currentPassword,user.password)
            if(!isMatch){
              return res.status(400).json({ message: "Current password is incorrect" });

            }

            if(newPassword){
              const hashedPassword = await bcrypt.hash(newPassword,10)
              user.password = hashedPassword
             }
         }



        user.fullName = fullName || user.fullName
        user.email = email || user.email
        user.mobile = mobile || user.mobile
        user.profileImage = profileImage || user.profileImage
        
        await user.save()
         
   res.json({ message: "Profile updated successfully", user});

    } catch (error) {
      console.error("Error updating profile:", error);
    res.status(500).json({ error: "Internal server error" });

    }
}

const getProfile = async (req, res)=>{
   try {
   const userId = req.user.id
    const user= await User.findById(userId)

    if(!user){
      return res.status(404).json({message:'User Not fond'})
    }

    res.status(200).json(user)
    
   } catch (error) {
    console.log(error);
    console.log("Error From fetching User");
    
   }
}


module.exports={
   profileUpdate,
   getProfile
}