import { useContext, useEffect, useState } from "react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {UserDataContext} from "../Context/UserContext";
import axios from "axios";

function SignUp() {
  const navigate=useNavigate();
  const {user, setUser}=useContext(UserDataContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors,setErrors] = useState(null);
  const [submitError, setSubmitError] = useState(null);
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
      console.log("Full name is required.")
    }
    if (!formData.email.includes("@")){ 
      newErrors.email = "Enter a valid email.";
      console.log("Enter a valid email.")
    }
    if (formData.password.length < 6){
      newErrors.password = "Password must be at least 6 characters.";
      console.log("Password must be at least 6 characters.")
    }
    if (formData.password !== formData.confirmPassword){
      newErrors.confirmPassword = "Passwords do not match.";
      console.log("Passwords do not match.")
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
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }else{
        setSubmitError("Error during signup. Please try again.");
      }
    }catch(error){
      console.error("Signup Error:", error.response?.data || error.message);
      setSubmitError(error.response?.data?.message || "Failed to create account.");
    }
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 font-sans p-4">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-xl shadow-lg border border-slate-700">
        <div className="flex justify-center mb-6 text-4xl">🛡️</div>
        <h2 className="text-3xl font-bold text-center text-white mb-2">Create API Account</h2>
        <p className="text-center text-slate-400 text-sm mb-6">Get access to deepfake prediction models</p>
        
        {/* Clean Inline Error Box */}
        {submitError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
            {submitError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Full Name</label>
            <input 
              type="text" 
              name="fullname"
              placeholder="John Doe" 
              onChange={handleChange} 
              value={formData.fullname}
              className={`w-full px-4 py-2 bg-slate-900 border ${errors?.fullname ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
            {errors?.fullname && <p className="text-red-400 text-xs mt-1">{errors?.fullname}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Email Address</label>
            <input 
              type="text" 
              name="email"
              placeholder="developer@company.com" 
              onChange={handleChange} 
              value={formData.email}
              className={`w-full px-4 py-2 bg-slate-900 border ${errors?.email ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
            {errors?.email && <p className="text-red-400 text-xs mt-1">{errors?.email}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Password</label>
            <input 
              type="password" 
              name="password"
              placeholder="••••••••" 
              onChange={handleChange} 
              value={formData.password}
              className={`w-full px-4 py-2 bg-slate-900 border ${errors?.password ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
            {errors?.password && <p className="text-red-400 text-xs mt-1">{errors?.password}</p>}
          </div>

          <div>
            <label className="block text-slate-300 mb-1 text-sm font-medium">Confirm Password</label>
            <input 
              type="password" 
              name="confirmPassword"
              placeholder="••••••••" 
              onChange={handleChange} 
              value={formData.confirmPassword}
              className={`w-full px-4 py-2 bg-slate-900 border ${errors?.confirmPassword ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
            {errors?.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors?.confirmPassword}</p>}
          </div>

          <button 
            type="submit" 
            disabled={!isFormValid}
            className={`w-full py-2.5 mt-4 text-white font-bold rounded-lg transition-all shadow-md ${
              isFormValid 
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-600/20" 
                : "bg-slate-700 cursor-not-allowed opacity-50"
            }`}
          >
            Create Free Account
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">Log in</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUp