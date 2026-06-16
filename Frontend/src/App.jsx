import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';


function App() {

  return (
    <>
    <div className="relative font-sans">
      <Routes>
        <Route path="/" element={<h1 className="text-4xl text-center mt-20 font-bold text-blue-500">Welcome to Deepfake SaaS</h1>} />
        <Route path="/login" element={<Login/>} />
        <Route path='/signup' element={<SignUp/>} />
      </Routes>
    </div>
    <h1>hello</h1>
    </>
  )
}

export default App
