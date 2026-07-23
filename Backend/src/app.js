import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dns from 'node:dns';

// Force Node.js to use IPv4 over IPv6 to prevent ENETUNREACH errors on Render
dns.setDefaultResultOrder('ipv4first');

const app=express();

// app.use(
//   cors({
//     origin: ["http://localhost:5173", "http://localhost:5174","http://127.0.0.1:8000"],
//     credentials:true
//   })
// );
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:8000",
  "https://deep-fake-d.vercel.app"
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.startsWith("chrome-extension://") || origin.endsWith("-utkarsh-singh-us-projects.vercel.app")) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static("public"));
app.use(cookieParser());

import UserRouter from "./routes/user.routes.js";
import AiServiceRouter from "./routes/aiService.routes.js"
import PaymentRouter from "./routes/payment.routes.js";
import OtpRouter from "./routes/otp.routes.js";

app.use("/api/v1/user",UserRouter);
app.use("/api/v1/ai-service",AiServiceRouter);
app.use("/api/v1/billing", PaymentRouter);
app.use("/api/v1/otp", OtpRouter);


export {app};


