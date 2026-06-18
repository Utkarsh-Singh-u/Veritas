import crypto from "crypto";
import Razorpay from "razorpay";
import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const BILLING_PACKAGES = [
  {
    id: "starter",
    title: "Starter Pack",
    credits: 1000,
    amountInPaise: 49900,
    currency: "INR",
  },
  {
    id: "growth",
    title: "Growth Pack",
    credits: 5000,
    amountInPaise: 199900,
    currency: "INR",
  },
  {
    id: "scale",
    title: "Scale Pack",
    credits: 12000,
    amountInPaise: 449900,
    currency: "INR",
  },
];

const BILLING_PACKAGE_MAP = new Map(
  BILLING_PACKAGES.map((billingPackage) => [billingPackage.id, billingPackage])
);

const getRazorpayClient = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    // throw new Error("Razorpay credentials are not configured");
    res.status(500).json({message:"Razorpay credentials are not configured"});
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

const toSafeUser = async (userId) => {
  return User.findById(userId).select("-password -refreshToken");
};

const createBillingOrder = asyncHandler(async (req, res) => {
  const { packageId } = req.body;

  if (!packageId) {
    return res.status(400).json({ message: "Package selection is required" });
  }

  const selectedPackage = BILLING_PACKAGE_MAP.get(packageId);
  if (!selectedPackage) {
    return res.status(400).json({ message: "Invalid billing package" });
  }

  const user = await User.findById(req.user._id).select("_id fullname email apiLimit");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    const razorpay = getRazorpayClient();
    
    // Grab the last 6 characters of the user ID
    const shortUserId = String(user._id).slice(-6); 
    // Now the receipt is: 5 + 6 + 1 + 13 = 25 characters (Well under the 40 limit)
    const receiptId = `rcpt_${shortUserId}_${Date.now()}`;
// console.log(1);
    const order = await razorpay.orders.create({
      amount: selectedPackage.amountInPaise,
      currency: selectedPackage.currency,
      receipt: receiptId,
      notes: {
        userId: String(user._id),
        packageId: selectedPackage.id,
        packageName: selectedPackage.title,
        creditsPurchased: String(selectedPackage.credits),
      },
    });
// console.log(1);
    return res.status(200).json({
      order,
      package: selectedPackage,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    // This log is crucial! If it fails again, this will tell you exactly why.
    console.error("Razorpay Error:", error); 
    return res.status(500).json({ message: "Failed to create order", error: error.message });
  }
});

const verifyBillingPayment = asyncHandler(async (req, res) => {
  const {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
    packageId,
  } = req.body;

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({ message: "Incomplete payment details" });
  }

  const razorpay = getRazorpayClient();
  const order = await razorpay.orders.fetch(razorpayOrderId);

  if (order?.notes?.userId && order.notes.userId !== String(req.user._id)) {
    return res.status(403).json({ message: "This payment does not belong to the current user" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return res.status(401).json({ message: "Invalid payment signature" });
  }

  const resolvedPackageId = order?.notes?.packageId || packageId;
  const selectedPackage = BILLING_PACKAGE_MAP.get(resolvedPackageId);

  if (!selectedPackage) {
    return res.status(400).json({ message: "Invalid or missing billing package" });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const existingPayment = user.paymentHistory?.some(
    (historyItem) =>
      historyItem.razorpayPaymentId === razorpayPaymentId ||
      historyItem.razorpayOrderId === razorpayOrderId
  );

  if (!existingPayment) {
    const apiLimitBefore = user.apiLimit;
    const apiLimitAfter = apiLimitBefore + selectedPackage.credits;

    user.apiLimit = apiLimitAfter;
    user.paymentHistory.push({
      paymentProvider: "razorpay",
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      packageId: selectedPackage.id,
      packageName: selectedPackage.title,
      creditsPurchased: selectedPackage.credits,
      amount: selectedPackage.amountInPaise / 100,
      currency: selectedPackage.currency,
      status: "paid",
      apiLimitBefore,
      apiLimitAfter,
    });

    await user.save({ validateBeforeSave: false });
  }

  const updatedUser = await toSafeUser(user._id);

  return res.status(200).json({
    message: existingPayment ? "Payment already recorded" : "Payment verified successfully",
    user: updatedUser,
  });
});

const getPaymentHistory = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select("paymentHistory apiLimit apiUsageCount");

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const paymentHistory = [...(user.paymentHistory || [])].sort(
    (left, right) => new Date(right.purchasedAt) - new Date(left.purchasedAt)
  );

  return res.status(200).json({
    paymentHistory,
    apiLimit: user.apiLimit,
    apiUsageCount: user.apiUsageCount,
  });
});

export { BILLING_PACKAGES, createBillingOrder, getPaymentHistory, verifyBillingPayment };