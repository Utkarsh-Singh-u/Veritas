import React, { createContext, useState } from 'react'

export const UserDataContext=createContext();

const UserContext = ({children}) => {
  
  // const [user, setUser] = useState({
  //   _id: "",
  //   fullname: "",
  //   email: "",
  //   apiKey: "",
  //   apiUsageCount: 0,
  //   apiLimit: 0
  // })
  const [user, setUser] = useState(null);
 
  return (
      <UserDataContext.Provider value={{ user, setUser }}>
        {children}
      </UserDataContext.Provider>
  )
}

export default UserContext