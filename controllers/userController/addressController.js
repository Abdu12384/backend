const Address = require('../../model/addressModel')



const showAddress = async(req, res)=>{
   
    try {

      
      const userId = req.user?.id;


  
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

      const address = await Address.find({userId})

      

      if(!address || address.length===0){
         return res.status(404).json({message:"Address Not fount"})
      }

      res.status(200).json(address)
      
    } catch (error) {
      console.error("Error fetching address:", error);
      res.status(500).json({ message: "An error occurred while fetching address details" });

    }


}


const addAddress= async (req, res) =>{
     
    const {
      _id,
      fullName,
      mobile,
      address,
      country,
      state,
      city,
      pincode
    }= req.body



    const userId = req.user?.id

     
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required.' });
    }
  
    
    try {

     if(_id){

      

      const existingAddress = await Address.findOne({ _id: _id, userId });

      if (!existingAddress) {
        return res.status(404).json({ message: 'Address not found.' });
    }
      
       const updatedAddress = await Address.findByIdAndUpdate(
         _id,
         {
          fullName,
          mobile,
          address,
          country,
          state,
          city,
          pincode
         },
          {new: true}
       )

       if(!updatedAddress){
        return res.status(404).json({message:'Address not found.'})
       }

       return res.status(200).json({message:'Address updated successfully'})
       
      } else{

        const newAddress = new Address({
          userId,
          fullName,
          mobile,
          address,
          country,
          state,
          city,
          pincode
        })
        
        await newAddress.save()
        
        res.status(200).json({message:"Address Added Successfully"})
      }
        
      } catch (error) {
        console.error('Error while adding address:', error.message);
      return res.status(500).json({ message: 'Internal server error.',error: error.message});
    }

     
}


const defaultAddress = async(req, res) =>{
   const {id} = req.params
   const userId = req.user?.id


     
    
   try {

    await Address.updateMany({userId:userId},{$set:{isDefault:false}})
    
    const updatedAddress = await Address.findOneAndUpdate(
      {_id: id,userId:userId},
      {$set:{isDefault:true}},
      {new: true},
    )

 
    if(!updatedAddress){
      return res.status(404).json({message:'Address not found'})
    }
    
    res.status(200).json({message:'Default address updated.'})
   } catch (error) {
    res.status(500).json({ message: 'Failed to update default address.', error });
   }
}


const deleteAddress = async(req, res)=>{
    
   const {id} = req.params
   const userId = req.user?.id

  
   if (!id) {
    return res.status(400).json({ message: 'Address ID is required.' });
  }
   
  if(!userId){
    return res.status(400).json({ message: 'User ID is required.' });
  }
   try {
    
     const address = await Address.findByIdAndDelete({_id:id,userId})

      if(!address){
        return res.status(404).json({ message: 'Address not found or unauthorized.' });
      }
      res.status(200).json({ message: 'Address deleted successfully.' });

   } catch (error) {
    console.error('Error deleting address:', error.message);
    res.status(500).json({ message: 'Internal server error.', error: error.message });

   }
   
}





module.exports={
   showAddress,
   addAddress,
   defaultAddress,
   deleteAddress
}