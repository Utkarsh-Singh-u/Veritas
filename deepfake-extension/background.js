const BACKEND_URL = "https://deepfake-d90n.onrender.com/api/v1/ai-service/predict";

function injectScanningBorder(tabId, imageUrl) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (srcUrl) => {
      const existing = document.getElementById("__veritas_scanner__");
      if (existing) existing.remove();

      const img = Array.from(document.querySelectorAll("img")).find(
        el => el.src === srcUrl || el.currentSrc === srcUrl
      );
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const overlay = document.createElement("div");
      overlay.id = "__veritas_scanner__";

      const PAD = 4;
      overlay.style.cssText = `
        position: fixed;
        left: ${rect.left - PAD}px;
        top: ${rect.top - PAD}px;
        width: ${rect.width + PAD * 2}px;
        height: ${rect.height + PAD * 2}px;
        border-radius: 6px;
        pointer-events: none;
        z-index: 2147483646;
        background: transparent;
      `;

      const styleEl = document.createElement("style");
      styleEl.id = "__veritas_style__";
      styleEl.textContent = `
        @keyframes veritas-rgb {
          0%   { border-color: #ff0040; box-shadow: 0 0 10px 2px #ff004088, inset 0 0 6px #ff004033; }
          16%  { border-color: #ff8800; box-shadow: 0 0 10px 2px #ff880088, inset 0 0 6px #ff880033; }
          33%  { border-color: #ffee00; box-shadow: 0 0 10px 2px #ffee0088, inset 0 0 6px #ffee0033; }
          50%  { border-color: #00ff88; box-shadow: 0 0 10px 2px #00ff8888, inset 0 0 6px #00ff8833; }
          66%  { border-color: #00aaff; box-shadow: 0 0 10px 2px #00aaff88, inset 0 0 6px #00aaff33; }
          83%  { border-color: #aa00ff; box-shadow: 0 0 10px 2px #aa00ff88, inset 0 0 6px #aa00ff33; }
          100% { border-color: #ff0040; box-shadow: 0 0 10px 2px #ff004088, inset 0 0 6px #ff004033; }
        }
        @keyframes veritas-scan-line {
          0%   { top: 0%; opacity: 1; }
          90%  { top: 100%; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        #__veritas_scanner__ {
          border: 2.5px solid #ff0040;
          animation: veritas-rgb 1.2s linear infinite;
        }
        #__veritas_scan_line__ {
          position: absolute;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
          animation: veritas-scan-line 1.4s ease-in-out infinite;
          border-radius: 2px;
        }
      `;
      document.head.appendChild(styleEl);

      const scanLine = document.createElement("div");
      scanLine.id = "__veritas_scan_line__";
      overlay.appendChild(scanLine);
      document.body.appendChild(overlay);
    },
    args: [imageUrl]
  });
}

function removeScanningBorder(tabId) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => {
      document.getElementById("__veritas_scanner__")?.remove();
      document.getElementById("__veritas_style__")?.remove();
    }
  });
}

function injectResultOverlay(tabId, payload) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (data) => {
      const existing = document.getElementById("__veritas_overlay__");
      if (existing) existing.remove();

      const isFake = data.type === "fake";
      const isError = data.type === "error";

      const accentColor = isError ? "#f87171" : isFake ? "#fb923c" : "#34d399";
      const bgColor = isError ? "#1a0a0a" : isFake ? "#1a0e06" : "#061a10";
      const labelText = isError ? "scan failed" : isFake ? "likely fake" : "likely real";
      const iconPath = isError
        ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : isFake
        ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>`;

      const wrap = document.createElement("div");
      wrap.id = "__veritas_overlay__";
      wrap.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        transform: translateX(120%);
        transition: transform 0.38s cubic-bezier(0.34, 1.56, 0.64, 1);
      `;

      const bar = document.createElement("div");
      bar.style.cssText = `width: 5px; border-radius: 4px 0 0 4px; background: ${accentColor}; flex-shrink: 0;`;

      const card = document.createElement("div");
      card.style.cssText = `
        display: flex;
        align-items: stretch;
        background: ${bgColor};
        border: 1px solid ${accentColor}33;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.5);
        min-width: 280px;
        max-width: 320px;
      `;

      const inner = document.createElement("div");
      inner.style.cssText = `display: flex; flex-direction: column; gap: 10px; padding: 14px 16px 14px 14px; flex: 1;`;

      const header = document.createElement("div");
      header.style.cssText = `display: flex; align-items: center; gap: 10px;`;
      header.innerHTML = `
        ${iconPath}
        <div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: ${accentColor}; font-weight: 600;">Veritas</div>
          <div style="font-size: 15px; font-weight: 700; color: #fff; margin-top: 1px;">${labelText}</div>
        </div>
      `;
      inner.appendChild(header);

      if (!isError) {
        const conf = data.confidence;
        const meterWrap = document.createElement("div");
        meterWrap.style.cssText = `display: flex; flex-direction: column; gap: 4px;`;
        meterWrap.innerHTML = `
          <div style="display:flex; justify-content:space-between; font-size:11px; color:#94a3b8;">
            <span>AI confidence</span>
            <span style="color:${accentColor}; font-weight:600;">${conf}%</span>
          </div>
          <div style="height:4px; border-radius:4px; background:#1e293b; overflow:hidden;">
            <div style="height:100%; width:0%; border-radius:4px; background:${accentColor}; transition: width 0.7s cubic-bezier(0.4,0,0.2,1);" id="__veritas_bar__"></div>
          </div>
        `;
        inner.appendChild(meterWrap);

        const credits = document.createElement("div");
        credits.style.cssText = `font-size: 11px; color: #475569; border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 2px;`;
        credits.textContent = `${data.remaining} scans remaining`;
        inner.appendChild(credits);
      } else {
        const errMsg = document.createElement("div");
        errMsg.style.cssText = `font-size: 12px; color: #94a3b8; line-height: 1.5;`;
        errMsg.textContent = data.message || "Could not connect to server.";
        inner.appendChild(errMsg);
      }

      const closeBtn = document.createElement("button");
      closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      closeBtn.style.cssText = `position: absolute; top: 10px; right: 10px; background: none; border: none; cursor: pointer; padding: 2px; line-height: 0; opacity: 0.5;`;
      closeBtn.addEventListener("mouseenter", () => closeBtn.style.opacity = "1");
      closeBtn.addEventListener("mouseleave", () => closeBtn.style.opacity = "0.5");
      closeBtn.addEventListener("click", () => dismiss());

      card.appendChild(bar);
      card.appendChild(inner);
      wrap.style.position = "fixed";
      wrap.appendChild(card);
      wrap.appendChild(closeBtn);
      document.body.appendChild(wrap);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          wrap.style.transform = "translateX(0)";
          if (!isError) {
            setTimeout(() => {
              const b = document.getElementById("__veritas_bar__");
              if (b) b.style.width = data.confidence + "%";
            }, 80);
          }
        });
      });

      function dismiss() {
        wrap.style.transform = "translateX(120%)";
        setTimeout(() => wrap.remove(), 400);
      }

      const timer = setTimeout(dismiss, 7000);
      wrap.addEventListener("mouseenter", () => clearTimeout(timer));
      wrap.addEventListener("mouseleave", () => setTimeout(dismiss, 2000));
    },
    args: [payload]
  });
}

// Normalize verdict strings from backend into "fake" or "real"
function normalizeVerdict(verdict) {
  if (!verdict) return "real";
  const v = verdict.toString().toLowerCase().trim();
  // Log raw verdict so you can verify what your backend actually sends
  console.log("[Veritas] Raw verdict from backend:", verdict);
  const fakeKeywords = ["fake", "deepfake", "manipulated", "ai", "artificial", "generated", "synthetic", "false"];
  return fakeKeywords.some(k => v.includes(k)) ? "fake" : "real";
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "scanImage",
    title: "🛡️ Scan Image for Deepfakes",
    contexts: ["image"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "scanImage") {
    const imageUrl = info.srcUrl;

    chrome.storage.local.get(["apiKey"], async (result) => {
      const apiKey = result.apiKey;
      if (!apiKey) {
        injectResultOverlay(tab.id, {
          type: "error",
          message: "No API key set. Click the extension icon to add one."
        });
        return;
      }

      // Start the RGB scanning border on the image
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

        // Log full response so you can see the exact structure
        console.log("[Veritas] Full backend response:", JSON.stringify(responseData));

        removeScanningBorder(tab.id);

        if (backendResponse.ok && responseData.data) {
          const rawVerdict = responseData.data.verdict;
          const confidence = responseData.data.confidence;
          const remaining = responseData.scansRemaining;

          injectResultOverlay(tab.id, {
            type: normalizeVerdict(rawVerdict),
            confidence,
            remaining
          });
        } else {
          injectResultOverlay(tab.id, {
            type: "error",
            message: responseData.message || "Unknown server error."
          });
        }
      } catch (err) {
        console.error("[Veritas] Scan Error:", err);
        removeScanningBorder(tab.id);
        injectResultOverlay(tab.id, {
          type: "error",
          message: "Failed to connect to the Veritas server."
        });
      }
    });
  }
});