const Cart = require('../../model/cartModel')
const Product = require('../../model/productModal');



const getCartItem = async(req, res)=>{
  try {
     const userId = req.user?.id

     if(!userId){
      return res.status(401).json({ message: 'User not authenticated' });
     }

     const cartItems = await Cart.find({user:userId})
     .populate({
      path: 'product',
      select: 'productName images category variants gstRate offer',
      populate: {
        path: 'category',
        select: 'offer'
      }
    })
    .populate({
      path: 'variant',
      select: 'weight regularPrice salePrice stock'
    });
      


      const enrichedCartItems = cartItems.map(item => {

        if (!item.product || item.product.isDeleted) {
          console.warn(`Product not available or inactive: ${item.product?.productName}`);
          return null; 
        }
  
        const variant = item.product.variants.find(
          v => v._id.toString() === item.variant.toString()
        );
  

        if (!variant) {
          console.warn(`Variant not found for product: ${item.product.productName}`);
          return null; 
        }


       
        return {
          ...item.toObject(),
          productName: item.product.productName,
          images: item.product.images,
          variantDetails: variant,
          quantity: item.quantity,
        };
      }).filter(item => item !== null);


      const cartSummary = enrichedCartItems.reduce(
        (summary, item)=> {
         const itemPrice = item.variantDetails.salePrice || item.variantDetails.regularPrice
         const OfferDiscount = item.product?.offer?.offerPercentage || 0; 
         const discountAmount = (itemPrice * OfferDiscount) / 100; 

          return{
            totalItems: summary.totalItems + item.quantity, 
            totalPrice: summary.totalPrice + itemPrice  * item.quantity, 
            totalDiscount: summary.totalDiscount + (discountAmount * item.quantity), 
          }
      },{totalItems:0, totalPrice:0, totalDiscount:0, })

      const gstRate = 18
      const totalGST = Math.floor((cartSummary.totalPrice * gstRate) / 100)
      const totalPriceWithGST =  Math.floor(cartSummary.totalPrice + totalGST)  


      cartSummary.gstRate = gstRate
      cartSummary.totalGST = totalGST; 
      cartSummary.totalPriceWithGST = totalPriceWithGST;

    
      res.status(200).json({cartItems:enrichedCartItems, summary:cartSummary})
    
   } catch (error) { 
    console.error('Fetch Cart Items Error:', error);
    res.status(500).json({ message: 'Error fetching cart items',error: error.message});
   }
}


const addToCart = async(req, res)=>{
  try {
    const {productId, variantId, quantity} = req.body
    const userId = req.user?.id

    
    
    if(!productId || !variantId || !quantity){
      return res.status(400).json({ message: 'Invalid cart input' });
    }
 

    const product = await Product.findById(productId)

     if(!product){
      return res.status(404).json({ message: 'Product not found' });
     }

     if (product.isDeleted) {
      return res.status(400).json({ message: 'Product is not available for purchase' });
    }

     const variant = product.variants.find(v => v._id.toString() === variantId);
     if (!variant) {
       return res.status(404).json({ message:'Variant not found'});
     }
   
     const existingCartItems = await Cart.find({
       user:userId,
       product:productId
     })

      const totalExistingQuantity = existingCartItems.reduce((total, item) => total + item.quantity,0)
      const proposedTotalQuantity = totalExistingQuantity + quantity

       if(proposedTotalQuantity > 5){
        return res.status(400).json({message:  `Maximum 5 items allowed for this product. You already have ${totalExistingQuantity} in your cart.`})
       }
       
 
     if (variant.stock < quantity) {
      return res.status(400).json({ 
        message: `Insufficient stock. Only ${variant.stock} items available.`
      });
    }

    let cartItem = await Cart.findOne({
      user:userId,
      product:productId,
      variant:variantId
    })

    if(cartItem){
      cartItem.quantity += quantity
    }else{
      cartItem = new Cart({
        user:userId,
        product:productId,
        variant:variantId,
        quantity:quantity,
        price:variant.salePrice||variant.regularPrice
      })
    }

    await cartItem.save()

    res.status(200).json({message:'Product added to cart successfully'})

    
  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ message: 'Error adding product to cart',error: error.message });
 }
  
}



const updateCartQuantity = async (req, res) =>{
  try {
    const {productId, variantId, newQuantity} = req.body
    const userId = req.user?.id

    
    
    if(!userId){
      return res.status(401).json({message:'User not authenticated'})
    }

    if(!productId || !variantId || typeof newQuantity !== 'number'){
      return res.status(400).json({ message: 'Invalid input data' });
    }

    const product = await Product.findById(productId)
    if(!product){
      return res.status(404).json({ message: 'Product not found' });
    }

    const variant = product.variants.find(v => v._id.toString() === variantId)
    if(!variant){
      return res.status(404).json({ message: 'Variant not found' });
    }
    if(variant.stock < newQuantity){
      return res.status(400).json({
        message: `Insufficient stock. Only ${variant.stock} items available.`,
      });
    }


        const existingCartItems = await Cart.find({
          user: userId,
          product: productId
        });

        const totalExistingQuantity = existingCartItems
          .filter(item => item.variant.toString() !== variantId)
          .reduce((total, item) => total + item.quantity, 0);
    

        if (totalExistingQuantity + newQuantity > 5) {
          return res.status(400).json({
            message: `Maximum 5 items allowed for this product. You already have ${totalExistingQuantity} in your cart.`
          });
        }
    

    const cartItem = await Cart.findOne({
      user:userId,
      product:productId,
      variant:variantId
    })

      
    if(!cartItem){
      return res.status(404).json({ message: 'Cart item not found' });
    }
    cartItem.quantity = newQuantity
    await cartItem.save()

    res.status(200).json({ message: 'Cart quantity updated successfully' });

  } catch (error) {
    console.error('Update Cart Quantity Error:', error);
    res.status(500).json({ message: 'Error updating cart quantity', error: error.message });
  }
}


const removeItemCart = async(req, res)=>{
  try {
   const {productId, variantId} = req.body
   const userId = req.user?.id


   
    if(!productId || !variantId){
       return res.status(400).json({message:'Product ID and Variant Id are required'})
    }

    const result = await Cart.deleteOne({
      user:userId,
      product:productId,
      variant:variantId
    })

    if(result.deletedCount === 0){
      return res.status(404).json({message:'Item not found in cart'})
    }

    const updatedCart = await Cart.find({user:userId})
     .populate('product')
     .populate.apply('variant')

     res.status(200).json({message:'Item removed succefully',cart:updatedCart})
    
   } catch (error) {
    console.error('Error while removing item from cart:', error);
    res.status(500).json({ message: 'Server error' });
   }
}



module.exports={
  getCartItem,
  updateCartQuantity,
  removeItemCart,
  addToCart
}