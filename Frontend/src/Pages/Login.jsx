import { useContext, useEffect, useState } from "react";
import React from "react";
import { useNavigate } from "react-router-dom";
import {UserDataContext} from "../Context/UserContext";
import axios from "axios";

function Login () {
  const {user, setUser}=useContext(UserDataContext);
  const navigate=useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
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

  return (
    <>
      <h1>
        hello
      </h1>
      <form>
        <input 
          type='text' 
          name="fullname"
          placeholder="fullname" 
          onChange={handleChange} 
          value={formData.fullname}
        />
      </form>
    </>
  )
  
}
export default Login;