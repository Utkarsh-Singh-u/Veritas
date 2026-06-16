import React, { createContext, useEffect, useState } from 'react'

export const UserDataContext=createContext();

const UserContext = ({children}) => {
  const [user, setUser] = useState(()=>{
    const savedUser = localStorage.getItem("saas_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  useEffect(() => {
    if (user) {
      localStorage.setItem("saas_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("saas_user");
    }
  }, [user]);
 
  return (
      <UserDataContext.Provider value={{ user, setUser }}>
        {children}
      </UserDataContext.Provider>
  )
}

export default UserContext