import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserDataContext } from "../Context/UserContext"; // Import your context

export default function Home() {
  const { user } = useContext(UserDataContext); // Pull in the logged-in user
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Handle image selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setResult(null);
      setError(null);
    }
  };

  // Send image to backend for scanning
  const handleScan = async () => {
    if (!selectedFile) return;
    
    setIsScanning(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      // NOTE: Point this to your secure, API-Key-protected route
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/ai-service/predict`, 
        formData,
        {
          withCredentials: true, // Send the secure cookies
          headers: { 
            "Content-Type": "multipart/form-data",
            "x-api-key": user.apiKey // Attach the user's API key to the request header!
          },
        }
      );

      setResult(response.data.data);
    } catch (err) {
      console.error("Scan Error:", err);
      setError(err.response?.data?.message || "Failed to scan image.");
    } finally {
      setIsScanning(false);
    }
  };

  // --- Dynamic Button Logic ---
  const renderActionButton = () => {
    // State 1: User is not logged in
    if (!user) {
      return (
        <button 
          onClick={() => navigate("/login")}
          className="w-full py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg bg-slate-700 hover:bg-slate-600 text-white"
        >
          Log in to Scan Free
        </button>
      );
    }

    // State 3: User is ready to scan
    return (
      <button 
        onClick={handleScan}
        disabled={!selectedFile || isScanning}
        className={`w-full py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg flex justify-center items-center ${
          !selectedFile 
            ? "bg-slate-700 text-slate-500 cursor-not-allowed" 
            : isScanning 
            ? "bg-blue-600 animate-pulse text-white cursor-wait"
            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:shadow-blue-500/25"
        }`}
      >
        {isScanning ? "Analyzing Pixels..." : "Scan Image Now"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col">
      {/* Top Navigation */}
      <nav className="flex justify-between items-center px-8 py-5 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-xl font-bold tracking-wide text-blue-400">DeepFake Guard AI</h1>
        </div>
        <div className="flex space-x-4 items-center">
          {user ? (
            <>
              <span className="text-sm text-slate-300">Hi, {user.fullname}</span>
              <Link to="/dashboard" className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="px-5 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Developer Login
              </Link>
              <Link to="/register" className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all">
                Get API Key
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center p-6 space-y-10">
        
        {/* Header Text */}
        <div className="text-center max-w-2xl space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
            Detect Deepfakes in Seconds
          </h2>
          <p className="text-lg text-slate-400">
            Upload an image below to test our Vision Transformer model.
          </p>
        </div>

        {/* Upload & Scan Container */}
        <div className="w-full max-w-xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
          
          {/* File Drop / Select Area */}
          <div className="relative border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 transition-colors bg-slate-900 flex flex-col items-center justify-center min-h-[250px] overflow-hidden group">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-2" />
            ) : (
              <div className="text-center p-6 pointer-events-none">
                <span className="text-4xl block mb-2">📸</span>
                <p className="text-slate-300 font-medium">Click to upload an image</p>
                <p className="text-slate-500 text-sm mt-1">Supports JPG, PNG, WEBP</p>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              // Only allow them to click the file input if they are logged in and have an API key!
              disabled={!user || !user.apiKey} 
              className={`absolute inset-0 w-full h-full opacity-0 ${(!user || !user.apiKey) ? "cursor-not-allowed" : "cursor-pointer"}`}
              title={!user ? "Please log in first" : ""}
            />
          </div>

          {/* Action Button - Renders dynamically based on Auth state */}
          {renderActionButton()}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-center text-sm">
              {error}
            </div>
          )}

          {/* Results Area */}
          {result && (
            <div className="pt-6 border-t border-slate-700 space-y-4 animate-fade-in-up">
              <h3 className="text-center text-slate-400 uppercase tracking-widest text-xs font-bold">Analysis Verdict</h3>
              
              <div className={`p-5 rounded-xl border flex items-center justify-between ${
                result.verdict === "real" 
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/10 border-red-500/30 text-red-400"
              }`}>
                <div>
                  <p className="text-3xl font-black capitalize">{result.verdict}</p>
                  <p className="text-sm opacity-80 mt-1">AI Confidence Score</p>
                </div>
                <div className="text-4xl font-bold">
                  {result.confidence}%
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}