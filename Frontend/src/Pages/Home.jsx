import React, { useState, useContext, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { UserDataContext } from "../Context/UserContext";
import "./Home.css";

/* ── Google Fonts loader ──────────────────────────────────────── */
const FONT_LINK_ID = "hm-paper-fonts";
function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Special+Elite&family=Inter:wght@400;500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ── Slideshow data ───────────────────────────────────────────── */
const SLIDES = [
  {
    id: 1,
    verdict: "fake",
    confidence: 97,
    icon: "🖼️",
    title: "GAN-Generated Portrait",
    desc: "Classic StyleGAN output — subtle ear asymmetry and background texture inconsistency flagged by the model.",
  },
  {
    id: 2,
    verdict: "real",
    confidence: 94,
    icon: "📷",
    title: "Press Photograph",
    desc: "Authentic DSLR capture. Natural sensor noise pattern and consistent lighting geometry confirmed as genuine.",
  },
  {
    id: 3,
    verdict: "fake",
    confidence: 89,
    icon: "🤳",
    title: "Face-Swap Selfie",
    desc: "Diffusion-based face replacement. Skin-tone boundary artefacts around the jawline exposed the swap.",
  },
  {
    id: 4,
    verdict: "real",
    confidence: 91,
    icon: "🏙️",
    title: "News Scene Photo",
    desc: "Original photojournalism image. Consistent shadow directions and unmanipulated EXIF metadata verified.",
  },
  {
    id: 5,
    verdict: "fake",
    confidence: 99,
    icon: "🧑‍💻",
    title: "Fully Synthetic Headshot",
    desc: "Zero real pixels. ViT model detected perfect symmetry and telltale frequency-domain fingerprints.",
  },
];

/* ── FAQ data ─────────────────────────────────────────────────── */
const FAQS = [
  {
    q: "What model powers the detection?",
    a: "We use a Vision Transformer (ViT-B/16) fine-tuned on a curated dataset of 2.4 million real and synthetic images spanning GAN, diffusion, and face-swap techniques.",
  },
  {
    q: "What image formats are supported?",
    a: "The endpoint accepts JPEG, PNG, and WEBP files up to 10 MB. Larger files are automatically rejected with a 413 response code.",
  },
  {
    q: "How is the confidence score calculated?",
    a: "The model outputs a softmax probability over two classes. The confidence score is the probability assigned to the winning class, expressed as a percentage.",
  },
  {
    q: "Is my uploaded image stored?",
    a: "Images are processed in-memory and discarded immediately after inference. We retain no copies and log only request metadata for quota tracking.",
  },
  {
    q: "How do I integrate the API into my own app?",
    a: "Generate an API key from your dashboard, then POST a multipart/form-data request with your image to /api/v1/ai-service/predict. Pass your key in the x-api-key header. Full docs are available in the developer portal.",
  },
];

/* ══════════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Home() {
  useFonts();
  const { user } = useContext(UserDataContext);
  const navigate = useNavigate();

  /* Scanner state */
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  /* Slideshow state */
  const [slideIndex, setSlideIndex] = useState(0);
  const slidesPerView = 3; // updated responsively below via resize observer
  const maxIndex = SLIDES.length - 1;

  /* FAQ state */
  const [openFaq, setOpenFaq] = useState(null);

  /* ── Scanner handlers ─────────────────────────────────────── */
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResult(null);
    setError(null);
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    setError(null);
    const formData = new FormData();
    formData.append("image", selectedFile);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_BASE_URL}/api/v1/ai-service/predict`,
        formData,
        {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
            "x-api-key": user.apiKey,
          },
        }
      );
      setResult(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to scan image.");
    } finally {
      setIsScanning(false);
    }
  };

  /* ── Slideshow ────────────────────────────────────────────── */
  const prevSlide = () => setSlideIndex((i) => Math.max(0, i - 1));
  const nextSlide = () => setSlideIndex((i) => Math.min(maxIndex, i + 1));

  /* translate: each slide is calc(33.333% - 14px) + 20px gap */
  const slideTranslate = `translateX(calc(-${slideIndex} * (33.333% + 6.67px)))`;

  /* ── FAQ ──────────────────────────────────────────────────── */
  const toggleFaq = (i) => setOpenFaq((prev) => (prev === i ? null : i));

  /* ── Render action button ─────────────────────────────────── */
  const renderScanBtn = () => {
    if (!user) {
      return (
        <button className="hm-scan-btn hm-scan-btn--login" onClick={() => navigate("/login")}>
          Log in to Scan Free
        </button>
      );
    }
    if (!user.apiKey) {
      return (
        <>
          <button className="hm-scan-btn" disabled>
            Scan Image
          </button>
          <p className="hm-no-key-notice">
            No API key found.{" "}
            <Link to="/dashboard">Generate one in your dashboard</Link> first.
          </p>
        </>
      );
    }
    return (
      <button
        className="hm-scan-btn"
        onClick={handleScan}
        disabled={!selectedFile || isScanning}
      >
        {isScanning ? (
          <>
            <span className="hm-spinner" aria-hidden="true" />
            Analysing…
          </>
        ) : (
          "Scan Image"
        )}
      </button>
    );
  };

  /* ══════════════════════════════════════════════════════════
     JSX
  ══════════════════════════════════════════════════════════ */
  return (
    <div className="hm-root">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav className="hm-nav">
        <Link to="/" className="hm-nav-brand">
          <svg width="26" height="26" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="25" stroke="#B5563C" strokeWidth="1.6" />
            <circle cx="28" cy="28" r="19.5" stroke="#B5563C" strokeWidth="0.9" />
            <path d="M28 16 L36 21 V31 L28 36 L20 31 V21 Z" stroke="#B5563C" strokeWidth="1.4" fill="none" />
            <circle cx="28" cy="26" r="2" fill="#B5563C" />
          </svg>
          <h1 className="hm-nav-title">DeepFake Guard AI</h1>
        </Link>

        <div className="hm-nav-links">
          {user ? (
            <>
              <span className="hm-nav-greeting">Hi, {user.fullname}</span>
              <Link to="/dashboard" className="hm-nav-btn hm-nav-btn--fill">
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="hm-nav-btn hm-nav-btn--ghost">
                Developer Login
              </Link>
              <Link to="/register" className="hm-nav-btn hm-nav-btn--fill">
                Get API Key
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="hm-hero">
        <div className="hm-hero-text">
          <span className="hm-hero-kicker">VERITAS API — IMAGE INTELLIGENCE</span>
          <h2 className="hm-hero-title">
            Is that face<br /><em>real</em> or fabricated?
          </h2>
          <p className="hm-hero-sub">
            Our Vision Transformer model scrutinises pixel-level artefacts,
            frequency signatures, and semantic inconsistencies to give you a
            verdict in under two seconds.
          </p>

          <div className="hm-hero-stats">
            <div className="hm-stat-pill">
              <span className="hm-stat-num">97.3%</span>
              <span className="hm-stat-label">Accuracy</span>
            </div>
            <div className="hm-stat-pill">
              <span className="hm-stat-num">&lt;2s</span>
              <span className="hm-stat-label">Per scan</span>
            </div>
            <div className="hm-stat-pill">
              <span className="hm-stat-num">2.4M</span>
              <span className="hm-stat-label">Training imgs</span>
            </div>
          </div>
        </div>

        {/* ── SCANNER CARD ──────────────────────────────────── */}
        <div className="hm-scanner-card hm-hero-scanner">
          <span className="hm-scanner-label">Upload Image — Free Test Scan</span>

          <div
            className={`hm-dropzone ${
              !user || !user.apiKey ? "hm-dropzone--disabled" : ""
            }`}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="hm-dropzone-preview" />
            ) : (
              <div className="hm-dropzone-placeholder">
                <span className="hm-dropzone-icon">📄</span>
                <span className="hm-dropzone-hint">Click to upload</span>
                <span className="hm-dropzone-sub">JPG · PNG · WEBP</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={!user || !user.apiKey}
              className="hm-dropzone-input"
              title={!user ? "Please log in first" : ""}
            />
          </div>

          {renderScanBtn()}

          {error && <div className="hm-alert">{error}</div>}

          {result && (
            <div className="hm-result">
              <span className="hm-result-kicker">Analysis Verdict</span>
              <div className={`hm-verdict hm-verdict--${result.verdict}`}>
                <div>
                  <p className="hm-verdict-word">{result.verdict}</p>
                  <p className="hm-verdict-sub">AI Confidence Score</p>
                </div>
                <span className="hm-verdict-score">{result.confidence}%</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── TECH STRIP ──────────────────────────────────────── */}
      <div className="hm-tech-strip">
        <div className="hm-tech-inner">
          {[
            { value: "ViT-B/16", label: "Model architecture" },
            { value: "10ms", label: "GPU inference time" },
            { value: "99.1%", label: "GAN detection rate" },
            { value: "REST", label: "API interface" },
          ].map((t) => (
            <div className="hm-tech-item" key={t.label}>
              <span className="hm-tech-value">{t.value}</span>
              <span className="hm-tech-label">{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SLIDESHOW ───────────────────────────────────────── */}
      <section className="hm-section">
        <span className="hm-section-kicker">Case Studies</span>
        <h3 className="hm-section-title">Real verdicts from our model</h3>
        <p className="hm-section-sub">
          A sample of images processed through the endpoint — showing both the
          confidence score and the reasoning behind each call.
        </p>

        <div className="hm-slideshow">
          <div
            className="hm-slides-track"
            style={{ transform: slideTranslate }}
          >
            {SLIDES.map((slide) => (
              <div
                key={slide.id}
                className={`hm-slide hm-slide--${slide.verdict}`}
              >
                <div className="hm-slide-img-wrap">
                  <div className="hm-slide-placeholder">{slide.icon}</div>
                  <span className={`hm-slide-badge hm-slide-badge--${slide.verdict}`}>
                    {slide.verdict}
                  </span>
                </div>
                <div className="hm-slide-body">
                  <p className="hm-slide-title">{slide.title}</p>
                  <p className="hm-slide-desc">{slide.desc}</p>
                  <div className="hm-slide-confidence">
                    <span className="hm-slide-conf-label">Confidence</span>
                    <div className="hm-slide-conf-bar">
                      <div
                        className="hm-slide-conf-fill"
                        style={{ width: `${slide.confidence}%` }}
                      />
                    </div>
                    <span className="hm-slide-conf-pct">{slide.confidence}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hm-slideshow-controls">
          <div className="hm-slideshow-dots">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                className={`hm-dot ${i === slideIndex ? "hm-dot--active" : ""}`}
                onClick={() => setSlideIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
          <div className="hm-slideshow-arrows">
            <button className="hm-arrow" onClick={prevSlide} disabled={slideIndex === 0}>
              ← Prev
            </button>
            <button className="hm-arrow" onClick={nextSlide} disabled={slideIndex >= SLIDES.length - 3}>
              Next →
            </button>
          </div>
        </div>
      </section>

      <hr className="hm-rule" />

      {/* ── HOW IT WORKS ────────────────────────────────────── */}
      <section className="hm-section">
        <span className="hm-section-kicker">How It Works</span>
        <h3 className="hm-section-title">From pixel to verdict in three steps</h3>
        <p className="hm-section-sub">
          The pipeline is fully automated. You send an image; we return a
          signed verdict with confidence score.
        </p>

        <div className="hm-steps">
          {[
            {
              num: "01",
              title: "Upload the image",
              desc: "POST a JPEG, PNG, or WEBP file to our endpoint via the REST API or the scanner above. No account required for a quick test.",
            },
            {
              num: "02",
              title: "ViT analyses the pixels",
              desc: "Our Vision Transformer scans the image at patch level, identifying GAN fingerprints, diffusion artefacts, and compression inconsistencies invisible to the human eye.",
            },
            {
              num: "03",
              title: "Receive a signed verdict",
              desc: "You get a JSON response containing the verdict (real or fake), a confidence percentage, and an optional explanation payload for enterprise users.",
            },
          ].map((step) => (
            <div className="hm-step" key={step.num}>
              <span className="hm-step-num">{step.num}</span>
              <h4 className="hm-step-title">{step.title}</h4>
              <p className="hm-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="hm-rule" />

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="hm-section">
        <span className="hm-section-kicker">FAQ</span>
        <h3 className="hm-section-title">Common questions</h3>
        <p className="hm-section-sub">
          Everything you need to know before integrating the API into your
          workflow.
        </p>

        <div className="hm-faq">
          {FAQS.map((faq, i) => (
            <div
              className="hm-faq-item"
              key={i}
              onClick={() => toggleFaq(i)}
            >
              <div className="hm-faq-q">
                <h4 className="hm-faq-question">{faq.q}</h4>
                <span className={`hm-faq-toggle ${openFaq === i ? "hm-faq-toggle--open" : ""}`}>
                  +
                </span>
              </div>
              <p className={`hm-faq-answer ${openFaq === i ? "hm-faq-answer--open" : ""}`}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────────── */}
      <div className="hm-cta">
        <span className="hm-cta-kicker">VERITAS API — GET STARTED</span>
        <h3 className="hm-cta-title">Ready to integrate deepfake detection?</h3>
        <p className="hm-cta-sub">
          Create a free account, generate your API key, and make your first
          call in under five minutes.
        </p>
        <Link to="/register" className="hm-cta-btn">
          Create Free Account
        </Link>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="hm-footer">
        <span className="hm-footer-copy">
          © {new Date().getFullYear()} DeepFake Guard AI — VERITAS API
        </span>
        <span className="hm-footer-serial">No. 0427 — issued on request</span>
      </footer>
    </div>
  );
}