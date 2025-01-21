const Product = require('../../model/productModal')
const Category = require('../../model/category');  



const addProduct = async (req,res)=>{{
     
  const {productName,
         category,
         weight,
         description,
         images,
         variants,
         type
         }=req.body

  

         
        try {

          const existingProduct = await Product.findOne({ productName });
          if (existingProduct) {
            return res.status(400).json({ message: 'Product already exists. Duplicate entries are not allowed.' });
          }

          const updatedVariants = variants.map((variant) => ({
            ...variant,
            salePrice: variant.regularPrice, 
          }));
            const totalStock = updatedVariants.reduce((total, variant) => total + variant.stock, 0);


           
                const newProduct = new Product({
                      productName,
                      category,
                      weight,
                      description,
                      images,
                      variants:updatedVariants,
                      type
                    })

              await newProduct.save() 
 
              const updatedCategory = await Category.findByIdAndUpdate(
                category,
                {$inc:{stock:totalStock}},
                {new:true}
              )

          res.status(200).json({message:'Poduct Added successfully'})

        } catch (error) {
          console.error('Prodct update failed Server error',error)
          
        }      
        
}}

  const showProduct = async (req,res)=>{

     
     try {
      const { 
          page = 1, 
          limit = 5,
          search = '',
          status = 'All'
      } = req.query;

      const query = {};
      
      if (search) {
          query.$or = [
              { productName: { $regex: search, $options: 'i' } },
              { 'variants.name': { $regex: search, $options: 'i' } }
          ];
      }

      if (status !== 'All') {
          switch (status) {
              case 'Active':
                  query.isDeleted = false;
                  query.$or = [
                      { qty: { $gt: 0 } },
                      { 'variants.stock': { $gt: 0 } }
                  ];
                  break;
              case 'Blocked':
                  query.$or = [
                      { isDeleted: true },
                      { 
                          $and: [
                              { qty: { $eq: 0 } },
                              { 'variants.stock': { $eq: 0 } }
                          ]
                      }
                  ];
                  break;
              case 'Available':
                  query.isDeleted = false;
                  query.$or = [
                      { qty: { $gt: 0 } },
                      { 'variants.stock': { $gt: 0 } }
                  ];
                  break;
              case 'Unavailable':
                  query.$or = [
                      { isDeleted: true },
                      { 
                          $and: [
                              { qty: { $eq: 0 } },
                              { 'variants.stock': { $eq: 0 } }
                          ]
                      }
                  ];
                  break;
          }
      }

      const skip = (page - 1) * limit;

      const [products, total] = await Promise.all([
          Product.find(query)
              .skip(skip)
              .limit(parseInt(limit))
              .sort({ createdAt: -1 })
              .populate('category', 'name'),
          Product.countDocuments(query)
      ]);

      res.json({
          products,
          pagination: {
              total,
              pages: Math.ceil(total / limit),
              currentPage: parseInt(page),
              limit: parseInt(limit)
          }
      });

       } catch (error) {
         res.status(500).json({message:'Failed to fetch Product'})
       }
  }



  

   const EditProduct = async (req,res)=>{     
       try {

   
        const productId = req.params.id
        const updatedData =req.body

      
        // const productData = req.body

      
       
       if (updatedData.variants) {
        updatedData.variant = updatedData.variants.map(variant => {
          if (variant.regularPrice && variant.discount) {
            const salePrice = variant.regularPrice - (variant.regularPrice * variant.discount) / 100;
            return { ...variant, salePrice };
          }
          return variant;
        });
        
      }

        
        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          {$set:updatedData },
          {new:true, runValidators:true}
        )

       
        if(!updatedProduct){
          return res.status(404).json({error:"Product not found"})
        }
  
        res.status(200).json({message:"Product updated Successfully"})      
       } catch (error) {
        console.error("Error updating product:",error)
        res.status(500).json({error:"Product update failed"})
       }


   }

   const softDelete= async(req,res)=>{
      const {id} = req.params
      const {isDeleted} = req.body

      try {
        const updatedProudct = await Product.findByIdAndUpdate(
          id,
          {isDeleted},
          {new: true}
        )

        if(!updatedProudct){
          return res.status(404).json({error:'Poduct not found'})
        }
        res.status(200).json(updatedProudct)
      } catch (error) {
        console.error('Error updating product:',error)
        res.status(500).json({error:'Failed to update product'})
      }
   }




   const addProductOffer = async(req, res)=>{
   
    try {

 
      const { offerData} = req.body
      const {offerName, offerPercentage, startDate, endDate} = offerData
      const productId = req.params.id


      if (!offerName || offerPercentage < 0 || offerPercentage > 100 || !startDate || !endDate) {
        return res.status(400).json({ message: 'Invalid offer data' });
      }

      const product = await Product.findById(productId)

      if(!product){
        return res.status(404).json({ message: 'Product not found' });
      }

      product.variants.forEach(variant => {
        const discountAmount = (variant.regularPrice * offerPercentage) / 100
        variant.salePrice = Math.round(variant.regularPrice - discountAmount)
      })
      
      product.offer = {
        offerName,
        offerPercentage,
        startDate,
        endDate,
      }
      
      await product.save()
      res.status(200).json({ message: 'Offer added successfully', product });

    } catch (error) {
      console.error('Error adding offer:', error);
      res.status(500).json({ message: 'Failed to add offer' });
    }
       
   }



   const removeProductOffer = async (req, res)=>{
     try {

      const productId = req.params.id

      
  const product = await Product.findById(productId);
    
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.variants.forEach(variant => {
      variant.salePrice = variant.regularPrice; 
    });


    product.offer = null; 

    const updatedProduct = await product.save();



     res.status(200).json({ message: 'Offer removed successfully', product: updatedProduct });

     } catch (error) {
      console.error('Error removing offer:', error);
      res.status(500).json({ message: 'Internal server error' });
     }
   }



module.exports={
   addProduct,
   showProduct,
   EditProduct,
   softDelete,
   addProductOffer,
   removeProductOffer
}