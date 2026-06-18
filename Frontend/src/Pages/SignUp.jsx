import { useContext, useEffect, useState, useRef } from "react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {UserDataContext} from "../Context/UserContext";
import axios from "axios";
import "./SignUp.css"

const FONT_LINK_ID = "su-paper-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Special+Elite&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

function SignUp() {
  const navigate=useNavigate();
  const {user, setUser}=useContext(UserDataContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors,setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [stamped, setStamped] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpValues, setOtpValues] = useState(["", "", "", "", "", ""]);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [otpSuccessMsg, setOtpSuccessMsg] = useState(null);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const otpInputsRef = useRef([]);

  // Cooldown timer for resend
  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [otpCooldown]);

  useEffect(()=>{
    const checkFormValidity=()=>{
      const isValid=
      formData.fullname.trim() !="" &&
      formData.email.includes("@") &&
      formData.password.length >= 6 &&
      formData.confirmPassword==formData.password &&
      otpVerified; // Must verify email

      setIsFormValid(isValid);
    };
    checkFormValidity();
  },[formData, otpVerified]);

  const handleChange=(e)=>{
    setFormData({...formData,[e.target.name]:e.target.value});
    setErrors({ ...errors, [e.target.name]: null });
    setSubmitError(null);

    // Reset OTP state if email changes after verification
    if (e.target.name === "email") {
      if (otpSent || otpVerified) {
        setOtpSent(false);
        setOtpVerified(false);
        setOtpValues(["", "", "", "", "", ""]);
        setOtpError(null);
        setOtpSuccessMsg(null);
      }
    }
  }

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullname.trim()){
      newErrors.fullname = "Full name is required.";
    }
    if (!formData.email.includes("@")){ 
      newErrors.email = "Enter a valid email.";
    }
    if (formData.password.length < 6){
      newErrors.password = "Password must be at least 6 characters.";
    }
    if (formData.password !== formData.confirmPassword){
      newErrors.confirmPassword = "Passwords do not match.";
    }
    if (!otpVerified) {
      newErrors.email = "Please verify your email first.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Send OTP to email
  const handleSendOtp = async () => {
    if (!formData.email.includes("@")) {
      setErrors({ ...errors, email: "Enter a valid email first." });
      return;
    }
    setOtpSending(true);
    setOtpError(null);
    setOtpSuccessMsg(null);
    try {
      await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/otp/send-otp`,
        { email: formData.email }
      );
      setOtpSent(true);
      setOtpCooldown(60);
      setOtpSuccessMsg("OTP sent! Check your inbox.");
      // Focus the first OTP input
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError(err.response?.data?.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  // Handle OTP digit input
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // only digits
    const newOtp = [...otpValues];
    newOtp[index] = value.slice(-1); // single digit
    setOtpValues(newOtp);
    setOtpError(null);

    // Auto-focus next input
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are entered
    if (value && index === 5) {
      const fullOtp = newOtp.join("");
      if (fullOtp.length === 6) {
        handleVerifyOtp(fullOtp);
      }
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 0) return;
    const newOtp = [...otpValues];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || "";
    }
    setOtpValues(newOtp);
    if (pasted.length === 6) {
      handleVerifyOtp(pasted);
    } else {
      otpInputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  // Handle backspace on OTP input
  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (otp) => {
    const otpCode = otp || otpValues.join("");
    if (otpCode.length !== 6) {
      setOtpError("Please enter all 6 digits.");
      return;
    }
    setOtpVerifying(true);
    setOtpError(null);
    setOtpSuccessMsg(null);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/otp/verify-otp`,
        { email: formData.email, otp: otpCode }
      );
      if (res.data.verified) {
        setOtpVerified(true);
        setOtpSuccessMsg("Email verified ✓");
      }
    } catch (err) {
      setOtpError(err.response?.data?.message || "Invalid OTP.");
      setOtpValues(["", "", "", "", "", ""]);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 100);
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleSubmit=async (e)=>{
    e.preventDefault();
    if(!validateForm()) return;
    const newUser={
      fullname:formData.fullname,
      email:formData.email,
      password:formData.password
    }
    setSubmitting(true);
    setSubmitError(null);
    setStamped(false);
    try{
      const response= await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/user/register`,
        newUser,
        { withCredentials: true }
      )
      // console.log(response);
      if(response.data.status==="201"){

        const data = response.data;
        setUser(data.user);
        localStorage.setItem("saas_user", JSON.stringify(data.user));
        setStamped(true);
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }else{
        setSubmitting(false);
        setSubmitError("Error during signup. Please try again.");
      }
    }catch(error){
      console.error("Signup Error:", error.response?.data || error.message);
      setSubmitting(false);
      setSubmitError(error.response?.data?.message || "Failed to create account.");
    }
  }
  const fieldError = (name) => errors?.[name];
  const inputClass = (name) =>
    `su-input ${fieldError(name) ? "su-input--error" : ""}`;

  const busy = submitting;
  return (
      <div className="su-root">
        {/* <style>{CSS}</style> */}
  
        <div className="su-desk">
          <div className="su-card">
            <div className={`su-stamp ${busy ? "su-stamp--press" : ""}`} aria-hidden="true">
              <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                <circle cx="28" cy="28" r="25" stroke="#B5563C" strokeWidth="1.4" />
                <circle cx="28" cy="28" r="19.5" stroke="#B5563C" strokeWidth="0.8" />
                <path
                  d="M28 16 L36 21 V31 L28 36 L20 31 V21 Z"
                  stroke="#B5563C"
                  strokeWidth="1.3"
                  fill="none"
                />
                <circle cx="28" cy="26" r="2" fill="#B5563C" />
              </svg>
              <span className="su-ink-bloom" aria-hidden="true" />
            </div>
  
            <div className="su-head">
              <span className="su-kicker">VERITAS API — APPLICATION FORM</span>
              <h1 className="su-title">Open an account</h1>
              <p className="su-sub">
                Fill in your details below to get credentials for the deepfake
                detection endpoints.
              </p>
            </div>
  
            <div className="su-divider" aria-hidden="true" />
  
            {stamped ? (
              <div className="su-success" role="status">
                <div className="su-success-mark" aria-hidden="true">✓</div>
                <h2 className="su-success-title">You're in.</h2>
                <p className="su-success-sub">
                  Your account has been created. Taking you to your dashboard…
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="su-form" noValidate>
                {submitError && (
                  <div className="su-alert" role="alert">
                    {submitError}
                  </div>
                )}
  
                <div className="su-field">
                  <label className="su-label" htmlFor="fullname">
                    Full name
                  </label>
                  <input
                    id="fullname"
                    type="text"
                    name="fullname"
                    placeholder="Asha Kapoor"
                    autoComplete="name"
                    onChange={handleChange}
                    value={formData.fullname}
                    disabled={busy}
                    className={inputClass("fullname")}
                  />
                  {fieldError("fullname") && <p className="su-error">{errors.fullname}</p>}
                </div>
  
                {/* ── Email + OTP verification ── */}
                <div className="su-field">
                  <label className="su-label" htmlFor="email">
                    Email address
                  </label>
                  <div className="su-email-row">
                    <input
                      id="email"
                      type="text"
                      name="email"
                      placeholder="you@company.com"
                      autoComplete="email"
                      onChange={handleChange}
                      value={formData.email}
                      disabled={busy || otpVerified}
                      className={`${inputClass("email")} ${otpVerified ? "su-input--verified" : ""}`}
                    />
                    {!otpVerified && (
                      <button
                        type="button"
                        className="su-otp-send-btn"
                        onClick={handleSendOtp}
                        disabled={otpSending || otpCooldown > 0 || !formData.email.includes("@") || busy}
                      >
                        {otpSending ? (
                          <span className="su-seal-spin" aria-hidden="true" />
                        ) : otpCooldown > 0 ? (
                          `${otpCooldown}s`
                        ) : otpSent ? (
                          "Resend"
                        ) : (
                          "Verify"
                        )}
                      </button>
                    )}
                    {otpVerified && (
                      <span className="su-verified-badge">✓ Verified</span>
                    )}
                  </div>
                  {fieldError("email") && <p className="su-error">{errors.email}</p>}
                </div>

                {/* OTP Input Section */}
                {otpSent && !otpVerified && (
                  <div className="su-otp-section">
                    <label className="su-label">Enter verification code</label>
                    <div className="su-otp-inputs" onPaste={handleOtpPaste}>
                      {otpValues.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={(el) => (otpInputsRef.current[idx] = el)}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          disabled={otpVerifying}
                          className={`su-otp-digit ${otpError ? "su-otp-digit--error" : ""}`}
                          aria-label={`Digit ${idx + 1}`}
                        />
                      ))}
                    </div>
                    {otpVerifying && (
                      <p className="su-otp-status">
                        <span className="su-seal-spin" aria-hidden="true" /> Verifying…
                      </p>
                    )}
                    {otpError && <p className="su-error">{otpError}</p>}
                    {otpSuccessMsg && !otpVerified && !otpError && (
                      <p className="su-otp-hint">{otpSuccessMsg}</p>
                    )}
                  </div>
                )}

                {otpVerified && otpSuccessMsg && (
                  <div className="su-otp-verified-banner">
                    <span className="su-otp-verified-icon">✓</span>
                    {otpSuccessMsg}
                  </div>
                )}

                <div className="su-row">
                  <div className="su-field">
                    <label className="su-label" htmlFor="password">
                      Password
                    </label>
                    <div className="su-input-shell">
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        name="password"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        onChange={handleChange}
                        value={formData.password}
                        disabled={busy}
                        className={inputClass("password")}
                      />
                      <button
                        type="button"
                        className="su-eye"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showPassword ? "hide" : "show"}
                      </button>
                    </div>
                    {fieldError("password") && <p className="su-error">{errors.password}</p>}
                  </div>
  
                  <div className="su-field">
                    <label className="su-label" htmlFor="confirmPassword">
                      Confirm
                    </label>
                    <div className="su-input-shell">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="••••••••"
                        autoComplete="new-password"
                        onChange={handleChange}
                        value={formData.confirmPassword}
                        disabled={busy}
                        className={inputClass("confirmPassword")}
                      />
                      <button
                        type="button"
                        className="su-eye"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? "hide" : "show"}
                      </button>
                    </div>
                    {fieldError("confirmPassword") && (
                      <p className="su-error">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
  
                <button
                  type="submit"
                  disabled={!isFormValid || busy}
                  className="su-submit"
                >
                  {busy ? (
                    <>
                      <span className="su-seal-spin" aria-hidden="true" />
                      Stamping…
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
  
                <p className="su-foot">
                  Already have an account?{" "}
                  <Link to="/login" className="su-link">
                    Log in
                  </Link>
                </p>
              </form>
            )}
          </div>
  
          <p className="su-caption">No. 0427 — issued on request</p>
        </div>
      </div>
    );
}

export default SignUp