// In-memory OTP store: email -> { otp, expiresAt, verified }
// OTPs expire after 10 minutes
const otpStore = new Map();

export const setOtp = (email, otp) => {
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    verified: false,
  });
};

export const checkAndVerifyOtp = (email, otp) => {
  const key = email.toLowerCase();
  const entry = otpStore.get(key);
  if (!entry) {
    return { success: false, message: "OTP not found. Please request a new one." };
  }
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(key);
    return { success: false, message: "OTP has expired. Please request a new one." };
  }
  if (entry.otp !== otp) {
    return { success: false, message: "Invalid OTP. Please try again." };
  }
  // Mark as verified
  entry.verified = true;
  return { success: true };
};

export const isEmailVerified = (email) => {
  const entry = otpStore.get(email.toLowerCase());
  return !!(entry && entry.verified);
};

export const clearOtp = (email) => {
  otpStore.delete(email.toLowerCase());
};
