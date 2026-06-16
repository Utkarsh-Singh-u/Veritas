import { useContext, useEffect, useState } from "react";
import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {UserDataContext} from "../Context/UserContext";
import axios from "axios";

function Login () {
  const {user, setUser}=useContext(UserDataContext);
  const navigate=useNavigate();
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors,setErrors] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  useEffect(()=>{
    const checkFormValidity=()=>{
      const isValid=
      formData.email.includes("@") &&
      formData.password.length >= 6;

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
    if (!formData.email.includes("@")){ 
      newErrors.email = "Enter a valid email.";
      console.log("Enter a valid email.")
    }
    if (formData.password.length < 6){
      newErrors.password = "Password must be at least 6 characters.";
      console.log("Password must be at least 6 characters.")
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit=async (e)=>{
    e.preventDefault();
    if(!validateForm()) return;

    try{
      const response=await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/user/login`,
        formData,
        {withCredentials: true}
      )
      // console.log(response);
      if(response.data.status==="200"){
        const data = response.data;
        setUser(data.user);
        localStorage.setItem("saas_user", JSON.stringify(data.user));
        navigate("/dashboard");
      }else{
        setSubmitError("Error during login. Please try again.");
      }
    }catch(error){
      console.error("Login Error:", error.response?.data || error.message);
      setSubmitError(error.response?.data?.message || "Failed to connect to server.");
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 font-sans">
      <div className="w-full max-w-md p-8 bg-slate-800 rounded-xl shadow-lg border border-slate-700">
        <div className="flex justify-center mb-6 text-4xl">🛡️</div>
        <h2 className="text-3xl font-bold text-center text-white mb-6">Welcome Back</h2>
        
        {/* Backend Error Display */}
        {submitError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded text-sm text-center">
            {submitError}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
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
              type="password"  // Changed from 'text' to 'password'
              name="password"
              placeholder="••••••••" 
              onChange={handleChange} 
              value={formData.password}
              className={`w-full px-4 py-2 bg-slate-900 border ${errors?.password ? 'border-red-500' : 'border-slate-700'} text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all`}
            />
            {errors?.password && <p className="text-red-400 text-xs mt-1">{errors?.password}</p>}
          </div>

          <button 
            type="submit" 
            disabled={!isFormValid}
            className={`w-full py-2.5 mt-4 text-white font-bold rounded-lg transition-all shadow-md ${
              isFormValid 
                ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-600/20" 
                : "bg-slate-700 cursor-not-allowed opacity-50"
            }`}
          >
            Log In to Dashboard
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-slate-400">
          Don't have an API account? <Link to="/register" className="text-blue-400 hover:text-blue-300 hover:underline font-medium">Sign up</Link>
        </p>
      </div>
    </div>
  )
  
}
export default Login;