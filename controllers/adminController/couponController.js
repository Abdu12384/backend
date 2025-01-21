const Coupon = require('../../model/couponModel')


const addCoupon = async (req, res)=>{
  try {
    const {code, discount, minAmount, maxAmount, expiryDate} = req.body

  
  const existingCoupon = await Coupon.findOne({ code });
  if (existingCoupon) {
    return res.status(400).json({ message: 'Coupon code already exists' });
  }
    const coupon = new Coupon({
      code,
      discount,
      minAmount,
      maxAmount,
      expiryDate
    })

    await coupon.save()
    res.status(201).json({ message: 'Coupon added successfully', coupon });
  } catch (error) {
    res.status(400).json({ error: 'Failed to add coupon' });
  }
}

const getAllCoupons = async (req, res)=>{
  try {
     const coupon = await Coupon.find()
     res.status(200).json(coupon)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
}


const deleteCoupon = async (req, res) =>{
   try {
     const {couponId} = req.params

     
     const coupon = await Coupon.findByIdAndDelete(couponId)
 
     if (!coupon) return res.status(404).json({ error: 'Coupon not found' });
 
     res.status(200).json({ message: 'Coupon deleted successfully' });

   } catch (error) {
    res.status(500).json({ error: 'Failed to delete coupon' });

   }
}





module.exports={
  addCoupon,
  getAllCoupons,
  deleteCoupon
}