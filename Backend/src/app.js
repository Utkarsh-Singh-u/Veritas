import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app=express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174","http://127.0.0.1:8000"],
    credentials:true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static("public"));
app.use(cookieParser());

import UserRouter from "./routes/user.routes.js";
import AiServiceRouter from "./routes/aiService.routes.js"

app.use("/api/v1/user",UserRouter);
app.use("/api/v1/ai-service",AiServiceRouter);


export {app};


