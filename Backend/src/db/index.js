import mongoose from "mongoose";

const DB_NAME="DeepFake"

const connectDB=async () => {
  try{
    const ConnectionInstance=await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}`);
    console.log(`MongoDB connected! ${ConnectionInstance.connection.host}`);
  }catch(error){
    console.log(`MongoDB Connection Eror: ${error.message}`);
    process.exit(1);
  }
}

export default connectDB;