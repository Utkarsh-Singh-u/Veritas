import React, { useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserDataContext } from "../Context/UserContext";
import "./Dashboard.css";

const FONT_LINK_ID = "db-paper-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Special+Elite&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

export default function Dashboard() {
  useFonts();
  const { user, setUser } = useContext(UserDataContext);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const navigate = useNavigate();

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

  const handleGenerateKey = async () => {
    setLoadingKey(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/user/getapikey`,
        {},
        { withCredentials: true }
      );
      setUser(response.data.user);
      localStorage.setItem("saas_user", JSON.stringify(response.data.user));
      setShowKey(true);
    } catch (err) {
      alert("Failed to generate API Key: " + (err.response?.data?.message || err.message));
    } finally {
      setLoadingKey(false);
    }
  };

  const copyToClipboard = () => {
    if (user?.apiKey) {
      navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!user) {
    return (
      <div className="db-denied">
        <h2 className="db-denied-title">Access Denied</h2>
        <p className="db-denied-sub">Please log in to view your developer dashboard.</p>
        <button className="db-btn db-btn--primary" onClick={() => navigate("/login")}>
          Go to Login
        </button>
      </div>
    );
  }

  const usagePercentage = Math.min(
    ((user.apiUsageCount || 0) / (user.apiLimit || 100)) * 100,
    100
  );

  return (
    <div className="db-root">
      {/* ── Nav ── */}
      <nav className="db-nav">
        <Link className="db-nav-brand" to="/" style={{ textDecoration: 'none' }}>
          <div className="db-nav-icon">
            <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="25" stroke="#B5563C" strokeWidth="1.6" />
              <circle cx="28" cy="28" r="19.5" stroke="#B5563C" strokeWidth="0.9" />
              <path
                d="M28 16 L36 21 V31 L28 36 L20 31 V21 Z"
                stroke="#B5563C"
                strokeWidth="1.4"
                fill="none"
              />
              <circle cx="28" cy="26" r="2" fill="#B5563C" />
            </svg>
          </div>
          <h1 className="db-nav-title">DeepFake Guard AI</h1>
        </Link>

        <div className="db-nav-right">
          <span className="db-nav-welcome">
            Welcome, <strong>{user.fullname}</strong>
          </span>
          <button className="db-nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="db-main">
        {/* Page heading */}
        <div>
          <span className="db-page-kicker">VERITAS API — DEVELOPER DASHBOARD</span>
          <h2 className="db-page-title">Your credentials</h2>
        </div>

        {/* Two metric cards */}
        <div className="db-grid">
          {/* Account details */}
          <div className="db-card db-card--tilt-l">
            <span className="db-card-kicker">Account Details</span>
            <p className="db-account-name">{user.fullname}</p>
            <p className="db-account-email">{user.email}</p>
          </div>

          {/* Usage quota */}
          <div className="db-card db-card--tilt-r">
            <span className="db-card-kicker">API Usage Quota</span>
            <div className="db-usage-meta">
              <span className="db-usage-count">
                {user.apiUsageCount} / {user.apiLimit} scans
              </span>
            </div>
            <div className="db-progress-track">
              <div
                className="db-progress-fill"
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <p className="db-usage-caption">
              <strong>{user.apiLimit - user.apiUsageCount}</strong> free requests
              remaining this billing cycle.
            </p>
          </div>
        </div>

        {/* API key card */}
        <div className="db-card">
          <h3 className="db-section-title">Secret API Key</h3>
          <p className="db-section-sub">
            Use this key to authorise image payloads against your integration.
          </p>

          <div className="db-divider" />

          {user.apiKey ? (
            <>
              <div className="db-key-row">
                <div className="db-key-shell">
                  <span className="db-key-prefix">KEY:</span>
                  <input
                    type={showKey ? "text" : "password"}
                    value={user.apiKey}
                    readOnly
                    className="db-key-input"
                  />
                </div>

                <div className="db-key-actions">
                  <button
                    className="db-btn db-btn--ghost"
                    onClick={() => setShowKey((v) => !v)}
                  >
                    {showKey ? "Hide" : "Reveal"}
                  </button>
                  <button
                    className={`db-btn ${copied ? "db-btn--success" : "db-btn--primary"}`}
                    onClick={copyToClipboard}
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="db-no-key">
              No key provisioned yet. Generate one below to activate developer tooling.
            </div>
          )}

          <div className="db-divider" />

          <button
            className="db-btn db-btn--primary db-btn--generate"
            onClick={handleGenerateKey}
            disabled={loadingKey}
          >
            {loadingKey ? (
              <>
                <span className="db-spinner" aria-hidden="true" />
                Issuing key…
              </>
            ) : user.apiKey ? (
              "Regenerate API Key"
            ) : (
              "Generate First API Key"
            )}
          </button>

          {user.apiKey && (
            <p className="db-regen-warning">
              ⚠ Regenerating revokes the current key immediately.
            </p>
          )}
        </div>

        <p className="db-caption">No. 0427 — issued on request</p>
      </main>
    </div>
  );
}