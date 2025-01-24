const Order = require('../../model/orderModel'); 
const User = require('../../model/userModel'); 
const Product = require('../../model/productModal'); 
const Category = require('../../model/category')
const Cart = require('../../model/cartModel')
const razorpay = require('../../config/razorpay')
const Coupon = require('../../model/couponModel')
const Wallet = require('../../model/walletModel')
const PDFDocument = require('pdfkit');
const crypto = require('crypto')
const { v4: uuidv4 } = require('uuid'); 



const placeOrder = async (req, res) => {
  try {
    const { address, paymentMethods, cartItems, cartSummary } = req.body;
    console.log('oooooo',req.body);
    

    if ( !req.user?.id || !address || !paymentMethods || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'All fields are required.' });
    }


    const products = [];
    for (const item of cartItems) {
      const productId = item.product?._id;
      const variantId = item.variant;

      if (!productId) {
        return res.status(400).json({ message: `Invalid product details in cart item: ${JSON.stringify(item)}` });
      }

      const product = await Product.findById(productId);

      if (!product || product.isDeleted) {
        return res.status(400).json({ message: `Product with ID '${product.productName}' is not available for purchase.` });
      }

      const variant = product.variants.find(v => v._id.toString() === variantId);

      if (!variant) {
        return res.status(400).json({ message: `Variant with ID ${variantId} not found for product ${product._id}` });
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${product.productName}` });
      }


      variant.stock -= item.quantity;
      product.salesCount = (product.salesCount || 0) + item.quantity;

      if (product.category) {
        await Category.findByIdAndUpdate(
          product.category,
          { $inc: { salesCount: item.quantity } },
          { new: true }
        );
      }

      await product.save();

      // Push to products array
      products.push({
        productId: product._id,
        variantId: variantId,
        productName: product.productName, 
        productImage: product.images[0], 
        quantity: item.quantity,
        price: variant.salePrice || variant.regularPrice,
        totalPrice: (variant.salePrice || variant.regularPrice) * item.quantity,
      });
    }
    
    const { discount = 0, totalGST,subtotal ,total,gstRate , shippingCharge } = cartSummary || {};
    

    if (paymentMethods === 'COD' && total > 1000) {
      return res.status(400).json({ message: 'Orders above Rs. 1000 cannot be placed with COD.' });
    }


    const newOrder = new Order({
      userId: req.user?.id,
      subtotal:subtotal,
      gstRate:gstRate,
      gstAmount:totalGST,
      totalPrice: total,  
      shippingAddressId:address._id,
      paymentInfo: paymentMethods,
      products: products.map(prodct=>({
        ...prodct,
        paymentStatus:'pending'
      })), 
      status:'pending',
      shippingCost:shippingCharge,
      discount:discount

    });

    const savedOrder = await newOrder.save();

    await Cart.deleteMany({user: req.user?.id})


    res.status(201).json({ success:true, message: 'Order placed successfully', orderId: savedOrder._id });
  } catch (error) {
    console.error('Error placing order:', error.message);
    res.status(500).json({ message: 'Failed to place order', error: error.message });
  }
};






const handleFailedPayment = async (req, res) => {
  console.log('failedpaymentt');
  
  try {
    const { orderDetails, paymentFailure } = req.body;

    if (!orderDetails || !paymentFailure) {
      return res.status(400).json({ success: false, message: 'Invalid data provided.' });
    }

    const { address, paymentMethods, cartItems, cartSummary } = orderDetails;
    const { reason, description, order_id, payment_id } = paymentFailure;


    if (!address || !paymentMethods || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }



    const products = [];
for (const item of cartItems) {
  const productId = item.product?._id;
  const variantId = item.variant;

  if (!productId || !variantId) {
    return res.status(400).json({ message: `Invalid cart item: ${JSON.stringify(item)}` });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: `Product with ID ${productId} not found.` });
  }

  const variant = product.variants.find(v => v._id.toString() === variantId);
  if (!variant) {
    return res.status(404).json({ message: `Variant with ID ${variantId} not found for product ${product._id}` });
  }

  if (variant.stock <= item.quantity) {
    return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
  }


  variant.stock -= item.quantity;
  product.salesCount = (product.salesCount || 0) + item.quantity;

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
    variantId,
    productName: product.productName, 
    productImage: product.images[0], 
    quantity: item.quantity,
    price: item.variantDetails.salePrice,
    paymentStatus: 'pending',
  });
}

    const { discount = 0, totalGST, subtotal, total, gstRate, shippingCost } = cartSummary || {};

    

    const newOrder = await Order.create({
      userId: req.user.id,
      subtotal,
      gstRate,
      gstAmount: totalGST,
      totalPrice: total,
      shippingAddressId: address._id,
      paymentInfo: paymentMethods,
      products,
      status: 'pending',
      paymentStatus: 'pending', 
      shippingCost,
      discount,
      paymentFailureReason: { reason, description },
      razorpayOrderId: order_id,
      razorpayPaymentId: payment_id,
    });

    res.status(201).json({
      success: true,
      message: 'Order created with pending payment status due to failed payment.',
      order: newOrder,
    });
    await Cart.deleteMany({user: req.user?.id})

  } catch (error) {
    console.error('Failed Payment Handling Error:', error);
    res.status(500).json({ success: false, message: 'Error handling failed payment.', error: error.message });
  }
};












const getAllOrders = async (req, res) => {
  try {

    const orders = await Order.find({ userId: req.user?.id })
      .sort({ orderDate: -1 })
      .populate({
        path: 'products.productId', 
        select: 'productName images ', 
      });

      console.log(orders);
      
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching orders', 
      error: error.message 
    });
  }
};





const getOrderDetails = async (req, res) => {
  try { 
    const order = await Order.findOne({ 
      _id: req.params.orderId, 
      user: req.user._id 
    })
    .populate('products.productId')
    .populate('shippingAddressId')
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    console.log(order);
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ 
      message: 'Error fetching order details', 
      error: error.message 
    });
  }
};




const cancelOrder = async (req, res) =>{
   const {orderId} = req.params
   const {reason} = req.body

   try {

    const order = await Order.findById(orderId)

    if(!order){
      return res.status(404).json({ message: 'Order not found' });
    }

    if(order.status === 'cancelled'){
      return res.status(400).json({message:'Order is already cancelled '})
    }

    let refundAmount = 0
   
  for(const product of order.products){
    if(!product.isCanceled){
      refundAmount += product.price * product.quantity
      product.isCanceled = true

      if (order.paymentInfo === 'razorpay' || order.paymentInfo === 'Wallet' || order.paymentStatus === 'completed') {
        product.paymentStatus = 'refunded';
          order.paymentStatus = 'refunded'

      } else if (order.paymentInfo === 'COD') {
        product.paymentStatus = 'failed';
        order.paymentStatus = 'failed';

      }
      const dbProduct = await Product.findById(product.productId).populate('category');
        if (dbProduct) {

          product.productName = dbProduct.productName
          product.productImage = dbProduct.images[0]


          const variant = dbProduct.variants.find(v => v._id.toString() === product.variantId.toString());
           
           variant.stock= Math.max(0, variant.stock + product.quantity); 

          dbProduct.salesCount = Math.max(0, (dbProduct.salesCount || 0) - product.quantity);

          if (dbProduct.category) {
            await Category.findByIdAndUpdate(
              dbProduct.category._id,
              { $inc: { salesCount: -product.quantity } }, 
              { new: true }
            );
          }

          await dbProduct.save();
      }
    }
  }

  refundAmount -= (order.discount || 0);
  refundAmount = Math.max(0, refundAmount);
    
    order.status = 'cancelled'
    order.cancelReason = reason


    if (order.paymentInfo === 'Wallet' || order.paymentInfo === 'razorpay' || order.paymentStatus === 'completed') {
      const wallet = await Wallet.findOne({ user: order.userId });

      if (!wallet) {

        const newWallet = new Wallet({
          user: order.userId,
          balance: refundAmount,
          transactions: [{
            transactionId: uuidv4(),
            description: `Refund for cancelled order #${order._id.toString().slice(0, 8)}`,
            amount: refundAmount,
            type: 'credit',
            status: 'completed',
            date: new Date()
          }]
        });
        await newWallet.save();
      } else {

        await Wallet.findOneAndUpdate(
          { user: order.userId },
          {
            $inc: { balance: refundAmount }, 
            $push: {
              transactions: {
                transactionId: uuidv4(),
                description: `Refund for cancelled order #${order._id.toString().slice(0, 8)}`,
                amount: refundAmount,
                type: 'credit',
                status: 'completed',
                date: new Date()
              }
            }
          }
        );
      }

      console.log(`Refund of ${refundAmount} processed for user: ${order.userId}`);
    }


    await order.save()

   return res.status(200).json({
      success: true,
      message: 'Order cancelled successfully and refund processed (if applicable)',
      orderId: order._id,
    });

   } catch (error) {
    console.error('Error cancelling order:', error);
    return res.status(500).json({ success: false, message: 'Failed to cancel order' });
   }

}


const cancelProduct = async (req, res)=>{
  const {orderId, productId} = req.body


  try {

    const order = await Order.findById(orderId)

    if(!order){
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const productIndex = order.products.findIndex(
      (product)=> product.productId.toString() === productId
    )
    if(productIndex === -1){
      return res.status(404).json({ success: false, message: 'Product not found in order' });
    }

    const product = order.products[productIndex];
    const refundAmount = product.price * product.quantity;

    if(product.isCanceled){
      return res.status(400).json({message:'Product is already canceled'})
    }

    product.isCanceled = true

    if (order.paymentInfo === 'Wallet' || order.paymentInfo === 'razorpay' || order.paymentStatus === 'completed') {
      product.paymentStatus = 'refunded';
    }


    order.totalPrice = order.products.reduce(
      (total, product) => product.isCanceled ? total  : total + product.price * product.quantity,0
    )

    const allProductsCanceled = order.products.every((product) => product.isCanceled);

    if (allProductsCanceled) {
      order.status = 'cancelled'; 
    }

    await order.save()
    console.log('after cancell product',order);
    


    

    if (order.paymentInfo === 'Wallet' || order.paymentInfo === 'razorpay') {

      const user = await User.findById(order.userId); 
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const wallet = await Wallet.findOne({user:order.userId})

      

      if (!wallet) {
        const newWallet = new Wallet({
            user: order.userId,
            balance: refundAmount,
            transactions: [{
                transactionId: uuidv4(),
                description: `Refund for order #${order._id.toString().slice(0, 8)}`,
                amount: refundAmount,
                type: 'credit',
                status: 'completed',
                date: new Date()
            }]
        });
        await newWallet.save();
    } else {
        await Wallet.findOneAndUpdate(
            { user: order.userId },
            {
                $inc: { balance: refundAmount },
                $push: {
                    transactions: {
                        transactionId: uuidv4(),
                        description: `Refund for order #${order._id.toString().slice(0, 8)}`,
                        amount: refundAmount,
                        type: 'credit',
                        status: 'completed',
                        date: new Date()
                    }
                }
            }
        );
    }

    } 

    await order.save();
    

    if (order.paymentInfo === 'Wallet' || order.paymentInfo === 'razorpay') {
      return res.status(200).json({
        success: true,
        message: 'refund processed successfully',
        data: {
          refundAmount,
          orderId: order._id,
        },
      });
    } else {
      return res.status(200).json({
        success: true,
        message: 'Product canceled successfully',
        data: {
          orderId: order._id,
        },
      });
    }

    
  } catch (error) {
    console.error('Error canceling product:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  
  }
}









const rezorpayLoad = async (req, res)=>{
   const {amount, currency} = req.body
  console.log('razorpay',req.body);
  
   try {
    
     const options ={
       amount: amount * 100,
       currency: currency,
       receipt:`receipt_${Date.now()}`
     }

     const order = await razorpay.orders.create(options)
     console.log(order);
     
     res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID 
    });
     } catch (error) {
    console.error("Error creating Razorpay order:", error);
    res.status(500).json({ message: "Something went wrong!" });
   }

}






const varifyPayment =  async (req, res) => {
  try {
    console.log('nbnbn',req.body);
    
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      orderDetails
    } = req.body;

    const { address, paymentMethods, cartItems,cartSummary } = orderDetails;


    if ( !address || !paymentMethods || !cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");


  
      
    const products = [];
    for (const item of cartItems) {
      const productId = item.product?._id;
      const variantId = item.variant;

      if (!productId) {
        return res.status(400).json({ message: `Invalid product details in cart item: ${JSON.stringify(item)}` });
      }

      const product = await Product.findById(productId);

      if (!product || product.isDeleted) {
        return res.status(400).json({ message: `Product with ID ${productId} is not available for purchase.` });
      }

      const variant = product.variants.find(v => v._id.toString() === variantId);

      if (!variant) {
        return res.status(400).json({ message: `Variant with ID ${variantId} not found for product ${product._id}` });
      }

      if (variant.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for product: ${product.productName}` });
      }


      variant.stock -= item.quantity;
      product.salesCount = (product.salesCount || 0) + item.quantity;

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
        price: variant.salePrice || variant.regularPrice,
        totalPrice: (variant.salePrice || variant.regularPrice) * item.quantity,
      });
    }
       

    const { discount = 0, totalGST,subtotal ,total,gstRate , shippingCharge } = cartSummary || {};


    if (expectedSignature === razorpay_signature) {
      const newOrder = await Order.create({
        userId: req.user.id,
        subtotal:subtotal,
        gstRate:gstRate,
        gstAmount:totalGST,
        totalPrice:total,
        shippingAddressId:address._id,
        paymentInfo:paymentMethods,
        products: products.map(prodct=>({
          ...prodct,
          paymentStatus:'completed'
        })),
        status:'pending',
        paymentStatus:'completed',
        shippingCost: shippingCharge,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        discount:discount

      });
  
       const savedOrder  = await newOrder.save();
       console.log('save order',savedOrder);
       
      
      await Cart.deleteMany({user: req.user?.id})

     

      res.json({
         success: true,
         message: 'Payment verified successfully',
         savedOrder });
         
    } else {
      res.status(400).json({ success: false, message: 'Invalid signature' });
    }


  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
}







   const handleRepayment =  async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body;


    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generatedSignature = shasum.digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }


    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }


     order.paymentStatus='completed'

     if (Array.isArray(order.products)) {
      order.products.forEach(product => {
        product.paymentStatus='completed' 
      });
    }

    await order.save();

    res.status(200).json({ success: true, message: 'Payment processed successfully'});
  } catch (error) {
    console.error('Error verifying payment and updating order:', error);
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
}





const couponApply = async(req, res)=>{
  const {code, cartSummary} =req.body

  console.log('applay copon',code , cartSummary);
  

   if(!code || !cartSummary){
    return res.status(400).json({ success: false, message: 'Pleas Enter the Coupon code' });
   }
   try {

    const coupon = await Coupon.findOne({code})
    
    if(!coupon){
      return res.status(404).json({ success: false, message: 'Invalid coupon code' });
    }
    
    if(coupon.status !== 'Active'){
      return res.status(400).json({ success: false, message: 'Coupon is not active' });
    }
    console.log('copn',coupon);
    
    const currentDate = new Date()
    if(coupon.expiryDate < currentDate){
      return res.status(400).json({  message: 'Coupon has expired' });
    }

    if (cartSummary.totalPrice < coupon.minAmount) {
      return res.status(400).json({ 
        message: `Cart subtotal must be at least ₹${coupon.minAmount} to use this coupon` 
      });
    }
    
    

      const discount =  Math.floor((cartSummary.totalPrice * coupon.discount) / 100) ;
      const discountedTotal = Math.floor(cartSummary.totalPrice - discount);

     if(cartSummary.totalPrice > coupon.maxAmount){
      return res.status(400).json({ message: `Discount cannot exceed ₹${coupon.maxAmount}. Your discount is limited to ₹${coupon.maxAmount}`});
     }
   

     return res.status(200).json({
      success: true,
      discount,
      coupon,
      discountedTotal,
      message: 'Coupon applied successfully',
    });
    
   } catch (error) {
    console.error('Error applying coupon:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
   }
}





const returnController = async(req, res)=>{

  try {
    const { orderId, productId, variantId, reason } = req.body;
    const userId = req.user.id;

 console.log('return',req.body);
 
    const order = await Order.findOne({
      _id: orderId,
      userId: userId
    });

    if (!order) {
      return res.status(404).json({  message: 'Order not found' });
    }

    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Return can only be requested for delivered orders'  });
    }

    const productIndex = order.products.findIndex(
      product => 
        product.productId.toString() === productId && 
        product.variantId.toString() === variantId   
    );

    console.log('Product index:', productIndex);


    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found in order' });
    }

    if (order.products[productIndex]?.returnRequest) {
      return res.status(400).json({ message: 'Return request already exists for this product' });
    }

    order.products[productIndex].returnRequest = {
      reason: reason,
      status: 'pending',
      requestDate: new Date()
    };

    order.products[productIndex].paymentStatus = 'processing';


    const savedOrder = await order.save();
    console.log(order.products);
    
    res.status(200).json({
      success: true,
      message: 'Return request submitted successfully',
      returnRequest: savedOrder.products[productIndex].returnRequest
    });

    
  } catch (error) {
    console.error('Return request error:', error);
      res.status(500).json({ message: 'Error processing return request'});
    
  }
}




const invoiceDownLoad = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'fullName email')
      .populate('shippingAddressId')
      .populate({
        path: 'products.productId',
        select: 'name'
      });

    if (!order || order.isDeleted) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const doc = new PDFDocument({ 
      size: 'A4',
      margin: 0
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Invoice_${order._id}.pdf`);
    doc.pipe(res);

    const colors = {
      primary: '#1a237e',
      secondary: '#303f9f',
      accent: '#3949ab',
      text: '#263238',
      lightText: '#546e7a',
      border: '#e0e0e0',
      highlight: '#bbdefb'
    };

    const layout = {
      margin: 40,
      maxWidth: 515,
      lineHeight: 20,
      tableRowHeight: 25
    };

    // Header section
    doc.rect(0, 0, 595.28, 150)
       .fill(colors.primary);

    doc.font('Helvetica-Bold')
       .fontSize(28)
       .fillColor('white')
       .text('KBS BAKES', layout.margin, 50, {
         width: layout.maxWidth,
         align: 'center'
       });

    doc.fontSize(16)
       .fillColor(colors.highlight)
       .text('Tax Invoice', layout.margin, 90, {
         width: layout.maxWidth,
         align: 'center'
       });

    // Details section with proper alignment
    const detailsStartY = 180;
    const columnWidth = (595.28 - (layout.margin * 2)) / 2;

    // Left column - Billing & Shipping info
    doc.rect(layout.margin - 10, detailsStartY - 10, columnWidth - 20, 160)
       .fill(colors.highlight);

    // Billing Details
    doc.fillColor(colors.primary)
       .font('Helvetica-Bold')
       .fontSize(12)
       .text('BILL TO', layout.margin, detailsStartY);

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(colors.text)
       .text(order.userId.fullName, layout.margin, detailsStartY + 20)
       .text(order.userId.email, layout.margin, detailsStartY + 35);

    // Shipping Details
    doc.fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text('SHIP TO', layout.margin, detailsStartY + 65);

    const address = order.shippingAddressId;
    doc.font('Helvetica')
       .fillColor(colors.text)
       .text([
         address.address,
         `${address.city}, ${address.state}`,
         address.pincode
       ].filter(Boolean).join('\n'), layout.margin, detailsStartY + 85);

    // Right column - Invoice details
    const rightColumnX = layout.margin + columnWidth + 20;
    doc.rect(rightColumnX - 10, detailsStartY - 10, columnWidth - 20, 160)
       .fill(colors.highlight);

    doc.fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text('INVOICE DETAILS', rightColumnX, detailsStartY);

    doc.font('Helvetica')
       .fillColor(colors.text)
       .text(`Invoice No: INV-${order._id.toString().slice(-6)}`, rightColumnX, detailsStartY + 20)
       .text(`Date: ${new Date(order.orderDate).toLocaleDateString()}`, rightColumnX, detailsStartY + 35)
       .text(`Due Date: ${new Date().toLocaleDateString()}`, rightColumnX, detailsStartY + 50);

    // Items table with improved alignment
    const tableTop = 380;
    const tableWidth = 515;
    const columns = [
      { name: 'Item Description', width: 240, align: 'left' },
      { name: 'Quantity', width: 70, align: 'center' },
      { name: 'Price', width: 100, align: 'right' },
      { name: 'Amount', width: 105, align: 'right' }
    ];

    // Table header
    doc.rect(layout.margin - 10, tableTop - 10, tableWidth + 20, 30)
       .fill(colors.primary);

    let currentX = layout.margin;
    columns.forEach(column => {
      doc.fillColor('white')
         .font('Helvetica-Bold')
         .fontSize(10)
         .text(column.name, currentX, tableTop + 5, {
           width: column.width,
           align: column.align
         });
      currentX += column.width;
    });

    // Table content
    let currentY = tableTop + 40;
    order.products.forEach((item, index) => {
      if (!item.isCanceled) {
        if (index % 2 === 0) {
          doc.rect(layout.margin - 10, currentY - 5, tableWidth + 20, layout.tableRowHeight)
             .fill(colors.highlight);
        }

        currentX = layout.margin;
        doc.fillColor(colors.text)
           .font('Helvetica')
           .fontSize(10);

        // Product name
        doc.text(item.productId.name, currentX, currentY, {
          width: columns[0].width,
          align: 'left'
        });
        currentX += columns[0].width;

        // Quantity
        doc.text(item.quantity.toString(), currentX, currentY, {
          width: columns[1].width,
          align: 'center'
        });
        currentX += columns[1].width;

        // Price
        doc.text(`₹${item.price.toFixed(2)}`, currentX, currentY, {
          width: columns[2].width,
          align: 'right'
        });
        currentX += columns[2].width;

        // Total amount
        doc.text(`₹${(item.quantity * item.price).toFixed(2)}`, currentX, currentY, {
          width: columns[3].width,
          align: 'right'
        });

        currentY += layout.tableRowHeight;
      }
    });

    // Summary section with improved alignment
    currentY += 30;
    const summaryWidth = 250;
    const summaryX = 595.28 - layout.margin - summaryWidth;
    
    doc.rect(summaryX - 10, currentY - 10, summaryWidth + 20, 150)
       .fill(colors.highlight);

    const summaryItems = [
      { label: 'Subtotal:', value: `₹${order.subtotal.toFixed(2)}` },
      { label: 'GST:', value: `₹${order.gstAmount.toFixed(2)} (${order.gstRate}%)` },
      ...(order.discount ? [{ label: 'Discount:', value: `-₹${order.discount.toFixed(2)}` }] : []),
      ...(order.shippingCost ? [{ label: 'Shipping:', value: `₹${order.shippingCost.toFixed(2)}` }] : []),
      { label: 'Total Amount:', value: `₹${order.totalPrice.toFixed(2)}`, bold: true }
    ];

    summaryItems.forEach((item, index) => {
      doc.font(item.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fillColor(item.bold ? colors.primary : colors.text)
         .fontSize(10);


      doc.text(item.label, summaryX, currentY + (index * layout.lineHeight), {
        width: 100,
        align: 'left'
      });


      doc.text(item.value, summaryX + 100, currentY + (index * layout.lineHeight), {
        width: 140,
        align: 'right'
      });
    });


    const paymentY = currentY + (summaryItems.length * layout.lineHeight) + 20;
    doc.fillColor(colors.primary)
       .font('Helvetica-Bold')
       .text('Payment Information', layout.margin, paymentY);

    doc.font('Helvetica')
       .fillColor(colors.text)
       .text(`Status: ${order.paymentStatus.toUpperCase()}`, layout.margin, paymentY + layout.lineHeight)
       .text(`Method: ${order.paymentInfo}`, layout.margin, paymentY + (layout.lineHeight * 2));

    // Footer
    const footerY = 750;
    doc.rect(0, footerY - 10, 595.28, 100)
       .fill(colors.primary);

    doc.fillColor('white')
       .fontSize(10)
       .font('Helvetica-Bold')
       .text('Thank you for your business!', 0, footerY + 15, {
         width: 595.28,
         align: 'center'
       });

    doc.fontSize(8)
       .font('Helvetica')
       .text('This is a computer-generated invoice and needs no signature.', 0, footerY + 35, {
         width: 595.28,
         align: 'center'
       });

    doc.end();

  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ message: 'Error generating invoice' });
  }
};


module.exports = { 
  placeOrder,
  getAllOrders,
  cancelOrder,
  cancelProduct,
  rezorpayLoad,
  handleRepayment,
  handleFailedPayment,
  varifyPayment,
  couponApply,
  getOrderDetails,
  returnController,
  invoiceDownLoad
};
