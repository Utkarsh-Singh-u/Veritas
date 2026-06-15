import express from "express";
import cors from "cors";
// import cookieParser from "cookieParser";

const app=express();

app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credential:true
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended:true }));
app.use(express.static("public"));
// app.use(cookieParser());

import UserRouter from "./routes/user.routes.js"

app.use("/api/v1/user",UserRouter);


export {app};


