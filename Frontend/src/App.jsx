import './App.css'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from './Pages/Login';
import SignUp from './Pages/SignUp';
import Dashboard from './Pages/Dashboard';
import Home from './Pages/Home';


function App() {

  return (
    <>
    <div className="relative font-sans">
      <Routes>
        <Route path="/" element={<Home/>} />
        <Route path="/login" element={<Login/>} />
        <Route path='/signup' element={<SignUp/>} />
        <Route path='/dashboard' element={<Dashboard/>} />
      </Routes>
    </div>
    <h1>hello</h1>
    </>
  )
}

export default App
