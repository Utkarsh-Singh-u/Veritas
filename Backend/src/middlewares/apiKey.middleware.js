import { User } from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const verifyApiKey = asyncHandler( async (req, res, next) => {
    try {
        const apiKey = req.header("x-api-key");
        if (!apiKey) {
            return res.status(401).json({ message: "Access Denied: No API Key provided in headers (x-api-key)." });
        }
        const user = await User.findOne({ apiKey });
        if (!user) {
            return res.status(401).json({ message: "Access Denied: Invalid API Key." });
        }
        if (user.apiUsageCount >= user.apiLimit) {
            return res.status(429).json({ 
                message: "API Rate Limit Exceeded", 
                detail: `You have reached your limit of ${user.apiLimit} scans. Please upgrade your plan.`
            });
        }
        user.apiUsageCount += 1;
        await user.save({ validateBeforeSave: false });
        req.apiUser = user;
        next();
    } catch (error) {
        return res.status(500).json({ 
            message: "Internal Server Error during API Key validation", 
            error: error.message 
        });
    }
});

export {verifyApiKey};