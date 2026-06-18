import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema= new mongoose.Schema(
  {
    fullname:{
      type:String,
      required:true,
      trim:true
    },
    email:{
      type:String,
      required:true,
      unique: true,
      validate:{
        validator: function(value){
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"]
    },
    apiKey: {
        type: String,
        default:null,
        unique:true,
        sparse:true
    },
    apiUsageCount: {
        type:Number,
        default:0
    },
    apiLimit:{
        type:Number,
        default:100
    },
    paymentHistory: [
      {
        paymentProvider: {
          type: String,
          default: "razorpay"
        },
        razorpayOrderId: {
          type: String,
          default: null
        },
        razorpayPaymentId: {
          type: String,
          default: null
        },
        razorpaySignature: {
          type: String,
          default: null
        },
        packageId: {
          type: String,
          required: true
        },
        packageName: {
          type: String,
          required: true
        },
        creditsPurchased: {
          type: Number,
          required: true
        },
        amount: {
          type: Number,
          required: true
        },
        currency: {
          type: String,
          default: "usd"
        },
        status: {
          type: String,
          default: "paid"
        },
        purchasedAt: {
          type: Date,
          default: Date.now
        },
        apiLimitBefore: {
          type: Number,
          required: true
        },
        apiLimitAfter: {
          type: Number,
          required: true
        }
      }
    ],
    refreshToken:{
      type:String,

    }
  },
  {timestamps:true}
)

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFERESH_TOKEN_SECRET,
    { expiresIn: process.env.REFERESH_TOKEN_EXPIRY }
  );
};


export const User=mongoose.model("User",userSchema);