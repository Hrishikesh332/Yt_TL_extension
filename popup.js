document.addEventListener('DOMContentLoaded', async () => {
  const openSidebarBtn = document.getElementById('open-sidebar');
  const statusText = document.getElementById('status-text');

  // Check if we're on a YouTube video page
  await checkCurrentPage();
  
  // Setup event listener
  openSidebarBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!tab.url.includes('youtube.com/watch')) {
        statusText.textContent = 'Please navigate to a YouTube video first!';
        statusText.className = 'status-text error';
        return;
      }
      
      // Send message to content script to open sidebar
      await chrome.tabs.sendMessage(tab.id, { action: 'toggleSidebar' });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('Error opening sidebar:', error);
      statusText.textContent = 'Error opening sidebar. Please refresh the page and try again.';
      statusText.className = 'status-text error';
    }
  });
});

async function checkCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const statusText = document.getElementById('status-text');
    const openSidebarBtn = document.getElementById('open-sidebar');
    
    if (tab.url.includes('youtube.com/watch')) {
      statusText.textContent = 'Ready to chat about this video';
      statusText.className = 'status-text success';
      openSidebarBtn.disabled = false;
    } else if (tab.url.includes('youtube.com')) {
      statusText.textContent = 'Navigate to a video to get started';
      statusText.className = 'status-text';
      openSidebarBtn.disabled = true;
    } else {
      statusText.textContent = 'This extension works on YouTube';
      statusText.className = 'status-text';
      openSidebarBtn.disabled = true;
    }
  } catch (error) {
    console.error('Error checking current page:', error);
    const statusText = document.getElementById('status-text');
    statusText.textContent = 'Error checking page';
    statusText.className = 'status-text error';
  }
}
