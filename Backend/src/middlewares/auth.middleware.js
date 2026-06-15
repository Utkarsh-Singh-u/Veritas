import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyJWT =asyncHandler( async (req, res, next) => {
  const gettoken =
    req.cookies?.accessToken || req.headers.authorization?.split(" ")[1];
  if (!gettoken || gettoken.split(".").length !== 3) {
    return res.status(401).json({ message: "Unauthorized request: No token provided" });
  }

  try {
    const decodedToken = jwt.verify(gettoken, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select(
      "email"
    );
 
    if (!user) {
      return res.status(401).json({ message: "Invalid Access Token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: error?.message || "Invalid access token" });
  }
});

export { verifyJWT };