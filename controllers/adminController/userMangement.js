const Users = require('../../model/userModel')



const getUsers= async (req, res) =>{

    try {
      const users = await Users.find({isAdmin:false},{password:0})

      
       if(!users || users.length === 0){
         res.status(404).json({message:"Users Not fount"})
       }

      res.json(users)

    } catch (error) {
      console.error("Error from Server",error)
    }

}

const toggleUserStatus = async (req,res)=>{
  
  const {id} = req.params
  const {isActive}= req.body

   try {
     const user = await Users.findByIdAndUpdate(
      id,
      {isActive},
      {new:true}
    )

    
     if(!user){
      return res.status(404).json({message:'User not found'})
     }

     res.status(200).json(user)
      
   } catch (error) {
    console.error('Error updating user status',error)
    res.status(500).json({message:'Server error while updating status'})
   }
}



const  loadLogout = async(req, res)=>{
  try {

    res.clearCookie('adminRefreshToken', {
      httpOnly: true,
      secure: true, 
      sameSite: 'lax',
    });

    res.clearCookie('adminAccessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });


    return res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}


module.exports={
  getUsers,
  toggleUserStatus,
  loadLogout
}