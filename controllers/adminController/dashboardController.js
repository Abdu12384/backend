const mongoose = require('mongoose')
const Order = require('../../model/orderModel')
const Product = require('../../model/productModal')
const Category = require('../../model/category')




const getDashboardData = async (req, res) => {
  const { period = 'Monthly' } = req.query;

  try {
    const periodMap = {
      'Monthly': () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      'Yearly': () => new Date(new Date().getFullYear(), 0, 1),
      'Weekly': () => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    };

    const startDate = periodMap[period] ? periodMap[period]() : new Date(0);
    const matchCondition = { 
      orderDate: { $gte: startDate },
      isDeleted: false 
    };


    const bestSellingProducts = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: '$products' },
      { $match: { 'products.isCanceled': false } },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
              }
            },
            { $unwind: '$categoryDetails' }
          ],
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$products.productId',
          totalQuantitySold: { $sum: '$products.quantity' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
          productName: { $first: '$productDetails.productName' },
          productImage: { $first: '$productDetails.images' },
          categoryName: { $first: '$productDetails.categoryDetails.name' }
        }
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: 5 }
    ]);


    const topCategories = await Order.aggregate([
      { $match: matchCondition },
      { $unwind: '$products' },
      { $match: { 'products.isCanceled': false } },
      {
        $lookup: {
          from: 'products',
          localField: 'products.productId',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDetails'
              }
            },
            { $unwind: '$categoryDetails' }
          ],
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.categoryDetails._id',
          categoryName: { $first: '$productDetails.categoryDetails.name' },
          totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
          totalQuantitySold: { $sum: '$products.quantity' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 }
    ]);


    const stats = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalPrice' },
          totalDiscount: { $sum: '$discount' }
        }
      }
    ]);

    const dashboardData = {
      period,
      stats: stats[0] || {
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        totalDiscount: 0
      },
      bestSellingProducts,
      topCategories
    };

    res.status(200).json({
      success: true,
      message: "Dashboard data generated successfully",
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate dashboard data",
      error: error.message
    });
  }
};




const chartData = async (req, res) => {
  console.log(`chartData is running with period=${req.query.period}`); 
  const { period = 'Monthly' } = req.query; 

  try {
    let startDate;
    const currentDate = new Date();

    
    if (period === 'Monthly') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    } else if (period === 'Yearly') {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
    } else if (period === 'Weekly') {
      const dayOfWeek = currentDate.getDay(); 
      startDate = new Date(currentDate.getTime() - dayOfWeek * 24 * 60 * 60 * 1000); 
    } else {
      return res.status(400).json({ message: 'Invalid period specified' });
    }

   
    const chartData = await Order.aggregate([
      
      { $match: { createdAt: { $gte: startDate } } },
      {
       
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
            ...(period === 'Monthly'
              ? { month: { $month: { date: '$createdAt', timezone: 'Asia/Kolkata' } } }
              : {}),
            ...(period === 'Weekly'
              ? {
                  dayOfWeek: { $dayOfWeek: { date: '$createdAt', timezone: 'Asia/Kolkata' } }, 
                }
              : {}),
          },
          revenue: { $sum: '$totalPrice' },
        },
      },
      {
        
        $sort: {
          '_id.year': 1,
          ...(period === 'Monthly' ? { '_id.month': 1 } : {}),
          ...(period === 'Weekly' ? { '_id.dayOfWeek': 1 } : {}),
        },
      },
      {
        
        $project: {
          name: {
            $cond: [
              { $eq: [period, 'Yearly'] },
              { $toString: '$_id.year' },
              {
                $cond: [
                  { $eq: [period, 'Monthly'] },
                  {
                    $concat: [
                      {
                        $arrayElemAt: [
                          'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '),
                          { $subtract: ['$_id.month', 1] },
                        ],
                      },
                      ' ',
                      { $toString: '$_id.year' },
                    ],
                  },
                  {
                   
                    $arrayElemAt: [
                      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                      { $subtract: ['$_id.dayOfWeek', 1] },
                    ],
                  },
                ],
              },
            ],
          },
          revenue: 1,
        },
      },
    ]);

    console.log(`chartData is returning ${chartData.length} records`); 
    res.status(200).json(chartData);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ message: 'Failed to fetch chart data', error: error.message });
  }
};






module.exports={
  getDashboardData,
  chartData
}