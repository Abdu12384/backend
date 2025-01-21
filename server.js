const express = require('express')
const app = express()
const cors = require('cors')
const dotenv = require('dotenv')
const cookieParser = require('cookie-parser')
const connectDB = require('./config/db')


dotenv.config()



app.use(express.json())
app.use(cookieParser())

app.use(cors({
  origin:process.env.CLIENT_URL,
  credentials:true
}))

connectDB()

app.get('/',(req,res)=>{
  res.send("MongoDb is connnected")
})

const authRoute  = require('./routes/authRoute')
const adminRoute = require('./routes/adminRoute')
const userRoute =  require('./routes/userRoute')



app.use('/auth',authRoute)
app.use('/admin',adminRoute)
app.use('/user',userRoute)



const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`Server running Successfully`))

