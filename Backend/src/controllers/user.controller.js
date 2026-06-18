import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import crypto from "crypto";
import { isEmailVerified, clearOtp } from "../utils/otpStore.js";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({message:"User Not Found"});
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save();

    return { accessToken, refreshToken };
  } catch (error) {
    return res.status(400).json({message:error});
  }
};

const registerUser = asyncHandler(async (req,res)=>{
  try{
    const {fullname,email,password} = req.body;
    if([fullname, email, password].some((field)=> !field || field.trim() === "")){
      return res.status(400).json({message:"All fields are required"});
    }
    const existedUser=await User.findOne({email});
    
    if(existedUser){
      return res.status(409).json({message:"User Already Existed"});
    }
    // Ensure the email was verified via OTP before registration
    if (!isEmailVerified(email)) {
      return res.status(403).json({ message: "Email not verified. Please verify your email with OTP first." });
    }
    const newApiKey = `df_live_${crypto.randomBytes(24).toString("hex")}`;
    const createUser =await User.create({
      fullname,
      email,
      password,
      apiKey: newApiKey
    })
    // OTP served its purpose — clean it up
    clearOtp(email);
    
    const createdUser=await User.findById(createUser._id).select("-password");
    if(!createdUser){
      return res.status(409).json({message:"Error in registering User"});
    }
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      createdUser._id
    );
    

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };
    return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        { status:"201",
          user: createdUser, accessToken, refreshToken,
          message:"user registered and logged in successfully"
        }
      );
  }catch(err){
    res.status(500).json({message:"Error in registering User", message2:err.message});
  }
})

const loginUser = asyncHandler(async (req,res)=>{
  try{
    // console.log("1");
    const {email,password} = req.body;
    // console.log("2");
    if([email, password].some((field)=> field?.trim()==="")){
      return res.status(400).json({message:"All fields are required"});
    }
    // console.log("3");
    const user=await User.findOne({email});
    // console.log("4");
    if(!user){
      return res.status(401).json({message:"User Not Existed."});
    }
    // console.log("5");
    const isPasswordValid= await user.isPasswordCorrect(password);
    // console.log("6");
    if(!isPasswordValid){
      return res.status(401).json({message:"Invalid user credentials"});
    }
    // console.log("7");
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    // console.log("8");
    const loggedInUser= await User.findById(user._id).select("-password");
    // console.log("9");
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" ? true : false,
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
    };
    // console.log("10");
    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        { status:"200",
          user: loggedInUser, accessToken, refreshToken,
          message:"user logged in successfully"
        }
      );
  }catch(err){
    res.status(500).json({message: "Error in login User", message2: err.message});
  }
})

const logoutUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: { refreshToken: "" },
    },
    { new: true }
  );
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax"
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json({ status:"201",
          message:"user loggged out successfully"
        });
});

const generateApiKey =asyncHandler( async (req, res) => {
    try {
        const userId = req.user?._id; 
        const newApiKey = `Veritas_API_${crypto.randomBytes(24).toString("hex")}`;
        const user = await User.findByIdAndUpdate(
            userId,
            { apiKey: newApiKey },
            { new: true }
        ).select("-password -refreshToken");
        return res.status(200).json({
            message: "API Key updated successfully",
            apiKey: newApiKey,
            user
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json({
    user: req.user,
  });
});

export {loginUser,logoutUser,registerUser,generateApiKey,getCurrentUser};
