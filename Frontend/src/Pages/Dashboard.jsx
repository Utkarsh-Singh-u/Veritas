import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { UserDataContext } from "../Context/UserContext";

export default function Dashboard() {
  const { user, setUser } = useContext(UserDataContext);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const navigate = useNavigate();

  // Handle logging out
  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_BASE_URL}/api/v1/user/logout`, {
        withCredentials: true,
      });
      setUser(null);
      localStorage.removeItem("saas_user");
      navigate("/login");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  // Triggered when a user clicks "Generate New Key"
  const handleGenerateKey = async () => {
    setLoadingKey(true);
    try {
      const response = await axios.post(
      `${import.meta.env.VITE_BASE_URL}/api/v1/user/getapikey`,
      {},
      {
        withCredentials: true,
      }
    );
      
      // Update global context state so the UI reflects the new key instantly
      setUser(response.data.user); 
      
      // Update local storage copy
      localStorage.setItem("saas_user", JSON.stringify(response.data.user));
      setShowKey(true);
    } catch (err) {
      alert("Failed to generate API Key: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingKey(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Security Guard: If no user is logged in, show an access denied state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white p-4">
        <h2 className="text-2xl font-bold text-red-500 mb-4">Access Denied 🔒</h2>
        <p className="text-slate-400 mb-6">Please log in to view your developer dashboard.</p>
        <button onClick={() => navigate("/login")} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold transition-colors">
          Go to Login
        </button>
      </div>
    );
  }

  // Calculate API usage percentage safely
  const usagePercentage = Math.min(((user.apiUsageCount || 0) / (user.apiLimit || 100)) * 100, 100);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Top Navigation Bar */}
      <nav className="flex justify-between items-center px-8 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-xl font-bold tracking-wide text-blue-400">DeepFake Guard AI</h1>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-slate-300">Welcome, <strong className="text-white">{user.fullname}</strong></span>
          <button onClick={handleLogout} className="px-4 py-1.5 bg-slate-700 hover:bg-red-600 border border-slate-600 hover:border-red-600 text-sm font-semibold rounded-md transition-all">
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Account Overview */}
          <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-md space-y-3">
            <h3 className="text-slate-400 font-semibold tracking-wider uppercase text-xs">Account Details</h3>
            <p className="text-lg font-medium">{user.fullname}</p>
            <p className="text-sm text-slate-400 bg-slate-900/50 p-2 rounded border border-slate-700/50 break-all">{user.email}</p>
          </div>

          {/* Card 2: API Request Limit Metrics */}
          <div className="p-6 bg-slate-800 border border-slate-700 rounded-xl shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-slate-400 font-semibold tracking-wider uppercase text-xs">API Usage Quota</h3>
              <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-mono">
                {user.apiUsageCount} / {user.apiLimit} Scans
              </span>
            </div>
            
            {/* Custom Progress Bar */}
            <div className="w-full bg-slate-700 h-3 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500" 
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            
            <p className="text-xs text-slate-400">
              You have <span className="text-white font-semibold">{user.apiLimit - user.apiUsageCount}</span> free server prediction requests remaining this billing cycle.
            </p>
          </div>
        </div>

        {/* Bottom Section: API Credentials Management Component */}
        <div className="p-8 bg-slate-800 border border-slate-700 rounded-xl shadow-md space-y-6">
          <div>
            <h2 className="text-xl font-bold">Your Secret API Key</h2>
            <p className="text-sm text-slate-400 mt-1">Use this key to authorize image payloads scanning against your custom software solutions.</p>
          </div>

          {user.apiKey ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3">
              <div className="flex-1 flex items-center bg-slate-900 px-4 py-3 rounded-lg border border-slate-700 font-mono text-sm break-all">
                <span className="text-slate-500 mr-2 select-none">KEY:</span>
                <input 
                  type={showKey ? "text" : "password"} 
                  value={user.apiKey} 
                  readOnly 
                  className="bg-transparent border-none outline-none w-full text-blue-300"
                />
              </div>
              
              <div className="flex space-x-2">
                <button 
                  onClick={() => setShowKey(!showKey)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md font-medium text-sm transition-colors"
                >
                  {showKey ? "Hide" : "Reveal"}
                </button>
                <button 
                  onClick={copyToClipboard}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all text-white ${copied ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"}`}
                >
                  {copied ? "Copied! ✓" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-lg text-sm">
              You haven't provisioned an API credentials handshake token yet. Generate one below to activate developer tooling configurations.
            </div>
          )}

          <div className="pt-2 border-t border-slate-700/60">
            <button 
              onClick={handleGenerateKey}
              disabled={loadingKey}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold rounded-md shadow-md transition-all disabled:opacity-50"
            >
              {loadingKey ? "Generating Vector Strings..." : user.apiKey ? "Regenerate New API Key" : "Generate First API Key"}
            </button>
            {user.apiKey && (
              <p className="text-xs text-red-400 mt-2">
                ⚠️ Warning: Regenerating will revoke access immediately on any running browser systems utilizing your older key string.
              </p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}