
const Category = require('../../model/category');
const Product = require('../../model/productModal')
const cron = require('node-cron');

const addCategory = async (req, res) => {
  try {
    
    const { name, description } = req.body;
   
    const existsCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') }
   });

     if(existsCategory){
       return res.status(400).json({message:"Categroy already exists"})
     }
     if(!description){
      return res.status(400).json({message:'Description is required.'})
     }

    const category = new Category({ name, description });

    
    await category.save();

    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const  fetchCategory = async(req, res)=>{
  
   try {

     const  Categories = await Category.find({})

     if(!Categories||Categories.length === 0){
      res.status(404).json({message:"Categories Not Fount "})
     }

     res.status(200).json(Categories)
    
   } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({message:"Server Error While Fetching Categorys"})
   }



}



 const editCategory = async(req, res)=>{

  try {
  
   const {id} = req.params
    const {name, description} = req.body
    const category = await Category.findByIdAndUpdate(
       id,
       {name,description},
       {new: true}
    )
   if(!category){
    return res.status(404).json({ message: 'Category not found' });
  }
  res.status(200).json({ message: 'Category updated successfully!',category });
 
} catch (error) {
  res.status(500).json({ message: 'Error updating category' });

}

 }





const softDeleteCategory = async(req,res)=>{

     const id = req.params.id

     const{isDeleted}= req.body

     try {
      const category = await Category.findByIdAndUpdate(
        id,
        {isDeleted},
        {new:true}
      )

      

      res.status(200).json(category)
      
     } catch (error) {
      console.error("Error in Categroy delete",error)
      res.status(500).json({message:"Server Error Block Category"})
     }
     
}




const addOfferCatogory = async (req, res)=>{
  const { categoryId } = req.params;
  const { offerName, offerPercentage, startDate, endDate } = req.body;

  try {

    const category = await Category.findById(categoryId);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }


    if (category.offer) {
      const existingOfferEndDate = new Date(category.offer.endDate);
      const currentDate = new Date();


      if (existingOfferEndDate > currentDate) {
        return res.status(400).json({ message: 'An offer has already been applied and is still valid.' });
      }
    }


    category.offer = {
      offerName,
      offerPercentage,
      startDate,
      endDate,
    };

    const products = await Product.find({category:categoryId})


    for(const product of products){
 
      product.variants.forEach(variant =>{
        const variantRegularPrice = variant.regularPrice
        

        const newDiscountAmount = (offerPercentage/100) * variantRegularPrice
        const newSalePrice = variantRegularPrice - newDiscountAmount

        const productOffer = product.offer
        if(productOffer){
          const existingDiscountAmount = (productOffer.offerPercentage / 100) * variantRegularPrice
          const existingSalePrice = variantRegularPrice - existingDiscountAmount

           if(newSalePrice < existingSalePrice){
             variant.salePrice = newSalePrice
             product.offer={
              offerName,
              offerPercentage,
              startDate,
              endDate
             }

           }else{
             variant.salePrice = existingSalePrice
           }
        } else{
          variant.salePrice = newSalePrice
          product.offer = {
            offerName,
            offerPercentage,
            startDate,
            endDate
          }
        }
      })

      await product.save()

    }

    const updatedCategory = await category.save(); 

    res.status(200).json({ message: 'Category offer applied successfully', updatedCategory });
  } catch (error) {
    console.error('Error adding offer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}



cron.schedule('0 0 * * *', async () => {
  try {
    const currentDate = new Date();

    const categories = await Category.find({ 'offer.endDate': { $lt: currentDate } });

    for (const category of categories) {

      category.offer = null;

      const products = await Product.find({ category: category._id });

      for (const product of products) {

        product.variants.forEach((variant) => {
          variant.salePrice = variant.regularPrice;
        });

        product.offer = null;

        await product.save();
      }
      await category.save();
    }

    console.log('Expired offers removed successfully.');
  } catch (error) {
    console.error('Error removing expired offers:', error);
  }
});



const removeCategoryOffer = async (req, res)=>{
  try {
    const categoryId = req.params.id;


    const category = await Category.findById(categoryId);
    
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    category.offer = null;

    const products = await Product.find({ category: categoryId });


    for (const product of products) {
      product.offer = null; 
      product.variants.forEach(variant => {
        variant.salePrice = variant.regularPrice; 
      });
      await product.save(); 
    }

    const updatedCategory = await category.save();


    res.status(200).json({ message: 'Offer removed successfully', category: updatedCategory });
  } catch (error) {
    console.error('Error removing offer:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}


module.exports = { 
  addCategory ,
  fetchCategory,
  editCategory,
  addOfferCatogory,
  softDeleteCategory,
  removeCategoryOffer
};
