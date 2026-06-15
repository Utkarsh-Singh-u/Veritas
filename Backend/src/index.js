import { app } from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

const PORT=process.env.PORT || 3001;

connectDB()
.then(()=>{
  app.listen(PORT,()=>{
    console.log(`serveris running on PORT ${process.env.PORT}`);
  });
})
.catch((err)=>{
  console.log("MongoDB connection error", err);
})