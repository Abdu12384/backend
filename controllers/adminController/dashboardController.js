const mongoose = require('mongoose')
const Order = require('../../model/orderModel')
const Product = require('../../model/productModal')
const Category = require('../../model/category')



const getDashboardData = async (req, res) => {
  const {period} = req.query

  try {
      console.log(period);
      let startDate = new Date();
      const currentDate = new Date();
  
      if (period === 'Monthly') {
        startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      } else if (period === 'Yearly') {
        startDate = new Date(currentDate.getFullYear(), 0, 1);
      } else {
        startDate = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
  
      const matchCondition = { createdAt: { $gte: startDate } };

    const stats = await Order.aggregate([
      {$match: matchCondition},
      {
        $group:{
          _id:null,
          totalRevenue:{$sum:'$totalPrice'},
          totalOrders: {$sum:1}
        }
      },
      {
        $project:{
          _id: 0,
          totalRevenue: 1,
          totalOrders: 1
        }
      }
    ])

    const bestSellingProducts = await Product.aggregate([
      {
        $match:{
          createdAt: {$gte: startDate}
        }
      },
      {
        $sort:{ salesCount: -1}
      },
      {
        $limit: 5
      },
      {
        $project:{
          productName: 1,
          images:1,
          salesCount:1
        } 
      }
    ])
    

    const topCategories = await Category.aggregate([
      {
        $match:{
          createdAt:{$gte: startDate}
        }
      },
      {
        $sort:{salesCount: -1}
      },
      {
        $limit: 5
      },
      {
        $project:{
          name:1,
          salesCount:1
        }
      }

    ])



    const dashboardData = {
      stats: stats[0] || { totalRevenue: 0, totalOrders: 0, totalExpenses: 0 },
      bestSellingProducts,
      topCategories
    };

 console.log(dashboardData)
 

    res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: dashboardData,
    });

  
    
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard data",
      error: error.message,
    });

  }
}





const chartData = async (req, res) => {
  const { period } = req.query;

  try {
    let startDate;
    const currentDate = new Date();


    if (period === 'Monthly') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    } else if (period === 'Yearly') {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
    } else {

      const dayOfWeek = currentDate.getDay();
      startDate = new Date(currentDate.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
    }


    const chartData = await Order.aggregate([
      { $match: { createdAt: { $gte: startDate } } }, 
      {
        $group: {
          _id: {
            year: { $year: { date: '$createdAt', timezone: 'Asia/Kolkata' } },
            ...(period === 'Yearly' ? {} : { month: { $month: { date: '$createdAt', timezone: 'Asia/Kolkata' } } }),
            ...(period === 'Weekly' ? { week: { $week: { date: '$createdAt', timezone: 'Asia/Kolkata' } } } : {}),
          },
          revenue: { $sum: '$totalPrice' },
          expenses: { $sum: '$totalExpenses' }, 
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 }, 
      },
      {
        $project: {
          name: {
            $concat: [
              period === 'Yearly'
                ? { $toString: '$_id.year' }
                : period === 'Monthly'
                ? {
                    $concat: [
                      { $arrayElemAt: ['Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' '), { $subtract: ['$_id.month', 1] }] },
                      ' ',
                      { $toString: '$_id.year' },
                    ],
                  }
                : {
                    $concat: ['Week ', { $toString: '$_id.week' }, ' ', { $toString: '$_id.year' }],
                  },
            ],
          },
          revenue: 1,
          expenses: 1,
        },
      },
    ]);

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