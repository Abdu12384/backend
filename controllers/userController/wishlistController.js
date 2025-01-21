const Wishlist = require('../../model/wishlistModel')
const Product = require('../../model/productModal');
const User = require('../../model/userModel');




const addWishlist = async(req, res)=>{
   try {
    const {productId} = req.body
    const userId = req.user.id
    
    const user = await User.findById(userId)

     if(!user){
      return res.status(404).json({message:'User not found'})
     }

     const product = await Product.findById(productId)

     if(!product){
      return res.status(404).json({message:'Product not found'})
     }

     let wishlist = await Wishlist.findOne({userId})

      if(!wishlist){
        wishlist = new Wishlist({userId, products:[]})
      }

      const productExists = wishlist.products.some(item => item.productId.toString() === productId)
      if(productExists){
        return res.status(400).json({message:'Product already in wishlist'})
      }
 
      wishlist.products.push({productId})
      await wishlist.save()
      console.log('working good',wishlist);
      

      res.status(200).json({ success: true, message: 'Product added to wishlist', wishlist });

   } catch (error) {
    console.error('Error adding to wishlist:', error);
    res.status(500).json({ success: false, message: 'Failed to add product to wishlist' });
   }
}

const getWishlist = async(req, res)=>{
   try {
     const userId = req.user.id

     const wishlist = await Wishlist.findOne({userId}).populate('products.productId')

     if(!wishlist){
      return res.status(404).json({message:'Wishlist not found'})
     }

     res.status(200).json({wishlist})
   } catch (error) {
    console.error('Error fetching wishlist:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wishlist' });
   }
}


const  deleteWishlishProduct = async (req, res)=>{
  const userId = req.user.id
  console.log('mnmn',userId);
  
  const productId = req.params.productId
  try {
    console.log('Removing product:', productId);
   
    const updatedWishlist = await Wishlist.updateOne(
      {userId:userId},
      {$pull:{products:{productId}}},
      // {new:true}
    )
   console.log(updatedWishlist);
   
    if(!updatedWishlist){
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    res.status(200).json({message:'Product removed found'})

  } catch (error) {
    console.error('Error removing product from wishlist:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


const  removeFromWishlist = async(req, res)=>{
  try {

  const { userId } = req.user; 
   const {productId} = req.params


   if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
  }

  const wishlist = await Wishlist.findOneAndUpdate(
    { user: userId }, 
    { $pull: { products: { productId: productId } } }, 
    { new: true } 
  );

  if (!wishlist) {
    return res.status(404).json({ message: 'Wishlist not found' });
  }


  return res.status(200).json({
    message: 'Product removed from wishlist successfully',
    wishlist,
  });

    
   } catch (error) {
    console.error('Error removing product from wishlist:', error);
    return res.status(500).json({ message: 'Internal server error', error });
    
   }
}

module.exports={
  addWishlist,
  getWishlist,
  deleteWishlishProduct,
  removeFromWishlist
}