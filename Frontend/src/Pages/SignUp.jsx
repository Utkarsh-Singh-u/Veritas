import { useContext, useEffect, useState } from "react";
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
  useEffect(()=>{
    const checkFormValidity=()=>{
      const isValid=
      formData.fullname.trim() !="" &&
      formData.email.includes("@") &&
      formData.password.length >= 6 &&
      formData.confirmPassword==formData.password;

      setIsFormValid(isValid);
    };
    checkFormValidity();
  },[formData]);
  const handleChange=(e)=>{
    setFormData({...formData,[e.target.name]:e.target.value});
    setErrors({ ...errors, [e.target.name]: null });
    setSubmitError(null);
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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
  
                <div className="su-field">
                  <label className="su-label" htmlFor="email">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="text"
                    name="email"
                    placeholder="you@company.com"
                    autoComplete="email"
                    onChange={handleChange}
                    value={formData.email}
                    disabled={busy}
                    className={inputClass("email")}
                  />
                  {fieldError("email") && <p className="su-error">{errors.email}</p>}
                </div>
  
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