const Wallet = require('../../model/walletModel')
const Product = require('../../model/productModal');
const Order = require('../../model/orderModel');
const Cart = require('../../model/cartModel');
const Category = require('../../model/category')

const getWalletInfo = async (req, res) => {
  const userId = req.user.id;

  try {

    let wallet = await Wallet.findOne({ user: userId });


    if (!wallet) {
      wallet = new Wallet({
        user: userId,
        balance: 0, 
        amount: 0,
        status: 'pending',
        transactionDate: new Date(),
        date: new Date(),
      });
      await wallet.save();
    }

    res.status(200).json(wallet);
  } catch (error) {
    console.error('Error fetching or creating wallet info:', error);
    res.status(500).json({ message: 'Failed to fetch or create wallet info' });
  }
};


const addMoneyToWallet = async (req, res)=>{
   const userId = req.user.id
   const {amount}= req.body
   console.log(req.body);
   

   try {
    let wallet = await Wallet.findOne({user:userId})
    if(!wallet){
      wallet = new Wallet({user: userId, balance:0})
    }

    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ message: 'Invalid amount provided' });
    }

    wallet.balance = (wallet.balance || 0) + numericAmount
    wallet.amount = numericAmount
    wallet.status = 'completed'
    wallet.transactionDate = new Date()

    
    await wallet.save()
    res.status(200).json({message:'Money added to wallet successfully',wallet})

   } catch (error) {
    console.log(error);
    res.status(500).json({message: "An error occurred while adding money to the wallet"}) }
}




const placeWalletOrder = async (req, res) => {
  try {
    const { orderDetails } = req.body;
    const { address, cartItems, cartSummary } = orderDetails
    console.log('wallet order',req.body);
    

    if (!req.user?.id || !address || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    let wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }
     console.log(wallet);
     


     const products = [];
    for (const item of cartItems) {
      const productId = item.product?._id;
      const variantId = item.variant;


      if (!productId) {
        return res.status(400).json({
          message: `Invalid product details in cart item: ${JSON.stringify(item)}`
        });
      }


      const product = await Product.findById(productId);
      if (!product) {
        return res.status(400).json({ message: `Product with ID ${productId} not found.` });
      }


      const variant = product.variants.find((v) => v._id.toString() === variantId);
      if (!variant) {
        return res.status(400).json({
          message: `Variant with ID ${variantId} not found for product ${product._id}`
        });
      }


      if (variant.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for product: ${product.name}`
        });
      }


      variant.stock -= item.quantity;
      product.salesCount += item.quantity;


      if (product.category) {
        await Category.findByIdAndUpdate(
          product.category,
          { $inc: { salesCount: item.quantity } },
          { new: true }
        );
      }

      await product.save();


      products.push({
        productId: product._id,
        variantId: variantId,
        productName: product.productName, 
        productImage: product.images[0],
        quantity: item.quantity,
        price: item.variantDetails.salePrice,
      });
    }


    console.log(products);
    


    const { discount = 0, totalGST,subtotal ,total, gstRate , shippingCharge  } = cartSummary || {};




    if(wallet.balance < total){
      return res.status(400).json({ message: `Insufficient wallet balance ${wallet.balance}`});
    }


    wallet.balance -= total;
    wallet.transactions.push({
      transactionId: `TRX${Date.now()}`, 
      description: 'Order Payment',
      type: 'debit',
      amount: total,
      status: 'completed',
      date: new Date(),
    });
    await wallet.save();

    const newOrder = new Order({
      userId: req.user?.id,
      subtotal:subtotal,
      gstRate:gstRate,
      gstAmount:totalGST,
      totalPrice: total,
      shippingAddressId: address._id,
      paymentInfo: 'Wallet',
      paymentStatus:'completed',
      products: products.map(prodct=>({
        ...prodct,
        paymentStatus:'completed'
      })),
      status: 'pending',
      shippingCost: shippingCharge,
      discount,
    });


    const savedOrder = await newOrder.save();


    await Cart.deleteMany({ user: req.user?.id });

    res.status(201).json({ success:true, message: 'Order placed successfully using wallet', orderId: savedOrder._id });
  } catch (error) {
    console.error('Error placing wallet order:', error.message);
    res.status(500).json({ message: 'Failed to place wallet order', error: error.message });
  }
};




module.exports = { 
  getWalletInfo,
  addMoneyToWallet,
  placeWalletOrder
 };
