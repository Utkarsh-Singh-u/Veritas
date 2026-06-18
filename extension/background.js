const BACKEND_URL = "https://deepfake-d90n.onrender.com/api/v1/ai-service/predict";

// ─── Normalize verdict ────────────────────────────────────────────────────────
function normalizeVerdict(verdict) {
  if (!verdict) return "real";
  const v = verdict.toString().toLowerCase().trim();
  console.log("[Veritas] Raw verdict from backend:", verdict);
  const fakeKeywords = ["fake","deepfake","manipulated","ai","artificial","generated","synthetic","false"];
  return fakeKeywords.some(k => v.includes(k)) ? "fake" : "real";
}

// ─── Inject scanning state (freeze scroll + RGB border + cancel button) ───────
function injectScanningBorder(tabId, imageUrl) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (srcUrl) => {
      // cleanup any previous run
      ["__veritas_scanner__","__veritas_cancel__","__veritas_style__","__veritas_result__"].forEach(id => {
        document.getElementById(id)?.remove();
      });

      const img = Array.from(document.querySelectorAll("img")).find(
        el => el.src === srcUrl || el.currentSrc === srcUrl
      );
      if (!img) return;

      // Freeze scroll
      const scrollY = window.scrollY;
      document.body.style.setProperty("overflow","hidden","important");
      document.body.style.setProperty("position","fixed","important");
      document.body.style.setProperty("top", `-${scrollY}px`,"important");
      document.body.style.setProperty("width","100%","important");
      document.body.dataset.veritasScrollY = scrollY;

      // Measure image position in document coords
      const rect = img.getBoundingClientRect();
      const PAD = 5;
      const absTop  = rect.top  + scrollY - PAD;
      const absLeft = rect.left + window.scrollX - PAD;
      const w = rect.width  + PAD * 2;
      const h = rect.height + PAD * 2;

      // Inject CSS
      const styleEl = document.createElement("style");
      styleEl.id = "__veritas_style__";
      styleEl.textContent = `
        @keyframes v-rgb {
          0%   { border-color:#ff0040; box-shadow:0 0 12px 3px #ff004099,inset 0 0 8px #ff004022; }
          16%  { border-color:#ff8800; box-shadow:0 0 12px 3px #ff880099,inset 0 0 8px #ff880022; }
          33%  { border-color:#ffee00; box-shadow:0 0 12px 3px #ffee0099,inset 0 0 8px #ffee0022; }
          50%  { border-color:#00ff88; box-shadow:0 0 12px 3px #00ff8899,inset 0 0 8px #00ff8822; }
          66%  { border-color:#00aaff; box-shadow:0 0 12px 3px #00aaff99,inset 0 0 8px #00aaff22; }
          83%  { border-color:#aa00ff; box-shadow:0 0 12px 3px #aa00ff99,inset 0 0 8px #aa00ff22; }
          100% { border-color:#ff0040; box-shadow:0 0 12px 3px #ff004099,inset 0 0 8px #ff004022; }
        }
        @keyframes v-scanline {
          0%   { top:0%;   opacity:1; }
          88%  { top:100%; opacity:1; }
          100% { top:100%; opacity:0; }
        }
        @keyframes v-corners {
          0%,100% { opacity:1; } 50% { opacity:0.3; }
        }
        #__veritas_scanner__ {
          position: absolute;
          border: 2.5px solid #ff0040;
          border-radius: 7px;
          pointer-events: none;
          animation: v-rgb 1.2s linear infinite;
          box-sizing: border-box;
        }
        #__veritas_scan_line__ {
          position: absolute;
          left: 8px; right: 8px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent);
          animation: v-scanline 1.5s ease-in-out infinite;
          border-radius: 2px;
        }
        .v-corner {
          position: absolute;
          width: 12px; height: 12px;
          border-color: #fff;
          border-style: solid;
          animation: v-corners 1.2s ease-in-out infinite;
        }
        .v-corner.tl { top:-1px;  left:-1px;  border-width:2px 0 0 2px; border-radius:3px 0 0 0; }
        .v-corner.tr { top:-1px;  right:-1px; border-width:2px 2px 0 0; border-radius:0 3px 0 0; }
        .v-corner.bl { bottom:-1px; left:-1px;  border-width:0 0 2px 2px; border-radius:0 0 0 3px; }
        .v-corner.br { bottom:-1px; right:-1px; border-width:0 2px 2px 0; border-radius:0 0 3px 0; }
        #__veritas_cancel__ {
          position: absolute;
          width: 28px; height: 28px;
          border-radius: 50%;
          background: rgba(15,15,20,0.85);
          border: 1.5px solid rgba(255,255,255,0.25);
          color: #fff;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          transition: background 0.15s, transform 0.15s;
          z-index: 2147483647;
          line-height: 0;
        }
        #__veritas_cancel__:hover {
          background: rgba(255,60,60,0.7);
          transform: scale(1.1);
        }
      `;
      document.head.appendChild(styleEl);

      // Scanner border div
      const scanner = document.createElement("div");
      scanner.id = "__veritas_scanner__";
      scanner.style.cssText = `top:${absTop}px; left:${absLeft}px; width:${w}px; height:${h}px; z-index:2147483646;`;

      const scanLine = document.createElement("div");
      scanLine.id = "__veritas_scan_line__";
      scanner.appendChild(scanLine);

      ["tl","tr","bl","br"].forEach(cls => {
        const c = document.createElement("div");
        c.className = `v-corner ${cls}`;
        scanner.appendChild(c);
      });

      // Cancel (×) button — top-right of the border
      const cancelBtn = document.createElement("button");
      cancelBtn.id = "__veritas_cancel__";
      cancelBtn.style.cssText = `top:${absTop - 14}px; left:${absLeft + w - 14}px;`;
      cancelBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      cancelBtn.title = "Cancel scan";
      cancelBtn.addEventListener("click", () => {
        // Unfreeze scroll
        const savedY = parseInt(document.body.dataset.veritasScrollY || "0");
        document.body.style.removeProperty("overflow");
        document.body.style.removeProperty("position");
        document.body.style.removeProperty("top");
        document.body.style.removeProperty("width");
        window.scrollTo(0, savedY);
        ["__veritas_scanner__","__veritas_cancel__","__veritas_style__","__veritas_result__"].forEach(id => {
          document.getElementById(id)?.remove();
        });
        document.body.dataset.veritasCancelled = "1";
      });

      document.body.appendChild(scanner);
      document.body.appendChild(cancelBtn);
    },
    args: [imageUrl]
  });
}

// ─── Unfreeze scroll and remove scanning UI ───────────────────────────────────
function removeScanningBorder(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      const savedY = parseInt(document.body.dataset.veritasScrollY || "0");
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("position");
      document.body.style.removeProperty("top");
      document.body.style.removeProperty("width");
      window.scrollTo(0, savedY);
      document.getElementById("__veritas_scanner__")?.remove();
      document.getElementById("__veritas_cancel__")?.remove();
      document.getElementById("__veritas_style__")?.remove();
    }
  });
}

// ─── Inject Gemini-style inline result card below the image ──────────────────
function injectResultCard(tabId, imageUrl, payload) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (srcUrl, data) => {
      // If user already cancelled, do nothing
      if (document.body.dataset.veritasCancelled === "1") {
        delete document.body.dataset.veritasCancelled;
        return;
      }

      document.getElementById("__veritas_result__")?.remove();

      const img = Array.from(document.querySelectorAll("img")).find(
        el => el.src === srcUrl || el.currentSrc === srcUrl
      );

      const isFake  = data.type === "fake";
      const isError = data.type === "error";

      // ── Cream palette ──
      const cream     = "#fdf6ec";
      const creamDark = "#f5e9d5";
      const textMain  = "#2c2010";
      const textSub   = "#7a6a52";
      const border    = "#e8d9c0";

      const accentColor = isError ? "#c0392b" : isFake ? "#c0610a" : "#1a7a4a";
      const accentLight = isError ? "#fdecea" : isFake ? "#fef3e8" : "#eafaf1";
      const verdictText = isError ? "Scan Failed" : isFake ? "Likely AI-Generated" : "Likely Authentic";
      const tagLine     = isError
        ? "Could not complete the scan."
        : isFake
        ? "This image shows signs of AI manipulation or deepfake generation."
        : "No significant signs of AI manipulation were detected.";

      const iconSvg = isError
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : isFake
        ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        : `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;

      // Inject result card style
      const st = document.getElementById("__veritas_style__") || document.createElement("style");
      st.id = "__veritas_style__";
      st.textContent += `
        @keyframes v-card-in {
          from { opacity:0; transform:translateY(-8px) scale(0.98); }
          to   { opacity:1; transform:translateY(0)   scale(1);    }
        }
        @keyframes v-bar-fill {
          from { width: 0%; }
        }
        #__veritas_result__ {
          animation: v-card-in 0.32s cubic-bezier(0.22,1,0.36,1) both;
        }
        #__veritas_conf_fill__ {
          animation: v-bar-fill 0.9s cubic-bezier(0.4,0,0.2,1) both 0.25s;
        }
        #__veritas_dismiss__:hover { opacity: 1 !important; }
      `;
      if (!document.getElementById("__veritas_style__")) document.head.appendChild(st);

      const card = document.createElement("div");
      card.id = "__veritas_result__";

      // Position it: if img found, inline below it; else fixed bottom-center
      if (img) {
        const rect = img.getBoundingClientRect();
        const absTop  = rect.bottom + window.scrollY + 10;
        const absLeft = rect.left   + window.scrollX;
        const cardW   = Math.max(Math.min(rect.width, 480), 300);
        card.style.cssText = `
          position: absolute;
          top: ${absTop}px;
          left: ${absLeft}px;
          width: ${cardW}px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif;
        `;
      } else {
        card.style.cssText = `
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          width: 360px;
          z-index: 2147483647;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Georgia, serif;
        `;
      }

      card.innerHTML = `
        <div style="
          background:${cream};
          border:1px solid ${border};
          border-radius:14px;
          overflow:hidden;
          box-shadow:0 4px 24px rgba(100,70,20,0.13), 0 1px 4px rgba(100,70,20,0.08);
        ">
          <!-- top accent strip -->
          <div style="height:3px; background:linear-gradient(90deg,${accentColor},${accentColor}99);"></div>

          <!-- main body -->
          <div style="padding:14px 16px 6px;">

            <!-- header row -->
            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px; flex:1;">
                <div style="
                  width:38px; height:38px; border-radius:10px;
                  background:${accentLight};
                  border:1px solid ${accentColor}44;
                  display:flex; align-items:center; justify-content:center;
                  flex-shrink:0;
                ">${iconSvg}</div>
                <div>
                  <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.1em; color:${textSub}; font-weight:600; margin-bottom:2px;">Veritas · Image Analysis</div>
                  <div style="font-size:15px; font-weight:700; color:${accentColor}; letter-spacing:-0.01em;">${verdictText}</div>
                </div>
              </div>
              <!-- dismiss X -->
              <button id="__veritas_dismiss__" style="
                background:none; border:none; cursor:pointer;
                color:${textSub}; opacity:0.5; padding:2px; line-height:0;
                flex-shrink:0; margin-top:2px;
                transition:opacity 0.15s;
              " title="Dismiss">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <!-- tagline -->
            <p style="margin:10px 0 0; font-size:12.5px; color:${textSub}; line-height:1.55;">${tagLine}</p>

            ${!isError ? `
            <!-- confidence meter -->
            <div style="margin-top:12px;">
              <div style="display:flex; justify-content:space-between; font-size:11px; color:${textSub}; margin-bottom:5px;">
                <span style="font-weight:500;">Confidence</span>
                <span style="font-weight:700; color:${accentColor};">${data.confidence}%</span>
              </div>
              <div style="height:5px; border-radius:99px; background:${creamDark}; overflow:hidden; border:1px solid ${border};">
                <div id="__veritas_conf_fill__" style="height:100%; width:${data.confidence}%; background:linear-gradient(90deg,${accentColor}cc,${accentColor}); border-radius:99px;"></div>
              </div>
            </div>
            ` : ""}
          </div>

          <!-- footer -->
          <div style="
            padding:8px 16px 10px;
            display:flex; align-items:center; justify-content:space-between;
            border-top:1px solid ${border};
            margin-top:12px;
          ">
            <span style="font-size:10.5px; color:${textSub}; opacity:0.7;">
              ${!isError ? `${data.remaining ?? "—"} scans remaining` : ""}
            </span>
            <span style="font-size:10px; color:${textSub}; opacity:0.5; letter-spacing:0.04em; font-weight:600; text-transform:uppercase;">
              Veritas
            </span>
          </div>
        </div>
      `;

      document.body.appendChild(card);

      // Wire dismiss button
      card.querySelector("#__veritas_dismiss__").addEventListener("click", () => {
        card.style.transition = "opacity 0.2s, transform 0.2s";
        card.style.opacity = "0";
        card.style.transform = (card.style.position === "fixed")
          ? "translateX(-50%) translateY(8px)"
          : "translateY(8px)";
        setTimeout(() => card.remove(), 220);
      });
    },
    args: [imageUrl, payload]
  });
}

// ─── Context menu setup ───────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scanImage",
    title: "🛡️ Scan Image for Deepfakes",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "scanImage") return;

  const imageUrl = info.srcUrl;

  chrome.storage.local.get(["apiKey"], async (result) => {
    const apiKey = result.apiKey;

    if (!apiKey) {
      injectResultCard(tab.id, imageUrl, {
        type: "error",
        message: "No API key set. Click the extension icon to add one."
      });
      return;
    }

    injectScanningBorder(tab.id, imageUrl);

    try {
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();
      const formData = new FormData();
      formData.append("image", blob, "scanned_image.jpg");

      const backendResponse = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "x-api-key": apiKey },
        body: formData
      });

      const responseData = await backendResponse.json();
      console.log("[Veritas] Full backend response:", JSON.stringify(responseData));

      removeScanningBorder(tab.id);

      if (backendResponse.ok && responseData.data) {
        injectResultCard(tab.id, imageUrl, {
          type: normalizeVerdict(responseData.data.verdict),
          confidence: responseData.data.confidence,
          remaining: responseData.scansRemaining
        });
      } else {
        injectResultCard(tab.id, imageUrl, {
          type: "error",
          message: responseData.message || "Unknown server error."
        });
      }
    } catch (err) {
      console.error("[Veritas] Scan Error:", err);
      removeScanningBorder(tab.id);
      injectResultCard(tab.id, imageUrl, {
        type: "error",
        message: "Failed to connect to the Veritas server."
      });
    }
  });
});