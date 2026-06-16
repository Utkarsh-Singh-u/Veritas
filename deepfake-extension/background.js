const BACKEND_URL = "http://localhost:8000/api/v1/ai-service/predict"; // Change to your actual backend URL

function sendAlertToTab(tabId, message) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: (msg) => alert(msg),
    args: [message]
  });
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

    chrome.storage.local.get(['apiKey'], async (result) => {
      const apiKey = result.apiKey;
      if (!apiKey) {
        sendAlertToTab(tab.id, "DeepFake Guard Error: Please click the extension icon and set your API key first!");
        return;
      }

      try {
        // 1. Download the target image data
        const imageResponse = await fetch(imageUrl);
        const blob = await imageResponse.blob();

        const formData = new FormData();
        formData.append("image", blob, "scanned_image.jpg");

        // 2. Transmit to your Node.js backend
        const backendResponse = await fetch(BACKEND_URL, {
          method: "POST",
          headers: {
            "x-api-key": apiKey
          },
          body: formData
        });

        const responseData = await backendResponse.json();

        if (backendResponse.ok && responseData.data) {
          // 3. Extract variables using your precise backend structure
          const verdict = responseData.data.verdict;
          const confidence = responseData.data.confidence;
          const remaining = responseData.scansRemaining;
          
          // 4. Deploy the browser alert over the active website
          sendAlertToTab(
            tab.id, 
            `Analysis Complete! 🛡️\n\n` +
            `Verdict: ${verdict.toUpperCase()}\n` +
            `AI Confidence: ${confidence}%\n\n` +
            `Remaining API Credits: ${remaining}`
          );
        } else {
          sendAlertToTab(tab.id, `Scan Failed: ${responseData.message || "Unknown server error."}`);
        }

      } catch (err) {
        console.error("Extension Scan Error:", err);
        sendAlertToTab(tab.id, "Failed to connect to the DeepFake Guard server. Ensure your backend is running.");
      }
    });
  }
});