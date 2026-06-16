document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveBtn = document.getElementById('saveBtn');
  const statusMsg = document.getElementById('statusMsg');

  // Load existing key if available
  chrome.storage.local.get(['apiKey'], (result) => {
    if (result.apiKey) {
      apiKeyInput.value = result.apiKey;
    }
  });

  // Save key on button click
  saveBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (!key) {
      statusMsg.style.color = '#f87171';
      statusMsg.innerText = 'Please enter a valid key.';
      return;
    }

    chrome.storage.local.set({ apiKey: key }, () => {
      statusMsg.style.color = '#34d399';
      statusMsg.innerText = 'API Key saved successfully! ✓';
      setTimeout(() => { statusMsg.innerText = ''; }, 2000);
    });
  });
});