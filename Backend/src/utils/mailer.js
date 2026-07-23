import axios from "axios";

export const sendOtpEmail = async (to, otp) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.EMAIL_USER, // Your verified Brevo sender email
          name: "Veritas API",
        },
        to: [
          {
            email: to,
          },
        ],
        subject: "Your Veritas API Verification Code",
        htmlContent: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f0f; border: 1px solid #2a2a2a; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1a1a1a 0%, #111 100%); padding: 32px 40px 24px; border-bottom: 1px solid #2a2a2a;">
              <p style="margin: 0; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #B5563C; font-weight: 600;">VERITAS API</p>
              <h1 style="margin: 8px 0 0; font-size: 22px; color: #f0ece3; font-weight: 500;">Email Verification</h1>
            </div>
            <div style="padding: 32px 40px;">
              <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
                Use the code below to verify your email address. This code expires in <strong style="color: #f0ece3;">10 minutes</strong>.
              </p>
              <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 40px; letter-spacing: 10px; font-weight: 700; color: #f0ece3; font-family: 'Courier New', monospace;">${otp}</span>
              </div>
              <p style="color: #666; font-size: 12px; margin: 0; line-height: 1.6;">
                If you did not request this code, please ignore this email. Do not share this code with anyone.
              </p>
            </div>
            <div style="padding: 16px 40px; border-top: 1px solid #1a1a1a; background: #0a0a0a;">
              <p style="color: #444; font-size: 11px; margin: 0; letter-spacing: 1px;">VERITAS DEEPFAKE DETECTION — SECURE SIGNUP</p>
            </div>
          </div>
        `,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Brevo API Error:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.message || "Failed to send email via Brevo"
    );
  }
};
