import axios from "axios";
import FormData from "form-data";
import { asyncHandler } from "../utils/asyncHandler.js";

export const detectDeepfake = asyncHandler(async (req, res) => {
    // console.log(1);
    if (!req.file) {
        return res.status(400).json({ message: "Please upload an image file." });
    }
    // console.log(2);
    try {
      // console.log(3);
        const formData = new FormData();
        formData.append("file", req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });
        // console.log(4);

        const pythonAIUrl = process.env.AI_SERVICE_URL;
        // console.log(5);
        const response=await axios.post(pythonAIUrl,formData,{
            headers: {
                ...formData.getHeaders(),
            },
        });
        // console.log(req.apiUser);
        // console.log(6);
        return res.status(200).json({
            status: "success",
            message: "Image scanned successfully",
            data: response.data,
            apiUsageCount: req.apiUser.apiUsageCount,
            scansRemaining: req.apiUser.apiLimit - req.apiUser.apiUsageCount
        });

    } catch (error) {
        return res.status(500).json({
            message: "Error communicating with AI engine. Ensure Python server is running.",
            error: error.response?.data || error.message
        });
    }
});