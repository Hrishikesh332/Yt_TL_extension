class YouTubeVideoAssistant {
  constructor() {
    this.sidebar = null;
    this.isSidebarOpen = false;
    this.currentVideoId = null;
    this.videoIndexed = false;
    this.headerFixInterval = null;
    this.setupVideoDetection();
    this.setupMessageHandlers();
    this.setupSidebarCloseListener();
  }

  setupSidebarCloseListener() {
    // Listen for sidebar close events
    window.addEventListener('yt-assistant-sidebar-closed', () => {
      console.log('Sidebar close event received');
      this.sidebar = null;
      this.isSidebarOpen = false;
      
      // Remove layout styles to restore YouTube to normal
      this.removeLayoutStyles();
      
      // Remove responsive layout if NOT on video page
      if (!this.isVideoPage()) {
        this.removeHomepageLayout();
      }
      
      // Remove classes
      document.body.classList.remove('yt-assistant-active');
      document.body.classList.remove('yt-assistant-homepage');
      document.documentElement.classList.remove('yt-assistant-active');
      
      // Update button states
      const playerBtn = document.getElementById('yt-assistant-player-btn');
      if (playerBtn) {
        playerBtn.style.opacity = '0.7';
      }
      
      const headerBtn = document.getElementById('yt-assistant-header-btn');
      if (headerBtn) {
        headerBtn.classList.remove('active');
      }
    });
  }

  setupVideoDetection() {
    // Create sidebar immediately when on YouTube
    this.createSidebar();
    
    // Add header button
    this.addHeaderButton();
    
    // Track current page type for layout changes
    let lastPageType = this.isVideoPage() ? 'video' : 'other';
    
    // Detect when user navigates between pages
    const observer = new MutationObserver(() => {
      const videoId = this.getCurrentVideoId();
      const currentPageType = videoId ? 'video' : 'other';
      
      // Check if page type changed and sidebar is open
      if (currentPageType !== lastPageType && this.isSidebarOpen) {
        console.log(`Page type changed from ${lastPageType} to ${currentPageType}`);
        this.updateLayoutForPageType(currentPageType);
        lastPageType = currentPageType;
      }
      
      // Check if navigated to a new video
      if (videoId && videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.onVideoChange();
      }
      
      // If on video page, check if menu buttons are available and add Ask button
      if (videoId) {
        const topLevelButtons = document.querySelector('ytd-menu-renderer #top-level-buttons-computed');
        const existingBtn = document.getElementById('yt-assistant-menu-btn');
        if (topLevelButtons && !existingBtn) {
          console.log('Menu buttons detected in mutation observer, adding Ask button');
          this.addMenuButton();
        }
      } else if (!videoId && this.currentVideoId) {
        // Navigated away from video page, but keep sidebar open
        this.currentVideoId = null;
        if (this.sidebar) {
          this.sidebar.updateForNonVideoPage();
        }
      } else if (!videoId && !this.currentVideoId && this.sidebar && this.sidebar.videoId) {
        // Initial load or navigated to home page when sidebar exists
        if (this.sidebar) {
          this.sidebar.videoId = null;
          this.sidebar.updateForNonVideoPage();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Check initial video
    this.currentVideoId = this.getCurrentVideoId();
    if (this.currentVideoId) {
      this.onVideoChange();
    }
  }

  updateLayoutForPageType(pageType) {
    if (pageType === 'video') {
      // Video page - remove responsive layout, use original layout
      this.removeHomepageLayout();
      document.body.classList.remove('yt-assistant-homepage');
      this.applyLayoutStyles();
    } else {
      // All other pages (home, history, channels, etc.) - use responsive layout
      document.body.classList.add('yt-assistant-homepage');
      this.applyHomepageLayout();
      
      // Remove non-homepage styles
      const app = document.querySelector('ytd-app');
      if (app) {
        app.style.maxWidth = '';
        app.style.width = '';
      }
      const masthead = document.querySelector('#masthead-container');
      if (masthead) {
        masthead.style.maxWidth = '';
        masthead.style.width = '';
      }
    }
  }

  closeSidebarCompletely() {
    // Clear header fix interval
    if (this.headerFixInterval) {
      clearInterval(this.headerFixInterval);
      this.headerFixInterval = null;
    }
    
    // Remove the injected homepage stylesheet
    const styleEl = document.getElementById('yt-assistant-homepage-styles');
    if (styleEl) {
      styleEl.remove();
    }
    
    if (this.sidebar) {
      // Remove class from body to restore YouTube layout
      document.body.classList.remove('yt-assistant-active');
      document.body.classList.remove('yt-assistant-homepage');
      document.documentElement.classList.remove('yt-assistant-active');
      this.removeLayoutStyles();
      
      const sidebarElement = document.getElementById('youtube-video-assistant-sidebar');
      if (sidebarElement) {
        sidebarElement.remove();
      }
      this.sidebar = null;
      this.isSidebarOpen = false;
      
      // Remove all buttons
      const playerBtn = document.getElementById('yt-assistant-player-btn');
      if (playerBtn) {
        playerBtn.remove();
      }
      
      const menuBtn = document.getElementById('yt-assistant-menu-btn');
      if (menuBtn) {
        menuBtn.remove();
      }
      
      const toggleBtn = document.getElementById('video-assistant-toggle');
      if (toggleBtn) {
        toggleBtn.remove();
      }
      
      const headerBtn = document.getElementById('yt-assistant-header-btn');
      if (headerBtn) {
        headerBtn.remove();
      }
    }
  }

  getCurrentVideoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('v');
  }

  onVideoChange() {
    console.log('Video changed:', this.currentVideoId);
    this.videoIndexed = false;
    
    // Show sidebar if it exists
    if (this.sidebar) {
      this.sidebar.updateVideoInfo(this.currentVideoId);
    } else {
      this.createSidebar();
    }
    
    // Add player control button
    this.addPlayerControlButton();
    
    // Add menu button immediately and also with retry
    this.addMenuButton();
    
    // Also try adding it after a short delay to catch late-loading elements
    setTimeout(() => {
      this.addMenuButton();
    }, 100);
    
    setTimeout(() => {
      this.addMenuButton();
    }, 500);
  }

  isHomePage() {
    // Check if we're on the YouTube homepage
    const pathname = window.location.pathname;
    const isHome = pathname === '/' || pathname === '/feed/subscriptions' || pathname === '/feed/trending';
    const hasVideoId = new URLSearchParams(window.location.search).get('v');
    return isHome && !hasVideoId;
  }

  isVideoPage() {
    // Check if we're on a video watch page
    return !!this.getCurrentVideoId();
  }

  createSidebar() {
    // Check if sidebar already exists
    if (document.getElementById('youtube-video-assistant-sidebar')) {
      return;
    }
    
    // Add class to body to squeeze YouTube content
    document.body.classList.add('yt-assistant-active');
    console.log('Added yt-assistant-active class to body');
    console.log('Body classes:', document.body.className);
    
    // Also add to html element for better coverage
    document.documentElement.classList.add('yt-assistant-active');
    
    // Apply responsive layout to all pages EXCEPT video pages
    if (!this.isVideoPage()) {
      document.body.classList.add('yt-assistant-homepage');
      console.log('Non-video page detected - applying responsive layout');
      this.applyHomepageLayout();
    } else {
      document.body.classList.remove('yt-assistant-homepage');
      // Video pages keep their original layout
      const app = document.querySelector('ytd-app');
      if (app) {
        app.style.maxWidth = 'calc(100vw - 425px)';
        app.style.width = 'calc(100vw - 425px)';
        console.log('Applied inline styles to ytd-app for video page');
      }
      
      const masthead = document.querySelector('#masthead-container');
      if (masthead) {
        masthead.style.maxWidth = 'calc(100vw - 425px)';
        masthead.style.width = 'calc(100vw - 425px)';
        console.log('Applied inline styles to masthead for video page');
      }
    }
    
    document.body.offsetHeight;
    
    // Detect YouTube's theme for initial sidebar theme
    const isYouTubeDark = document.documentElement.hasAttribute('dark') || 
                          document.documentElement.classList.contains('dark');
    const initialTheme = isYouTubeDark ? 'dark' : 'light';
    
    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'youtube-video-assistant-sidebar';
    sidebarContainer.className = `sidebar ${initialTheme}-theme`; // Match YouTube's theme
    sidebarContainer.innerHTML = `
      <div class="sidebar-top-buttons">
        <button class="dark-mode-toggle-btn" title="Toggle Dark Mode">
          <svg class="sun-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>
          <svg class="moon-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
        </button>
        <button class="close-btn-top" title="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="sidebar-body">
        <div class="chat-messages" id="chat-messages">
          <div class="welcome-message">
            <p>👋 Hi! I'm your YouTube Assistant.</p>
            <p>I can help you find videos, index them for analysis, and answer questions about videos.</p>
            <p><strong>Try asking:</strong> "Find videos about machine learning" or "Search for Python tutorials"</p>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        
        <div class="expandable-section">
          <div class="expandable-trigger" id="expandable-trigger">
            <span class="expandable-text">Try our suggested prompts with your selected video</span>
            <button class="expand-btn" id="expand-btn">
              <span class="expand-count">+7 more</span>
              <svg class="expand-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </button>
          </div>
          <div class="expandable-content" id="expandable-content">
            <div class="suggested-prompts" id="suggested-prompts">
            </div>
          </div>
        </div>
        <div class="input-container">
          <div class="textarea-wrapper">
            <textarea id="chat-input" placeholder="Ask any question..." rows="1"></textarea>
            <button id="send-btn" class="send-btn-inside">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22,2 15,22 11,13 2,9 22,2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Add to page
    document.body.appendChild(sidebarContainer);
    
    // Force a reflow to ensure styles are applied
    sidebarContainer.offsetHeight;
    
    this.sidebar = new SidebarManager(sidebarContainer, this.currentVideoId);
    this.isSidebarOpen = true;

    // Add toggle button to YouTube interface
    this.addToggleButton();
  }

  addToggleButton() {
    // Find a good place to add the toggle button (near video controls)
    const playerContainer = document.querySelector('#movie_player') || 
                           document.querySelector('#player') ||
                           document.querySelector('.html5-video-player');
    
    if (playerContainer) {
      const toggleButton = document.createElement('button');
      toggleButton.id = 'video-assistant-toggle';
      toggleButton.innerHTML = 'VA';
      toggleButton.title = 'Open Video Assistant';
      toggleButton.className = 'video-assistant-toggle-btn';
      
      toggleButton.addEventListener('click', () => {
        this.toggleSidebar();
      });

      // Position the button
      playerContainer.style.position = 'relative';
      playerContainer.appendChild(toggleButton);
    }
  }

  addPlayerControlButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('yt-assistant-player-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // Wait for player controls to be ready
    const checkControls = setInterval(() => {
      const rightControls = document.querySelector('.ytp-right-controls');
      
      if (rightControls) {
        clearInterval(checkControls);
        
        // Create button
        const button = document.createElement('button');
        button.id = 'yt-assistant-player-btn';
        button.className = 'ytp-button yt-assistant-player-button';
        button.title = 'Toggle AI Video Assistant';
        button.setAttribute('aria-label', 'Toggle AI Video Assistant');
        
        // Add extension icon
        const iconUrl = chrome.runtime.getURL('icons/logo_control.png');
        button.innerHTML = `
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <img src="${iconUrl}" alt="AI Assistant" style="width: 28px; height: 28px; display: block; object-fit: contain; pointer-events: none;">
          </div>
        `;
        
        // Add click handler - using both click and mousedown for reliability
        const handleClick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('Player button clicked!');
          this.toggleSidebar();
        };
        
        button.addEventListener('click', handleClick, true);
        button.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        }, true);
        
        // Set initial opacity based on sidebar state
        button.style.opacity = this.isSidebarOpen ? '1' : '0.7';
        
        // Insert as first child of right controls
        rightControls.insertBefore(button, rightControls.firstChild);
      }
    }, 100);
    
    // Clear interval after 10 seconds if controls not found
    setTimeout(() => clearInterval(checkControls), 10000);
  }

  addHeaderButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('yt-assistant-header-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // Wait for search container to be ready
    const checkHeader = setInterval(() => {
      // Look for the search container - try multiple selectors
      let targetContainer = null;
      
      // Try to find the voice search button container
      const voiceSearchBtn = document.querySelector('#voice-search-button') ||
                            document.querySelector('ytd-masthead #voice-search-button');
      
      if (voiceSearchBtn) {
        targetContainer = voiceSearchBtn.parentElement;
        console.log('Found voice search button container');
      } else {
        // Fallback: look for search box
        const searchBox = document.querySelector('#search') || 
                         document.querySelector('ytd-searchbox');
        if (searchBox) {
          targetContainer = searchBox;
          console.log('Found search box as fallback');
        }
      }
      
      if (targetContainer) {
        clearInterval(checkHeader);
        console.log('Adding Twelve Labs button to header');
        
        // Create button
        const button = document.createElement('button');
        button.id = 'yt-assistant-header-btn';
        button.className = 'yt-assistant-header-button';
        button.title = 'Ask AI Assistant';
        button.setAttribute('aria-label', 'Ask AI Assistant');
        
        // Add "Ask" text and logo
        const iconUrl = chrome.runtime.getURL('icons/logo_control.png');
        button.innerHTML = `
          <span class="yt-assistant-header-text">Ask</span>
          <div class="yt-assistant-header-icon">
            <img src="${iconUrl}" alt="AI" />
          </div>
        `;
        
        // Add click handler
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Header Twelve Labs button clicked!');
          this.toggleSidebar();
        });
        
        // Set initial state based on sidebar
        if (this.isSidebarOpen) {
          button.classList.add('active');
        }
        
        // Insert after the target container
        if (voiceSearchBtn) {
          // Insert right after voice search button
          voiceSearchBtn.parentElement.insertBefore(button, voiceSearchBtn.nextSibling);
        } else {
          // Insert after search box
          targetContainer.parentElement.insertBefore(button, targetContainer.nextSibling);
        }
        
        console.log('Twelve Labs button added to header at position:', button.getBoundingClientRect());
      }
    }, 500);
    
    // Clear interval after 10 seconds if not found
    setTimeout(() => {
      clearInterval(checkHeader);
      console.log('Stopped looking for search container');
    }, 10000);
  }

  addMenuButton() {
    // Remove existing button if any
    const existingBtn = document.getElementById('yt-assistant-menu-btn');
    if (existingBtn) {
      existingBtn.remove();
    }

    // Wait for menu renderer to be ready - check more frequently
    const checkMenu = setInterval(() => {
      // Look for the segmented like/dislike button or top level buttons
      const topLevelButtons = document.querySelector('ytd-menu-renderer #top-level-buttons-computed');
      
      if (topLevelButtons) {
        clearInterval(checkMenu);
        console.log('Found top level buttons, adding Ask button');
        
        // Check if button already exists
        const existingBtn = document.getElementById('yt-assistant-menu-btn');
        if (existingBtn) {
          console.log('Ask button already exists, skipping');
          return;
        }
        
        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.id = 'yt-assistant-menu-btn';
        buttonContainer.className = 'yt-assistant-menu-button';
        buttonContainer.style.cssText = 'display: inline-flex; align-items: center; margin-left: 8px;';
        
        // Add extension icon and text
        const iconUrl = chrome.runtime.getURL('icons/logo_control.png');
        buttonContainer.innerHTML = `
          <button class="yt-assistant-ask-button" style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 0 16px;
            height: 36px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 18px;
            cursor: pointer;
            transition: all 0.2s ease;
            color: #fff;
            font-family: Roboto, Arial, sans-serif;
            font-size: 14px;
            font-weight: 500;
            line-height: 36px;
          ">
            <img src="${iconUrl}" alt="AI" style="width: 20px; height: 20px; display: block;">
            <span>Ask</span>
          </button>
        `;
        
        // Add click handler
        const button = buttonContainer.querySelector('button');
        button.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('Menu Ask button clicked!');
          this.toggleSidebar();
        });
        
        // Add hover effect
        button.addEventListener('mouseenter', () => {
          button.style.background = 'rgba(255, 255, 255, 0.2)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.background = 'rgba(255, 255, 255, 0.1)';
        });
        
        // Find the Share button and insert after it
        const shareButton = topLevelButtons.querySelector('ytd-button-renderer:has(yt-button-shape button[aria-label*="Share" i])');
        if (shareButton && shareButton.nextSibling) {
          // Insert after Share button
          topLevelButtons.insertBefore(buttonContainer, shareButton.nextSibling);
          console.log('Ask button added after Share button');
        } else {
          // Fallback: append to the end
          topLevelButtons.appendChild(buttonContainer);
          console.log('Ask button added at the end');
        }
      }
    }, 100); // Check every 100ms instead of 500ms
    
    // Clear interval after 5 seconds if menu not found
    setTimeout(() => {
      clearInterval(checkMenu);
      console.log('Stopped looking for menu buttons');
    }, 5000);
  }

  toggleSidebar() {
    const sidebar = document.getElementById('youtube-video-assistant-sidebar');
    
    if (sidebar) {
      // Sidebar exists, toggle visibility
      this.isSidebarOpen = !this.isSidebarOpen;
      if (this.isSidebarOpen) {
        sidebar.classList.remove('collapsed');
        document.body.classList.add('yt-assistant-active');
        document.documentElement.classList.add('yt-assistant-active');
        this.applyLayoutStyles();
        
        // Also apply responsive layout if NOT on video page
        if (!this.isVideoPage()) {
          document.body.classList.add('yt-assistant-homepage');
          this.applyHomepageLayout();
        }
      } else {
        sidebar.classList.add('collapsed');
        document.body.classList.remove('yt-assistant-active');
        document.documentElement.classList.remove('yt-assistant-active');
        this.removeLayoutStyles();
        
        // Also remove responsive layout if NOT on video page
        if (!this.isVideoPage()) {
          this.removeHomepageLayout();
        }
      }
      
      // Update button states
      const playerBtn = document.getElementById('yt-assistant-player-btn');
      if (playerBtn) {
        playerBtn.style.opacity = this.isSidebarOpen ? '1' : '0.7';
      }
      
      const headerBtn = document.getElementById('yt-assistant-header-btn');
      if (headerBtn) {
        if (this.isSidebarOpen) {
          headerBtn.classList.add('active');
        } else {
          headerBtn.classList.remove('active');
        }
      }
      
      console.log('Sidebar toggled, open:', this.isSidebarOpen);
    } else {
      // Sidebar doesn't exist, recreate it
      console.log('Sidebar was closed, recreating...');
      this.createSidebar();
      this.isSidebarOpen = true;
      
      // Update button states
      const playerBtn = document.getElementById('yt-assistant-player-btn');
      if (playerBtn) {
        playerBtn.style.opacity = '1';
      }
      
      const headerBtn = document.getElementById('yt-assistant-header-btn');
      if (headerBtn) {
        headerBtn.classList.add('active');
      }
    }
  }

  applyHomepageLayout() {
    const sidebarWidth = 400;
    const viewportWidth = window.innerWidth;
    // Calculate scale so content fills up to sidebar without overlap
    // +150 provides minimal gap without overlapping at 100% zoom
    const scale = (viewportWidth - sidebarWidth + 150) / viewportWidth;
    
    // Move sidebar to html element so it's not affected by body zoom
    const sidebar = document.getElementById('youtube-video-assistant-sidebar');
    if (sidebar && sidebar.parentElement === document.body) {
      document.documentElement.appendChild(sidebar);
    }
    
    // Inject styles - zoom only body, sidebar stays normal
    let styleEl = document.getElementById('yt-assistant-homepage-styles');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'yt-assistant-homepage-styles';
      document.head.appendChild(styleEl);
    }
    
    // Zoom body to make YouTube think viewport is smaller
    // Sidebar is on html so it stays at normal size
    styleEl.textContent = `
      body {
        zoom: ${scale} !important;
        -moz-transform: scale(${scale}) !important;
        -moz-transform-origin: top left !important;
        width: 100% !important;
      }
      
      /* Hide the Create button */
      ytd-masthead #buttons ytd-button-renderer.style-scope.ytd-masthead,
      ytd-topbar-menu-button-renderer[button-renderer*="CREATE"],
      #buttons > ytd-button-renderer,
      a[href="/upload"] {
        display: none !important;
      }
      
      /* Sidebar stays at normal size */
      #youtube-video-assistant-sidebar {
        zoom: ${1/scale} !important;
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        height: 100vh !important;
        width: ${sidebarWidth}px !important;
        z-index: 99999 !important;
      }
    `;
    
    console.log('Homepage layout applied - body zoom:', scale);
  }

  removeHomepageLayout() {
    // Clear the header fix interval if it exists
    if (this.headerFixInterval) {
      clearInterval(this.headerFixInterval);
      this.headerFixInterval = null;
    }
    
    // Move sidebar back to body
    const sidebar = document.getElementById('youtube-video-assistant-sidebar');
    if (sidebar && sidebar.parentElement === document.documentElement) {
      document.body.appendChild(sidebar);
    }
    
    // Remove the injected stylesheet
    const styleEl = document.getElementById('yt-assistant-homepage-styles');
    if (styleEl) {
      styleEl.remove();
    }
    
    document.body.classList.remove('yt-assistant-homepage');
    
    console.log('Homepage layout removed - YouTube back to normal');
  }

  applyLayoutStyles() {
    // Check if we're on homepage
    if (this.isHomePage()) {
      document.body.classList.add('yt-assistant-homepage');
      this.applyHomepageLayout();
      return;
    }
    
    document.body.classList.remove('yt-assistant-homepage');
    
    const app = document.querySelector('ytd-app');
    if (app) {
      app.style.maxWidth = 'calc(100vw - 425px)';
      app.style.width = 'calc(100vw - 425px)';
    }
    
    const masthead = document.querySelector('#masthead-container');
    if (masthead) {
      masthead.style.maxWidth = 'calc(100vw - 425px)';
      masthead.style.width = 'calc(100vw - 425px)';
    }
    
    const pageManager = document.querySelector('#page-manager');
    if (pageManager) {
      pageManager.style.maxWidth = 'calc(100vw - 425px)';
      pageManager.style.width = 'calc(100vw - 425px)';
    }
  }

  removeLayoutStyles() {
    // Remove homepage layout if applicable
    this.removeHomepageLayout();
    
    const app = document.querySelector('ytd-app');
    if (app) {
      app.style.maxWidth = '';
      app.style.width = '';
    }
    
    const masthead = document.querySelector('#masthead-container');
    if (masthead) {
      masthead.style.maxWidth = '';
      masthead.style.width = '';
    }
    
    const pageManager = document.querySelector('#page-manager');
    if (pageManager) {
      pageManager.style.maxWidth = '';
      pageManager.style.width = '';
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleSidebar') {
        this.toggleSidebar();
      } else if (request.action === 'streamingChunk') {
        this.handleStreamingChunk(request.chunk, request.fullText, request.found_videos);
      } else if (request.action === 'streamingUpdate') {
        this.handleStreamingUpdate(request.type, request.data);
      } else if (request.action === 'processingStatusUpdate') {
        this.handleProcessingStatusUpdate(request.step, request.description);
      } else if (request.action === 'agenticChatStatus') {
        this.handleAgenticChatStatus(request.message);
      }
    });
  }

  handleAgenticChatStatus(message) {
    if (this.sidebar) {
      this.sidebar.updateLoadingMessage(message);
    }
  }

  handleStreamingChunk(chunk, fullText, foundVideos) {
    if (this.sidebar) {
      this.sidebar.updateStreamingResponse(chunk, fullText, foundVideos);
    }
  }

  handleStreamingUpdate(type, data) {
    // Handle real-time streaming updates from the analyze API
    if (this.sidebar) {
      this.sidebar.handleStreamingUpdate(type, data);
    }
  }

  handleProcessingStatusUpdate(step, description) {
    // Handle real-time processing status updates
    if (this.sidebar) {
      this.sidebar.handleProcessingStatusUpdate(step, description);
    }
  }
}

// Sidebar Manager Class
class SidebarManager {
  constructor(container, videoId) {
    this.container = container;
    this.videoId = videoId;
    this.chatMessages = container.querySelector('#chat-messages');
    this.chatInput = container.querySelector('#chat-input');
    this.sendBtn = container.querySelector('#send-btn');
    
    // Detect YouTube's theme and use it as default
    this.theme = this.detectYouTubeTheme();
    this.videoIndexed = false;
    
    // Store found videos for conversation context (two-step indexing flow)
    this.foundVideos = [];
    
    // Apply the detected theme immediately
    this.applyTheme();
    
    this.setupEventListeners();
    this.loadSettings();
    
    // Only auto-index if we have a video ID
    if (this.videoId) {
      this.autoIndexVideo();
    } else {
      // Keep input enabled for general chat
      this.updateForNonVideoPage();
    }
  }

  // Detect YouTube's current theme (dark or light)
  detectYouTubeTheme() {
    // YouTube uses html[dark] attribute for dark mode
    const isDarkMode = document.documentElement.hasAttribute('dark') || 
                       document.documentElement.classList.contains('dark') ||
                       document.querySelector('html[dark]') !== null;
    
    console.log('YouTube theme detected:', isDarkMode ? 'dark' : 'light');
    return isDarkMode ? 'dark' : 'light';
  }

  setupEventListeners() {
    // Auto-resize textarea
    const autoResize = () => {
      this.chatInput.style.height = 'auto';
      this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    };
    
    this.chatInput.addEventListener('input', autoResize);
    this.chatInput.addEventListener('paste', autoResize);
    
    // Send button and Enter key
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Note: Quick action buttons removed

    // Dark mode toggle button
    const darkModeBtn = this.container.querySelector('.dark-mode-toggle-btn');
    if (darkModeBtn) {
      darkModeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Dark mode toggle clicked, current theme:', this.theme);
        this.toggleTheme();
      });
    } else {
      console.error('Dark mode toggle button not found');
    }

    // Close button
    this.container.querySelector('.close-btn-top').addEventListener('click', () => {
      this.closeSidebar();
    });

    // Expandable section
    this.expandBtn = this.container.querySelector('#expand-btn');
    this.expandableContent = this.container.querySelector('#expandable-content');
    this.expandIcon = this.container.querySelector('.expand-icon');
    this.expandCount = this.container.querySelector('.expand-count');
    
    this.isExpanded = false;
    
    this.expandBtn.addEventListener('click', () => {
      this.toggleExpandableSection();
    });

    // Prompt buttons - use event delegation since prompts are added dynamically
    const promptContainer = this.container.querySelector('#suggested-prompts');
    if (promptContainer) {
      promptContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.prompt-btn');
        if (btn) {
          const prompt = btn.dataset.prompt;
          this.chatInput.value = prompt;
          this.sendMessage();
        }
      });
    }
    
    // Initialize prompts
    this.updateSuggestedPrompts();
  }

  updateSuggestedPrompts() {
    const promptContainer = this.container.querySelector('#suggested-prompts');
    if (!promptContainer) return;

    const expandableText = this.container.querySelector('.expandable-text');
    if (expandableText) {
      expandableText.textContent = this.videoId 
        ? 'Try our suggested prompts with your selected video'
        : 'Try our suggested prompts';
    }

    const videoPrompts = [
      { prompt: 'Generate hashtags and topics', label: 'Generate hashtags and topics' },
      { prompt: 'Summarize this video', label: 'Summarize this video' },
      { prompt: 'What are highlighted moments of this video?', label: 'What are highlighted moments of this video?' },
      { prompt: 'Chapterize this video', label: 'Chapterize this video' },
      { prompt: 'Classify this video based on Youtube categories. Output as JSON format.', label: 'Classify this video based on Youtube categories. Output as JSON format.' },
      { prompt: 'Which audience is the video suitable for, and why?', label: 'Which audience is the video suitable for, and why?' },
      { prompt: 'Break down the video by main event and timestamp', label: 'Break down the video by main event and timestamp' }
    ];

    const mainPagePrompts = [
      { prompt: 'Get 2 videos about cooking recipes', label: 'Get 2 videos about cooking recipes' },
      { prompt: 'Find 3 videos about travel destinations', label: 'Find 3 videos about travel destinations' },
      { prompt: 'Get 2 videos about fitness workouts', label: 'Get 2 videos about fitness workouts' },
      { prompt: 'Find videos about photography tips', label: 'Find videos about photography tips' },
      { prompt: 'Get 2 videos about music production', label: 'Get 2 videos about music production' },
      { prompt: 'Find videos about business strategies', label: 'Find videos about business strategies' },
      { prompt: 'Get 3 videos about science experiments', label: 'Get 3 videos about science experiments' }
    ];

    const prompts = this.videoId ? videoPrompts : mainPagePrompts;

    const svgIcon = `<svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
      <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
    </svg>`;

    promptContainer.innerHTML = prompts.map(p => `
      <button class="prompt-btn" data-prompt="${p.prompt}">
        ${svgIcon}
        <span>${p.label}</span>
      </button>
    `).join('');
  }

  toggleExpandableSection() {
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      this.expandableContent.style.maxHeight = this.expandableContent.scrollHeight + 'px';
      this.expandIcon.style.transform = 'rotate(180deg)';
      this.expandCount.style.display = 'none';
    } else {
      this.expandableContent.style.maxHeight = '0px';
      this.expandIcon.style.transform = 'rotate(0deg)';
      this.expandCount.style.display = 'inline';
    }
  }

  collapseExpandableSection() {
    if (this.isExpanded) {
      this.isExpanded = false;
      this.expandableContent.style.maxHeight = '0px';
      this.expandIcon.style.transform = 'rotate(0deg)';
      this.expandCount.style.display = 'inline';
    }
  }

  async loadSettings() {
    // Always use YouTube's detected theme as default
    // The theme was already set in constructor via detectYouTubeTheme()
    // User can still manually toggle, which will be saved for the session
    console.log('Settings loaded, using YouTube theme:', this.theme);
  }

  applyTheme() {
    if (!this.container) {
      console.error('Container not found, cannot apply theme');
      return;
    }
    
    // Remove any existing theme classes
    this.container.classList.remove('light-theme', 'dark-theme');
    
    // Add the current theme class - ensure sidebar class is always present
    this.container.classList.add('sidebar');
    this.container.classList.add(`${this.theme}-theme`);
    
    // Also set data attribute for CSS selectors
    this.container.setAttribute('data-theme', this.theme);
    
    // Update icon visibility
    const sunIcon = this.container.querySelector('.sun-icon');
    const moonIcon = this.container.querySelector('.moon-icon');
    
    if (sunIcon && moonIcon) {
      if (this.theme === 'dark') {
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
      } else {
        sunIcon.style.display = 'block';
        moonIcon.style.display = 'none';
      }
    } else {
      console.warn('Theme icons not found');
    }
    
    console.log('Theme applied:', this.theme, 'to sidebar, classes:', this.container.className);
  }

  toggleTheme() {
    const oldTheme = this.theme;
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    console.log(`Theme toggled from ${oldTheme} to ${this.theme}`);
    
    // Apply theme immediately
    this.applyTheme();
    
    // Save to storage
    chrome.storage.sync.set({ theme: this.theme }, () => {
      if (chrome.runtime.lastError) {
        console.error('Error saving theme:', chrome.runtime.lastError);
      } else {
        console.log('Theme saved to storage:', this.theme);
      }
    });
  }

  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    // Collapse the expandable section if it's open
    this.collapseExpandableSection();

    // Remove welcome message if it exists
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    this.addMessage('user', message);
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    
    // Show initial loading message
    if (this.videoId) {
      this.showLoadingMessage('Starting video analysis...');
    } else {
      this.showLoadingMessage('Processing your question...');
    }

    // Create a streaming message ID for this request
    this.currentStreamingMessageId = `streaming-${Date.now()}`;
    this.isStreaming = true;

    try {
      const response = await this.processMessage(message);
      
      // Hide loader
      this.hideLoadingMessage();
      
      // Check if response is null (already handled by agenticChat)
      if (response === null) {
        // Already finalized by agenticChat, just clean up
        this.currentStreamingMessageId = null;
        this.isStreaming = false;
        return; // Don't process again
      }
      
      // Check if this was a streaming response that's already been finalized
      const streamingMsg = document.getElementById(this.currentStreamingMessageId);
      if (streamingMsg && this.isStreaming) {
        // Check if message was already finalized (has found_videos means it was handled by agenticChat)
        if (response && response.found_videos) {
          // Already finalized by agenticChat, just clean up
          this.currentStreamingMessageId = null;
          this.isStreaming = false;
          return; // Don't process again
        }
        
        // For video page streaming, finalize it here
        // Get the raw text content
        const textContainer = streamingMsg.querySelector('.streaming-text');
        const rawText = textContainer ? textContainer.textContent : '';
        
        // Format the content with timestamps and markdown
        const messageContent = streamingMsg.querySelector('.message-content');
        if (messageContent && rawText) {
          messageContent.innerHTML = this.formatMessageContent(rawText);
        }
        
        // Apply timestamp click handlers (only if on video page)
        if (this.videoId) {
          this.attachTimestampHandlers(streamingMsg);
        }
        
        streamingMsg.classList.remove('streaming');
        streamingMsg.classList.add('assistant-message');
      } else if (!streamingMsg && response) {
        // No streaming occurred, show the response normally (only if response exists)
        // Format response for better display
        const formattedResponse = typeof response === 'string' ? response : 
                                 (response && response.result && response.result !== null && response.result !== 'null' ? response.result : null) ||
                                 (response && response.response && response.response !== null && response.response !== 'null' ? response.response : null);
        if (formattedResponse && formattedResponse !== null && formattedResponse !== 'null' && formattedResponse !== undefined) {
          this.addMessage('assistant', formattedResponse);
        }
      }
      
      this.currentStreamingMessageId = null;
      this.isStreaming = false;
      
      // Re-enable input after processing
      this.enableInput();
    } catch (error) {
      // Hide loader before showing error
      this.hideLoadingMessage();
      
      // Remove streaming message if exists
      const streamingMsg = document.getElementById(this.currentStreamingMessageId);
      if (streamingMsg) {
        streamingMsg.remove();
      }
      
      // Show user-friendly error message
      this.addMessage('assistant', 'Sorry, I encountered an error processing your question. Please try again or navigate to a video for video-specific questions.');
      console.error('Error processing message:', error);
      this.currentStreamingMessageId = null;
      this.isStreaming = false;
      
      // Re-enable input even on error
      this.enableInput();
    }
  }

  updateStreamingResponse(chunk, fullText, foundVideos) {
    // Hide loading message when first chunk arrives
    this.hideLoadingMessage();
    
    console.log('Streaming chunk received:', chunk, 'Full text so far:', fullText.substring(0, 50) + '...');
    
    // Get or create streaming message
    let streamingMsg = document.getElementById(this.currentStreamingMessageId);
    
    if (!streamingMsg) {
      console.log('Creating new streaming message element');
      streamingMsg = document.createElement('div');
      streamingMsg.id = this.currentStreamingMessageId;
      streamingMsg.className = 'message assistant-message streaming';
      streamingMsg.innerHTML = `
        <div class="message-content">
          <div class="streaming-text"></div>
        </div>
      `;
      this.chatMessages.appendChild(streamingMsg);
      this.scrollToBottom();
    }
    
    // Update the text content with the accumulated text (plain text during streaming)
    const textContainer = streamingMsg.querySelector('.streaming-text');
    if (textContainer) {
      textContainer.textContent = fullText;
    }
    
    // Don't add video cards during streaming - wait for final response
    // Cards will be added in the finalization step
    
    // Auto-scroll to show new content
    this.scrollToBottom();
  }

  createVideoCards(videos) {
    const container = document.createElement('div');
    container.className = 'video-cards-container';
    
    const instructionText = document.createElement('div');
    instructionText.className = 'video-cards-instruction';
    instructionText.textContent = 'Click on the video to chat with';
    container.appendChild(instructionText);
    
    videos.forEach((video, index) => {
      const card = document.createElement('a');
      card.href = video.url;
      // Open in same tab (remove target="_blank")
      card.className = 'video-card';
      card.title = video.title || 'Watch video';
      
      // Add click handler to navigate in same tab
      card.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = video.url;
      });
      
      const thumbnailUrl = video.thumbnail || video.Thumbnail || video.thumbnailUrl || '';
      
      card.innerHTML = `
        <div class="video-card-thumbnail">
          ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="${video.title || 'Video thumbnail'}" loading="lazy" />` : '<div class="video-card-thumbnail-placeholder">No Image</div>'}
          ${video.duration && video.duration !== 'Unknown' ? `<div class="video-card-duration-overlay">${video.duration}</div>` : ''}
        </div>
        <div class="video-card-content">
          <div class="video-card-title">${video.title || 'Untitled Video'}</div>
          <div class="video-card-meta">
            ${video.channelName ? `<span class="video-card-channel">${video.channelName}</span>` : ''}
          </div>
        </div>
      `;
      
      container.appendChild(card);
    });
    
    return container;
  }

  async processMessage(message) {
    // Check if we're on a video page
    if (!this.videoId) {
      // Not on a video page - use agentic chat API
      this.updateLoadingMessage('Processing your request...');
      return await this.agenticChat(message);
    }
    
    // Video should already be indexed by autoIndexVideo
    // Process the message based on content
    if (message.toLowerCase().includes('summarize') || message.toLowerCase().includes('summary')) {
      this.updateLoadingMessage('Preparing to generate video summary...');
      return await this.getVideoSummary();
    } else if (message.toLowerCase().includes('chapter') || message.toLowerCase().includes('chapters')) {
      this.updateLoadingMessage('Preparing to extract video chapters...');
      return await this.getVideoChapters();
    } else if (message.toLowerCase().includes('highlight') || message.toLowerCase().includes('highlights')) {
      this.updateLoadingMessage('Preparing to find video highlights...');
      return await this.getVideoHighlights();
    } else {
      // General search/query
      this.updateLoadingMessage('Preparing to search video content...');
      return await this.searchVideo(message);
    }
  }

  async agenticChat(query) {
    try {
      // Remove welcome message if it exists
      const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
      if (welcomeMessage) {
        welcomeMessage.remove();
      }

      // Create a streaming message ID for this request
      this.currentStreamingMessageId = `streaming-${Date.now()}`;
      this.isStreaming = true;

      // Build conversation context with found videos if available (for two-step indexing flow)
      const conversationContext = {
        found_videos: this.foundVideos || [],
        video_id: this.videoId || null
      };
      
      console.log('Sending agentic chat with context:', { 
        query, 
        foundVideosCount: this.foundVideos?.length || 0 
      });
      
      // Use streaming endpoint for real-time updates
      const response = await chrome.runtime.sendMessage({
        action: 'agenticChatStream',
        query: query,
        conversationContext: conversationContext
      });
      
      // Hide loader
      this.hideLoadingMessage();
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // If streaming message exists, finalize it
      const streamingMsg = document.getElementById(this.currentStreamingMessageId);
      if (streamingMsg && this.isStreaming) {
        // Get the raw text content
        const textContainer = streamingMsg.querySelector('.streaming-text');
        const rawText = textContainer ? textContainer.textContent : '';
        
        // Format the content with markdown
        const messageContent = streamingMsg.querySelector('.message-content');
        if (messageContent) {
          // Clear existing content (removes streaming text and cursor)
          messageContent.innerHTML = '';
          
          // If videos are found, store them for conversation context and show cards
          if (response.found_videos && response.found_videos.length > 0) {
            // Store found videos for the two-step indexing flow
            this.foundVideos = response.found_videos;
            console.log('Stored found videos for context:', this.foundVideos.length);
            
            const cardsContainer = this.createVideoCards(response.found_videos);
            messageContent.appendChild(cardsContainer);
            
            // Show simple confirmation prompt below cards
            const promptDiv = document.createElement('div');
            promptDiv.style.marginTop = '12px';
            promptDiv.style.fontSize = '14px';
            promptDiv.style.lineHeight = '1.5';
            promptDiv.textContent = "Would you like me to index these videos so you can analyze them later? Reply 'yes' to proceed with indexing.";
            messageContent.appendChild(promptDiv);
          } else {
            // Clear found videos if no new videos found (e.g., after indexing)
            if (response.indexed_videos) {
              this.foundVideos = [];
            }
            
            // Only show text if no videos found
            if (rawText && rawText.trim()) {
              const textDiv = document.createElement('div');
              textDiv.innerHTML = this.formatMessageContent(rawText);
              messageContent.appendChild(textDiv);
            }
          }
        }
        
        streamingMsg.classList.remove('streaming');
        streamingMsg.classList.add('assistant-message');
      } else if (!streamingMsg && response) {
        // No streaming occurred, show the response normally (only if response exists and is not null)
        const formattedResponse = typeof response === 'string' ? response : 
                                 (response.result && typeof response.result === 'string' ? response.result : null) ||
                                 (response.response && typeof response.response === 'string' ? response.response : null);
        
        // If videos are found, store them and show cards
        if (response.found_videos && response.found_videos.length > 0) {
          // Store found videos for the two-step indexing flow
          this.foundVideos = response.found_videos;
          console.log('Stored found videos for context:', this.foundVideos.length);
          
          const messageDiv = document.createElement('div');
          messageDiv.className = 'message assistant-message';
          const messageContent = document.createElement('div');
          messageContent.className = 'message-content';
          
          const cardsContainer = this.createVideoCards(response.found_videos);
          messageContent.appendChild(cardsContainer);
          
          // Show simple confirmation prompt below cards
          const promptDiv = document.createElement('div');
          promptDiv.style.marginTop = '12px';
          promptDiv.style.fontSize = '14px';
          promptDiv.style.lineHeight = '1.5';
          promptDiv.textContent = "Would you like me to index these videos so you can analyze them later? Reply 'yes' to proceed with indexing.";
          messageContent.appendChild(promptDiv);
          
          messageDiv.appendChild(messageContent);
          this.chatMessages.appendChild(messageDiv);
          this.scrollToBottom();
        } else {
          // Clear found videos if indexed
          if (response.indexed_videos) {
            this.foundVideos = [];
          }
          
          if (formattedResponse && formattedResponse !== 'null') {
            // Only show text if no videos found
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message assistant-message';
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            
            messageContent.innerHTML = this.formatMessageContent(formattedResponse);
            
            messageDiv.appendChild(messageContent);
            this.chatMessages.appendChild(messageDiv);
            this.scrollToBottom();
          }
        }
      }
      
      this.currentStreamingMessageId = null;
      this.isStreaming = false;
      
      // Re-enable input after response is complete
      this.enableInput();
      
      // Return null to prevent sendMessage from processing again
      // The streaming message has already been finalized above
      return null;
    } catch (error) {
      // Hide loader before showing error
      this.hideLoadingMessage();
      
      // Remove streaming message if exists
      const streamingMsg = document.getElementById(this.currentStreamingMessageId);
      if (streamingMsg) {
        streamingMsg.remove();
      }
      
      console.error('Agentic chat error:', error);
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}. Please try again.`);
      this.currentStreamingMessageId = null;
      this.isStreaming = false;
      
      // Re-enable input even on error
      this.enableInput();
      throw error;
    }
  }

  async autoIndexVideo() {
    // Disable input area during indexing
    this.disableInput('Indexing video, please wait...');
    
    // Remove welcome message
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }
    
    // Show loading message
    this.showLoadingMessage('Checking if video is already indexed...');
    
    try {
      const videoUrl = window.location.href;
      
      // Check if video is already indexed
      const existingVideoId = await chrome.runtime.sendMessage({
        action: 'getVideoId',
        videoUrl: videoUrl
      });
      
      if (existingVideoId) {
        console.log('Video already indexed, ID:', existingVideoId);
        this.videoIndexed = true;
        this.hideLoadingMessage();
        this.enableInput();
        return;
      }
      
      // Video needs indexing
      this.updateLoadingMessage('Indexing video, this may take a few minutes...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'indexVideo',
        videoUrl: videoUrl
      });
      
      console.log('Video indexing complete:', response);
      this.videoIndexed = true;
      this.hideLoadingMessage();
      this.addMessage('assistant', '✅ Video indexed successfully! You can now ask questions, get summaries, or search for specific content.');
      this.enableInput();
      
    } catch (error) {
      console.error('Failed to index video:', error);
      this.hideLoadingMessage();
      // Don't show error message in UI, just log to console
      this.enableInput();
    }
  }

  disableInput(placeholder = 'Please wait...') {
    this.chatInput.disabled = true;
    this.chatInput.placeholder = placeholder;
    this.sendBtn.disabled = true;
    this.chatInput.style.opacity = '0.6';
    this.sendBtn.style.opacity = '0.6';
  }

  enableInput() {
    this.chatInput.disabled = false;
    this.chatInput.placeholder = this.videoId ? 'Ask about this video...' : 'Ask any question...';
    this.sendBtn.disabled = false;
    this.chatInput.style.opacity = '1';
    this.sendBtn.style.opacity = '1';
  }



  handleProcessingStatusUpdate(step, description) {
    // Update the processing flow with real-time status
    const stepElements = {
      'Downloading Video': 'step-1',
      'Processing Content': 'step-2',
      'Uploading to Twelve Labs': 'step-3',
      'AI Indexing': 'step-4',
      'Ready for Analysis': 'step-5'
    };

    const stepId = stepElements[step];
    if (stepId) {
      const stepElement = document.getElementById(stepId);
      if (stepElement) {
        // Mark as active
        stepElement.classList.add('active');
        stepElement.querySelector('.step-status').textContent = 'In Progress...';
        
        // Update description if provided
        if (description) {
          stepElement.querySelector('.step-description').textContent = description;
        }
      }
    }

    // Update progress text
    const progressText = document.getElementById('progress-text');
    if (progressText) {
      progressText.textContent = `${step}...`;
    }
  }

  showIndexingProgress(message) {
    const progressDiv = document.createElement('div');
    progressDiv.className = 'message assistant-message indexing-progress';
    progressDiv.innerHTML = `
      <div class="message-content">
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
          <span class="progress-text">${message}</span>
        </div>
      </div>
    `;
    progressDiv.id = 'indexing-progress';
    this.chatMessages.appendChild(progressDiv);
    this.scrollToBottom();
  }

  hideIndexingProgress() {
    const progressIndicator = document.getElementById('indexing-progress');
    if (progressIndicator) {
      progressIndicator.remove();
    }
  }

  async getVideoSummary() {
    try {
      this.updateLoadingMessage('Connecting to AI analysis service...');
      
      const videoId = await this.getTwelveLabsVideoId();
      if (!videoId) {
        throw new Error('Video not indexed yet. Please wait for indexing to complete.');
      }
      
      this.updateLoadingMessage('AI is analyzing video content...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoId: videoId,
        type: 'summary'
      });
      
      this.updateLoadingMessage('Formatting summary response...');
      return this.formatSummaryResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async getVideoChapters() {
    try {
      this.updateLoadingMessage('Connecting to AI analysis service...');
      
      const videoId = await this.getTwelveLabsVideoId();
      if (!videoId) {
        throw new Error('Video not indexed yet. Please wait for indexing to complete.');
      }
      
      this.updateLoadingMessage('AI is analyzing video structure...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoId: videoId,
        type: 'chapters'
      });
      
      this.updateLoadingMessage('Formatting chapters response...');
      return this.formatChaptersResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async getVideoHighlights() {
    try {
      this.updateLoadingMessage('Connecting to AI analysis service...');
      
      const videoId = await this.getTwelveLabsVideoId();
      if (!videoId) {
        throw new Error('Video not indexed yet. Please wait for indexing to complete.');
      }
      
      this.updateLoadingMessage('AI is identifying key moments...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoId: videoId,
        type: 'highlights'
      });
      
      this.updateLoadingMessage('Formatting highlights response...');
      return this.formatHighlightsResponse(response);
    } catch (error) {
      throw error;
    }
  }

  async getTwelveLabsVideoId() {
    try {
      console.log('Looking up video ID...');
      this.updateLoadingMessage('Looking up video ID...');
      
      const videoUrl = window.location.href;
      const videoId = await chrome.runtime.sendMessage({
        action: 'getVideoId',
        videoUrl: videoUrl
      });
      
      console.log('Video ID lookup result:', videoId);
      
      if (videoId) {
        console.log('Video ID found:', videoId);
        this.updateLoadingMessage('Video ID found, proceeding with analysis...');
      } else {
        console.log('No video ID found');
        this.updateLoadingMessage('No video ID found - video may not be indexed yet');
      }
      
      return videoId;
    } catch (error) {
      console.error('Error getting video ID:', error);
      this.updateLoadingMessage('Error looking up video ID');
      return null;
    }
  }

  formatSummaryResponse(response) {
    if (response.error) {
      return `Error: ${response.error}`;
    }

    // Handle string result from backend
    if (typeof response.result === 'string') {
      return response.result;
    }

    let formatted = '';
    
    if (response.title) {
      formatted += `**${response.title}**\n\n`;
    }
    
    if (response.summary) {
      formatted += `${response.summary}\n\n`;
    }
    
    if (response.keywords && response.keywords.length > 0) {
      formatted += `**Keywords:** ${response.keywords.join(', ')}`;
    }
    
    return formatted || 'Summary not available';
  }

  formatChaptersResponse(response) {
    if (response.error) {
      return `Error: ${response.error}`;
    }

    // Handle string result from backend
    if (typeof response.result === 'string') {
      return response.result;
    }

    if (!response.chapters || response.chapters.length === 0) {
      return 'No chapters found in this video.';
    }

    let formatted = '**Video Chapters:**\n\n';
    
    response.chapters.forEach((chapter, index) => {
      formatted += `${index + 1}. **${chapter.title}**\n`;
      if (chapter.start_time) {
        formatted += `   Time: ${chapter.start_time}\n`;
      }
      if (chapter.description) {
        formatted += `   Description: ${chapter.description}\n`;
      }
      formatted += '\n';
    });
    
    return formatted;
  }

  formatHighlightsResponse(response) {
    if (response.error) {
      return `Error: ${response.error}`;
    }

    // Handle string result from backend
    if (typeof response.result === 'string') {
      return response.result;
    }

    if (!response.highlights || response.highlights.length === 0) {
      return 'No highlights found in this video.';
    }

    let formatted = '**Video Highlights:**\n\n';
    
    response.highlights.forEach((highlight, index) => {
      const importanceIcon = highlight.importance === 'high' ? 'High' : 
                           highlight.importance === 'medium' ? 'Medium' : 'Low';
      
      formatted += `${index + 1}. ${importanceIcon} **${highlight.timestamp}**\n`;
      formatted += `   ${highlight.description}\n\n`;
    });
    
    return formatted;
  }

  async searchVideo(query) {
    try {
      const videoId = await this.getTwelveLabsVideoId();
      if (!videoId) {
        throw new Error('Video not indexed yet. Please wait for indexing to complete.');
      }
      
      // Use the analyze API for search results
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoId: videoId,
        type: 'open-ended',
        customPrompt: `Search through this video for content related to: "${query}". Provide timestamps and descriptions of relevant segments.`
      });
      return this.formatSearchResults(response, query);
    } catch (error) {
        throw error;
    }
  }

  formatSearchResults(results, query) {
    // Handle string result from backend
    if (typeof results.result === 'string') {
      return results.result;
    }

    // Handle new structured format from analyze API
    if (results.results && Array.isArray(results.results)) {
      if (results.results.length === 0) {
        return `No relevant content found for "${query}".`;
      }

      let formatted = `**Search Results for "${query}":**\n\n`;
      results.results.forEach((result, index) => {
        formatted += `${index + 1}. Time: **${result.timestamp}**\n`;
        formatted += `   Description: ${result.description}\n`;
        if (result.relevance_score) {
          formatted += `   Relevance: ${Math.round(result.relevance_score * 100)}%\n`;
        }
        formatted += '\n';
      });
      return formatted;
    }

    // Handle old format from search API
    if (results.data && Array.isArray(results.data)) {
      if (results.data.length === 0) {
        return `No relevant content found for "${query}".`;
      }

      let formatted = `**Search Results for "${query}":**\n\n`;
      results.data.forEach((result, index) => {
        formatted += `${index + 1}. ${result.metadata?.title || 'Video segment'}\n`;
        formatted += `   Time: ${this.formatTime(result.start)} - ${this.formatTime(result.end)}\n`;
        formatted += `   Relevance: ${Math.round(result.score * 100)}%\n\n`;
      });
      return formatted;
    }

    // Handle error cases
    if (results.error) {
      return `Search error: ${results.error}`;
    }

    return `No relevant content found for "${query}".`;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  handleQuickAction(action) {
    const actions = {
      summarize: 'Get a summary of this video',
      chapters: 'Show me the chapters of this video',
      highlights: 'What are the highlights of this video?'
    };

    const message = actions[action];
    if (message) {
      this.chatInput.value = message;
      this.sendMessage();
    }
  }

  addMessage(sender, content) {
    // Don't add message if content is null, undefined, or empty
    if (!content || content === 'null' || content === null || content === undefined) {
      return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const timestamp = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
      <div class="message-content">${this.formatMessageContent(content)}</div>
      <div class="message-time">${timestamp}</div>
    `;

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
    
    // Add click handlers to timestamp buttons
    this.attachTimestampHandlers(messageDiv);
  }

  attachTimestampHandlers(messageDiv) {
    const timestampButtons = messageDiv.querySelectorAll('.timestamp-btn');
    timestampButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const seconds = parseInt(btn.getAttribute('data-seconds'));
        this.seekToTimestamp(seconds);
      });
    });
  }

  seekToTimestamp(seconds) {
    try {
      // Get the YouTube video player
      const video = document.querySelector('video.html5-main-video');
      if (video) {
        video.currentTime = seconds;
        video.play();
        console.log(`Jumped to ${seconds} seconds`);
      } else {
        console.error('YouTube video player not found');
      }
    } catch (error) {
      console.error('Error seeking to timestamp:', error);
    }
  }

  formatMessageContent(content) {
    // Handle null, undefined, or empty content
    if (!content || content === null || content === undefined || content === 'null') {
      return '';
    }
    
    // Convert to string if not already
    let contentStr = typeof content === 'string' ? content : String(content);
    
    // Convert markdown-like formatting to HTML
    let formatted = contentStr
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic text
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`(.*?)`/g, '<code>$1</code>')
      // Headers
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // Lists
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      // YouTube URLs - make them clickable
      .replace(/(https?:\/\/www\.youtube\.com\/watch\?v=[\w-]+|https?:\/\/youtu\.be\/[\w-]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #065fd4; text-decoration: none; word-break: break-all;">$1</a>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap consecutive list items in ul tags
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Convert timestamps to clickable buttons (only if on video page)
    if (this.videoId) {
      formatted = this.formatTimestamps(formatted);
    }
    
    return formatted;
  }

  formatTimestamps(text) {
    // Only handle standard time formats: (00:00), 00:00, (0:00), 0:00, (00:00:00), 00:00:00
    // Do NOT convert seconds-only format like "23s"
    const timestampRegex = /(\()?\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b(\))?/g;
    
    return text.replace(timestampRegex, (match, openParen, hours, minutes, seconds, closeParen) => {
      // Calculate total seconds
      let totalSeconds;
      if (seconds !== undefined) {
        // Format: HH:MM:SS or H:MM:SS
        totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
      } else {
        // Format: MM:SS or M:SS
        totalSeconds = parseInt(hours) * 60 + parseInt(minutes);
      }
      
      // Create clickable timestamp button
      const displayTime = openParen ? `(${hours}:${minutes}${seconds ? ':' + seconds : ''})` : `${hours}:${minutes}${seconds ? ':' + seconds : ''}`;
      
      return `<button class="timestamp-btn" data-seconds="${totalSeconds}" title="Jump to ${displayTime}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
          <path d="M12 6v6l4 2"/>
        </svg>
        <span>${displayTime}</span>
      </button>`;
    });
  }

  showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message assistant-message typing-indicator';
    typingDiv.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
    typingDiv.id = 'typing-indicator';
    this.chatMessages.appendChild(typingDiv);
    this.scrollToBottom();
  }

  showLoadingMessage(message) {
    console.log('Creating loading message:', message);
    
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message assistant-message loading-message';
    loadingDiv.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    `;
    loadingDiv.id = 'loading-message';
    
    if (this.chatMessages) {
      this.chatMessages.appendChild(loadingDiv);
      this.scrollToBottom();
      console.log('Loading message created and added to chat');
    } else {
      console.error('Chat messages container not found');
    }
    
    return loadingDiv;
  }

  updateLoadingMessage(message) {
    console.log('Updating loading message:', message);
    
    let loadingDiv = document.getElementById('loading-message');
    
    // If loading message doesn't exist, create it
    if (!loadingDiv) {
      console.log('Creating new loading message');
      loadingDiv = this.showLoadingMessage(message);
      return loadingDiv;
    }
    
    // Update existing loading message
    const loadingText = loadingDiv.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = message;
      console.log('Loading message updated successfully');
    } else {
      console.error('Loading text element not found');
    }
    
    return loadingDiv;
  }

  hideLoadingMessage() {
    const loadingDiv = document.getElementById('loading-message');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }

  hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  scrollToBottom() {
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }

  closeSidebar() {
    // Notify parent that sidebar is closing
    window.dispatchEvent(new CustomEvent('yt-assistant-sidebar-closed'));
    
    // Remove classes from body to restore YouTube layout
    document.body.classList.remove('yt-assistant-active');
    document.body.classList.remove('yt-assistant-homepage');
    document.documentElement.classList.remove('yt-assistant-active');
    
    this.container.remove();
    const toggleBtn = document.getElementById('video-assistant-toggle');
    if (toggleBtn) {
      toggleBtn.remove();
    }
  }

  minimizeSidebar() {
    this.container.classList.toggle('minimized');
  }

  openSettings() {
    // Create settings modal
    const modal = document.createElement('div');
    modal.className = 'settings-modal';
    modal.innerHTML = `
      <div class="settings-content">
        <div class="settings-header">
          <h3>Settings</h3>
          <button class="close-settings">✕</button>
        </div>
        <div class="settings-body">
          <div class="setting-item">
            <label for="backend-url">Backend URL:</label>
            <input type="text" id="backend-url" placeholder="https://your-backend-url.com" />
            <button id="save-backend-url">Save</button>
          </div>
          <div class="setting-item">
            <label>Theme:</label>
            <select id="theme-select">
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Setup settings event listeners
    modal.querySelector('.close-settings').addEventListener('click', () => {
      modal.remove();
    });

    modal.querySelector('#save-backend-url').addEventListener('click', async () => {
      const backendUrl = modal.querySelector('#backend-url').value;
      if (backendUrl) {
        await chrome.runtime.sendMessage({
          action: 'saveBackendUrl',
          backendUrl: backendUrl
        });
        modal.remove();
      }
    });

    // Load current settings
    chrome.storage.sync.get(['backendUrl', 'theme']).then(result => {
      modal.querySelector('#backend-url').value = result.backendUrl || '';
      modal.querySelector('#theme-select').value = result.theme || 'light';
    });
  }

  updateVideoInfo(videoId) {
    this.videoId = videoId;
    this.videoIndexed = false;
    
    // Clear chat messages
    this.chatMessages.innerHTML = '';
    
    // Update suggested prompts for video page
    this.updateSuggestedPrompts();
    
    // Restart auto-indexing for the new video
    this.autoIndexVideo();
  }

  updateForNonVideoPage() {
    // Clear chat messages
    this.chatMessages.innerHTML = '';
    
    // Show welcome message for non-video pages
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
      <p>👋 Hi! I'm your YouTube Assistant.</p>
      <p>I can help you find videos, index them for analysis, and answer questions about videos.</p>
    `;
    this.chatMessages.appendChild(welcomeDiv);
    
    // Update suggested prompts for main page
    this.updateSuggestedPrompts();
    
    // Keep input enabled - chat is always available
    this.enableInput();
    this.chatInput.placeholder = 'Ask any question...';
    this.videoId = null;
    this.videoIndexed = false;
  }

  handleStreamingUpdate(type, data) {
    // Handle real-time streaming updates from the analyze API
    const streamingMessage = document.getElementById('streaming-message');
    
    if (!streamingMessage) {
      // Create a new streaming message if it doesn't exist
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message assistant-message streaming-message';
      messageDiv.id = 'streaming-message';
      messageDiv.innerHTML = `
        <div class="message-content">
          <div class="streaming-content" id="streaming-content">
            Analyzing video...
          </div>
        </div>
      `;
      this.chatMessages.appendChild(messageDiv);
      this.scrollToBottom();
    }

    // Update the streaming content
    const streamingContent = document.getElementById('streaming-content');
    if (streamingContent && data) {
      // Parse and display the streaming data
      let content = '';
      
      if (data.data) {
        try {
          const parsed = JSON.parse(data.data);
          content = this.formatStreamingData(type, parsed);
        } catch (error) {
          content = data.data;
        }
      }
      
      streamingContent.innerHTML = content || 'Analyzing video...';
      this.scrollToBottom();
    }
  }

  formatStreamingData(type, data) {
    // Format streaming data based on type
    switch (type) {
      case 'summary':
        let summaryContent = '';
        if (data.title) summaryContent += `**${data.title}**\n\n`;
        if (data.summary) summaryContent += data.summary;
        if (data.keywords && data.keywords.length > 0) {
          summaryContent += `\n\n**Keywords:** ${data.keywords.join(', ')}`;
        }
        return summaryContent || 'Generating summary...';
      
      case 'chapters':
        if (data.chapters && data.chapters.length > 0) {
          let chaptersContent = '**Video Chapters:**\n\n';
          data.chapters.forEach((chapter, index) => {
            chaptersContent += `${index + 1}. **${chapter.title}**\n`;
            if (chapter.start_time) chaptersContent += `   Time: ${chapter.start_time}\n`;
            if (chapter.description) chaptersContent += `   Description: ${chapter.description}\n`;
            chaptersContent += '\n';
          });
          return chaptersContent;
        }
        return 'Analyzing chapters...';
      
      case 'highlights':
        if (data.highlights && data.highlights.length > 0) {
          let highlightsContent = '**Video Highlights:**\n\n';
          data.highlights.forEach((highlight, index) => {
            const importanceIcon = highlight.importance === 'high' ? 'High' : 
                                 highlight.importance === 'medium' ? 'Medium' : 'Low';
            highlightsContent += `${index + 1}. ${importanceIcon} **${highlight.timestamp}**\n`;
            highlightsContent += `   ${highlight.description}\n\n`;
          });
          return highlightsContent;
        }
        return 'Finding highlights...';
      
      default:
        return 'Processing...';
    }
  }
}

// Initialize the extension when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new YouTubeVideoAssistant();
  });
} else {
  new YouTubeVideoAssistant();
}
