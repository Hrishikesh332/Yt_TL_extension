document.addEventListener('DOMContentLoaded', async () => {
  const currentPageEl = document.getElementById('current-page');
  const apiStatusEl = document.getElementById('api-status');
  const apiStatusTextEl = document.getElementById('api-status-text');
  const apiKeyInput = document.getElementById('api-key-input');
  const indexIdInput = document.getElementById('index-id-input');
  const saveConfigBtn = document.getElementById('save-config');
  const openSidebarBtn = document.getElementById('open-sidebar');
  const openSettingsBtn = document.getElementById('open-settings');
  const testApiBtn = document.getElementById('test-api');

  // Check current tab and update status
  await updateCurrentPageStatus();
  
  // Load and check API key status
  await loadApiKeyStatus();
  
  // Setup event listeners
  setupEventListeners();
});

async function updateCurrentPageStatus() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentPageEl = document.getElementById('current-page');
    
    if (tab.url.includes('youtube.com/watch')) {
      currentPageEl.textContent = 'YouTube Video';
      currentPageEl.style.color = '#28a745';
    } else if (tab.url.includes('youtube.com')) {
      currentPageEl.textContent = 'YouTube (Not Video)';
      currentPageEl.style.color = '#ffc107';
    } else {
      currentPageEl.textContent = 'Not YouTube';
      currentPageEl.style.color = '#dc3545';
    }
  } catch (error) {
    console.error('Error checking current page:', error);
    document.getElementById('current-page').textContent = 'Error';
  }
}

async function loadApiKeyStatus() {
  try {
    const result = await chrome.storage.sync.get(['apiKey', 'indexId']);
    const apiKey = result.apiKey;
    const indexId = result.indexId;
    
    const apiKeyInput = document.getElementById('api-key-input');
    const indexIdInput = document.getElementById('index-id-input');
    const apiStatusEl = document.getElementById('api-status');
    const apiStatusTextEl = document.getElementById('api-status-text');
    
    if (apiKey) {
      apiKeyInput.value = apiKey;
    }
    
    if (indexId) {
      indexIdInput.value = indexId;
    } else {
      // Set your configured index ID
      indexIdInput.value = '68ec078f24e2a6f182fe4221';
    }
    
    if (apiKey) {
      apiStatusEl.className = 'status-indicator active';
      apiStatusTextEl.textContent = 'Configured';
      apiStatusTextEl.style.color = '#28a745';
    } else {
      apiStatusEl.className = 'status-indicator inactive';
      apiStatusTextEl.textContent = 'Not Set';
      apiStatusTextEl.style.color = '#dc3545';
    }
  } catch (error) {
    console.error('Error loading API key status:', error);
  }
}

function setupEventListeners() {
  // Save Configuration (API Key + Index ID)
  document.getElementById('save-config').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    const indexId = document.getElementById('index-id-input').value.trim();
    
    if (!apiKey) {
      alert('Please enter an API key');
      return;
    }
    
    if (!indexId) {
      alert('Please enter an Index ID');
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({
        action: 'saveConfig',
        apiKey: apiKey,
        indexId: indexId
      });
      
      // Update status
      await loadApiKeyStatus();
      
      // Show success message
      const saveBtn = document.getElementById('save-config');
      const originalText = saveBtn.textContent;
      saveBtn.textContent = 'Saved!';
      saveBtn.style.background = '#28a745';
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.background = '#28a745';
      }, 2000);
      
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Error saving configuration. Please try again.');
    }
  });
  
  // Open Sidebar
  document.getElementById('open-sidebar').addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('youtube.com/watch')) {
        alert('Please navigate to a YouTube video first!');
        return;
      }
      
      // Send message to content script to open sidebar
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('Error opening sidebar:', error);
      alert('Error opening sidebar. Please refresh the page and try again.');
    }
  });
  
  // Test API Connection
  document.getElementById('test-api').addEventListener('click', async () => {
    const testBtn = document.getElementById('test-api');
    const originalText = testBtn.textContent;
    
    testBtn.textContent = 'Testing...';
    testBtn.disabled = true;
    
    try {
      const result = await chrome.storage.sync.get(['apiKey']);
      const apiKey = result.apiKey;
      
      if (!apiKey) {
        throw new Error('No API key configured');
      }
      
      // Test API by making a simple request
      const response = await chrome.runtime.sendMessage({
        action: 'callTwelveLabsAPI',
        endpoint: '/indexes',
        data: { method: 'GET' }
      });
      
      // Update status
      const apiStatusEl = document.getElementById('api-status');
      const apiStatusTextEl = document.getElementById('api-status-text');
      
      apiStatusEl.className = 'status-indicator active';
      apiStatusTextEl.textContent = 'Connected';
      apiStatusTextEl.style.color = '#28a745';
      
      testBtn.textContent = 'Success!';
      testBtn.style.background = '#28a745';
      
    } catch (error) {
      console.error('API test failed:', error);
      
      const apiStatusEl = document.getElementById('api-status');
      const apiStatusTextEl = document.getElementById('api-status-text');
      
      apiStatusEl.className = 'status-indicator inactive';
      apiStatusTextEl.textContent = 'Failed';
      apiStatusTextEl.style.color = '#dc3545';
      
      testBtn.textContent = 'Failed';
      testBtn.style.background = '#dc3545';
      
    } finally {
      setTimeout(() => {
        testBtn.textContent = originalText;
        testBtn.style.background = '#007bff';
        testBtn.disabled = false;
      }, 3000);
    }
  });
  
  // Open Settings (placeholder for future settings)
  document.getElementById('open-settings').addEventListener('click', () => {
    alert('Settings panel coming soon! For now, you can configure your API key above.');
  });
}
