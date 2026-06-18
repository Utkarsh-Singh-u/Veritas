import crypto from "crypto";
import { asyncHandler } from "../utils/asyncHandler.js";
import { setOtp, checkAndVerifyOtp } from "../utils/otpStore.js";
import { sendOtpEmail } from "../utils/mailer.js";
import { User } from "../models/user.model.js";

// Generate a 6-digit OTP
const generateOtp = () => {
  return crypto.randomInt(100000, 999999).toString();
};

export const sendOtp = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "A valid email is required." });
    }

    // Check if a user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered." });
    }

    const otp = generateOtp();
    setOtp(email, otp);

    await sendOtpEmail(email, otp);

    return res.status(200).json({ message: "OTP sent to your email." });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ message: "Failed to send OTP. Please try again." });
  }
});

export const verifyOtp = asyncHandler(async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required." });
    }

    const result = checkAndVerifyOtp(email, otp);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    return res.status(200).json({ message: "Email verified successfully.", verified: true });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return res.status(500).json({ message: "Verification failed. Please try again." });
  }
});
