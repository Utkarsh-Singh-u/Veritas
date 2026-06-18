import React, { useContext, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserDataContext } from "../Context/UserContext";
import "./Dashboard.css";

const FONT_LINK_ID = "db-paper-fonts";
const RAZORPAY_SCRIPT_ID = "db-razorpay-checkout";

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

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(true));
      existingScript.addEventListener("error", () => reject(new Error("Unable to load Razorpay checkout")));
      return;
    }

    const script = document.createElement("script");
    script.id = RAZORPAY_SCRIPT_ID;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Unable to load Razorpay checkout"));
    document.body.appendChild(script);
  });
}

const BILLING_PACKAGES = [
  {
    id: "starter",
    title: "Starter Pack",
    credits: 1000,
    amount: 499,
    currency: "INR",
    badge: "Best for testing",
  },
  {
    id: "growth",
    title: "Growth Pack",
    credits: 5000,
    amount: 1999,
    currency: "INR",
    badge: "Most popular",
  },
  {
    id: "scale",
    title: "Scale Pack",
    credits: 12000,
    amount: 4499,
    currency: "INR",
    badge: "Best value",
  },
];

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function formatAmount(amount) {
  return moneyFormatter.format(amount || 0);
}

function formatDate(value) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function Dashboard() {
  useFonts();
  const { user, setUser } = useContext(UserDataContext);
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [loadingKey, setLoadingKey] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState(BILLING_PACKAGES[1].id);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const navigate = useNavigate();

  const selectedPackage = useMemo(
    () => BILLING_PACKAGES.find((item) => item.id === selectedPackageId) || BILLING_PACKAGES[0],
    [selectedPackageId]
  );

  const paymentHistory = useMemo(() => {
    if (!user?.paymentHistory?.length) return [];
    return [...user.paymentHistory].sort(
      (left, right) => new Date(right.purchasedAt || 0) - new Date(left.purchasedAt || 0)
    );
  }, [user]);

  const authConfig = () => {
    const token = localStorage.getItem("accessToken");
    return {
      withCredentials: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    };
  };

  useEffect(() => {
    if (!user) return;

    let active = true;
    const fetchLatestUserData = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/api/v1/user/me`, {
          ...authConfig(),
        });

        if (active) {
          setUser(response.data.user);
        }
      } catch (err) {
        console.error("Failed to fetch fresh user data", err);
      }
    };

    fetchLatestUserData();

    return () => {
      active = false;
    };
  }, [user, setUser]);

  const handleLogout = async () => {
    try {
      await axios.get(`${import.meta.env.VITE_BASE_URL}/api/v1/user/logout`, {
        ...authConfig(),
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
    setPaymentError("");
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

  const handlePurchasePackage = async (billingPackage) => {
    setCheckoutLoading(true);
    setPaymentNotice("");
    setPaymentError("");

    try {
      const scriptReady = await loadRazorpayScript();
      if (!scriptReady) {
        throw new Error("Unable to load Razorpay checkout");
      }

      const orderResponse = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/billing/order`,
        { packageId: billingPackage.id },
        authConfig()
      );

      const { order, keyId } = orderResponse.data;
      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: "VERITAS API",
        description: `${billingPackage.title} - ${billingPackage.credits} credits`,
        order_id: order.id,
        prefill: {
          name: user.fullname,
          email: user.email,
        },
        notes: {
          packageId: billingPackage.id,
        },
        theme: {
          color: "#B5563C",
        },
        modal: {
          ondismiss: () => {
            setCheckoutLoading(false);
          },
        },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await axios.post(
              `${import.meta.env.VITE_BASE_URL}/api/v1/billing/verify`,
              {
                ...paymentResponse,
                packageId: billingPackage.id,
              },
              authConfig()
            );
            setUser(verifyResponse.data.user);
            localStorage.setItem("saas_user", JSON.stringify(verifyResponse.data.user));
            setPaymentNotice(`${billingPackage.title} added successfully.`);
          } catch (error) {
            setPaymentError(error.response?.data?.message || "Payment verification failed.");
          } finally {
            setCheckoutLoading(false);
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setPaymentError(response.error?.description || "Payment failed.");
        setCheckoutLoading(false);
      });

      checkout.open();
    } catch (err) {
      setPaymentError(err.response?.data?.message || err.message || "Unable to start payment.");
      setCheckoutLoading(false);
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

  const usagePercentage = Math.min(((user.apiUsageCount || 0) / (user.apiLimit || 100)) * 100, 100);
  const remainingCredits = Math.max((user.apiLimit || 0) - (user.apiUsageCount || 0), 0);

  return (
    <div className="db-root">
      <nav className="db-nav">
        <Link className="db-nav-brand" to="/" style={{ textDecoration: "none" }}>
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
          <h1 className="db-nav-title">VERITAS</h1>
        </Link>

        <div className="db-nav-right">
          <a className="db-nav-link" href="#billing">
            Billing
          </a>
          <span className="db-nav-welcome">
            Welcome, <strong>{user.fullname}</strong>
          </span>
          <button className="db-nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </nav>

      <main className="db-main">
        <div>
          <span className="db-page-kicker">VERITAS API - DEVELOPER DASHBOARD</span>
          <h2 className="db-page-title">Your credentials and billing</h2>
        </div>

        <div className="db-grid">
          <div className="db-card db-card--tilt-l">
            <span className="db-card-kicker">Account Details</span>
            <p className="db-account-name">{user.fullname}</p>
            <p className="db-account-email">{user.email}</p>
          </div>

          <div className="db-card db-card--tilt-r">
            <span className="db-card-kicker">API Usage Quota</span>
            <div className="db-usage-meta">
              <span className="db-usage-count">
                {user.apiUsageCount} / {user.apiLimit} scans
              </span>
            </div>
            <div className="db-progress-track">
              <div className="db-progress-fill" style={{ width: `${usagePercentage}%` }} />
            </div>
            <p className="db-usage-caption">
              <strong>{remainingCredits}</strong> free requests remain in this billing cycle.
            </p>
          </div>
        </div>

        <div className="db-card" id="billing">
          <span className="db-card-kicker">Billing</span>
          <h3 className="db-section-title">Buy more API credits</h3>
          <p className="db-section-sub">
            Choose a package, complete the Razorpay checkout, and your API limit increases instantly.
          </p>

          {(paymentNotice || paymentError) && (
            <div className={paymentError ? "db-notice db-notice--error" : "db-notice db-notice--success"}>
              {paymentError || paymentNotice}
            </div>
          )}

          <div className="db-package-grid">
            {BILLING_PACKAGES.map((billingPackage) => {
              const isSelected = billingPackage.id === selectedPackageId;
              return (
                <button
                  key={billingPackage.id}
                  type="button"
                  className={`db-package-card ${isSelected ? "db-package-card--selected" : ""}`}
                  onClick={() => setSelectedPackageId(billingPackage.id)}
                >
                  <span className="db-package-badge">{billingPackage.badge}</span>
                  <span className="db-package-title">{billingPackage.title}</span>
                  <span className="db-package-price">{formatAmount(billingPackage.amount)}</span>
                  <span className="db-package-credits">{billingPackage.credits.toLocaleString("en-IN")} credits</span>
                  <span className="db-package-detail">Adds {billingPackage.credits.toLocaleString("en-IN")} scans to your limit.</span>
                </button>
              );
            })}
          </div>

          <div className="db-payment-summary">
            <div>
              <span className="db-payment-summary-label">Selected package</span>
              <strong>{selectedPackage.title}</strong>
              <p>
                {selectedPackage.credits.toLocaleString("en-IN")} credits for {formatAmount(selectedPackage.amount)}.
              </p>
            </div>
            <button
              className="db-btn db-btn--primary db-btn--generate"
              onClick={() => handlePurchasePackage(selectedPackage)}
              disabled={checkoutLoading}
            >
              {checkoutLoading ? (
                <>
                  <span className="db-spinner" aria-hidden="true" />
                  Opening Razorpay...
                </>
              ) : (
                `Buy ${selectedPackage.title}`
              )}
            </button>
          </div>
        </div>

        <div className="db-card">
          <h3 className="db-section-title">Secret API Key</h3>
          <p className="db-section-sub">
            Use this key to authorise image payloads against your integration.
          </p>

          <div className="db-divider" />

          {user.apiKey ? (
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
                <button className="db-btn db-btn--ghost" onClick={() => setShowKey((value) => !value)}>
                  {showKey ? "Hide" : "Reveal"}
                </button>
                <button
                  className={`db-btn ${copied ? "db-btn--success" : "db-btn--primary"}`}
                  onClick={copyToClipboard}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : (
            <div className="db-no-key">No key provisioned yet. Generate one below to activate developer tooling.</div>
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
                Issuing key...
              </>
            ) : user.apiKey ? (
              "Regenerate API Key"
            ) : (
              "Generate First API Key"
            )}
          </button>

          {user.apiKey && <p className="db-regen-warning">Warning: regenerating revokes the current key immediately.</p>}
        </div>

        <div className="db-card">
          <span className="db-card-kicker">Payment History</span>
          <h3 className="db-section-title">Recent transactions</h3>
          <p className="db-section-sub">
            Review each successful purchase, the credits granted, and the resulting API limit.
          </p>

          <div className="db-divider" />

          {paymentHistory.length ? (
            <div className="db-history-list">
              {paymentHistory.map((entry) => (
                <article className="db-history-item" key={entry.razorpayPaymentId || entry.razorpayOrderId || entry.purchasedAt}>
                  <div className="db-history-topline">
                    <strong>{entry.packageName || "Credit purchase"}</strong>
                    <span className={`db-history-status db-history-status--${entry.status || "paid"}`}>
                      {entry.status || "paid"}
                    </span>
                  </div>
                  <div className="db-history-meta">
                    <span>{entry.creditsPurchased?.toLocaleString("en-IN") || 0} credits</span>
                    <span>{formatAmount(entry.amount)}</span>
                    <span>{formatDate(entry.purchasedAt)}</span>
                  </div>
                  <div className="db-history-limit">
                    API limit: {entry.apiLimitBefore} {'->'} {entry.apiLimitAfter}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="db-no-key">No payment history yet. Buy a package above to add credits.</div>
          )}
        </div>

        <p className="db-caption">No. 0427 - issued on request</p>
      </main>
    </div>
  );
}
