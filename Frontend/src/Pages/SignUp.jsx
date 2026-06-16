import { useContext, useEffect, useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import {UserDataContext} from "../Context/UserContext";
import axios from "axios";


function SignUp() {
  const navigate=useNavigate();
  const {user, setUser}=useContext(UserDataContext);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [errors,setErrors] = useState(null);
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
        // console.log("hiii");
        const token = response.data.accessToken;
        if (token) {
          localStorage.setItem("accessToken", token);
        }

        const userId = response.data.user._id;
        if (userId) {
          localStorage.setItem("userId", userId);
        }

        const data = response.data;
        setUser(data.user);
        localStorage.setItem("token", data.refreshToken);
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }else{
        alert("Error during signup. Please try again.");
      }
    }catch(error){
      console.error("Signup Error:", error.response?.data || error.message);
      // setIsLoading(false);
      alert("Failed to connect to server.");
    }
  }
  return (
    <>
      <form onSubmit={handleSubmit}>
        <input 
          type='text' 
          name="fullname"
          placeholder="fullname" 
          onChange={handleChange} 
          value={formData.fullname}
        />
        <input 
          type='text' 
          name="email"
          placeholder="Email" 
          onChange={handleChange} 
          value={formData.email}
        />
        <input 
          type='text' 
          name="password"
          placeholder="Password" 
          onChange={handleChange} 
          value={formData.password}
        />
        <input 
          type='text' 
          name="confirmPassword"
          placeholder="confirm password" 
          onChange={handleChange} 
          value={formData.confirmPassword}
        />
        <button type="submit">SignUp</button>
      </form>
    </>
  )
}

export default SignUp