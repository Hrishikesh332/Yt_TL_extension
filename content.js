class YouTubeVideoAssistant {
  constructor() {
    this.sidebar = null;
    this.isSidebarOpen = false;
    this.currentVideoId = null;
    this.videoIndexed = false;
    this.setupVideoDetection();
    this.setupMessageHandlers();
  }

  setupVideoDetection() {
    // Detect when user navigates to a video page
    const observer = new MutationObserver(() => {
      const videoId = this.getCurrentVideoId();
      if (videoId && videoId !== this.currentVideoId) {
        this.currentVideoId = videoId;
        this.onVideoChange();
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
  }

  createSidebar() {
    // Create sidebar container
    const sidebarContainer = document.createElement('div');
    sidebarContainer.id = 'youtube-video-assistant-sidebar';
    sidebarContainer.innerHTML = `
      <button class="close-btn-top" title="Close">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div class="sidebar-body">
        <div class="chat-messages" id="chat-messages">
          <div class="welcome-message">
            <p>Hi! I can help you understand this video better.</p>
            <p>Ask me questions, get summaries, or search for specific topics!</p>
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
            <div class="suggested-prompts">
              <button class="prompt-btn" data-prompt="Generate hashtags and topics">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Generate hashtags and topics</span>
              </button>
              <button class="prompt-btn" data-prompt="Summarize this video">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Summarize this video</span>
              </button>
              <button class="prompt-btn" data-prompt="What are highlighted moments of this video?">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>What are highlighted moments of this video?</span>
              </button>
              <button class="prompt-btn" data-prompt="Chapterize this video">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Chapterize this video</span>
              </button>
              <button class="prompt-btn" data-prompt="Classify this video based on Youtube categories. Output as JSON format.">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Classify this video based on Youtube categories. Output as JSON format.</span>
              </button>
              <button class="prompt-btn" data-prompt="Which audience is the video suitable for, and why?">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Which audience is the video suitable for, and why?</span>
              </button>
              <button class="prompt-btn" data-prompt="Break down the video by main event and timestamp">
                <svg class="lightbulb-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1z"></path>
                  <path d="M12 2C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"></path>
                </svg>
                <span>Break down the video by main event and timestamp</span>
              </button>
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

  toggleSidebar() {
    const sidebar = document.getElementById('youtube-video-assistant-sidebar');
    if (sidebar) {
      this.isSidebarOpen = !this.isSidebarOpen;
      sidebar.classList.toggle('collapsed', !this.isSidebarOpen);
    }
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'toggleSidebar') {
        this.toggleSidebar();
      } else if (request.action === 'streamingUpdate') {
        this.handleStreamingUpdate(request.type, request.data);
      } else if (request.action === 'processingStatusUpdate') {
        this.handleProcessingStatusUpdate(request.step, request.description);
      }
    });
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
    this.theme = 'light';
    
    this.setupEventListeners();
    this.loadSettings();
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

    // Close button
    this.container.querySelector('.close-btn-top').addEventListener('click', () => {
      this.closeSidebar();
    });

    // Expandable section
    const expandBtn = this.container.querySelector('#expand-btn');
    const expandableContent = this.container.querySelector('#expandable-content');
    const expandIcon = this.container.querySelector('.expand-icon');
    const expandCount = this.container.querySelector('.expand-count');
    
    let isExpanded = false;
    
    expandBtn.addEventListener('click', () => {
      isExpanded = !isExpanded;
      
      if (isExpanded) {
        expandableContent.style.maxHeight = expandableContent.scrollHeight + 'px';
        expandIcon.style.transform = 'rotate(180deg)';
        expandCount.style.display = 'none';
      } else {
        expandableContent.style.maxHeight = '0px';
        expandIcon.style.transform = 'rotate(0deg)';
        expandCount.style.display = 'inline';
      }
    });

    // Prompt buttons
    const promptBtns = this.container.querySelectorAll('.prompt-btn');
    promptBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.dataset.prompt;
        this.chatInput.value = prompt;
        this.sendMessage();
      });
    });
  }

  async loadSettings() {
    const result = await chrome.storage.sync.get(['theme']);
    this.theme = result.theme || 'light';
    this.applyTheme();
  }

  applyTheme() {
    this.container.className = `sidebar ${this.theme}-theme`;
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyTheme();
    chrome.storage.sync.set({ theme: this.theme });
  }

  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message) return;

    // Remove welcome message if it exists
    const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

    this.addMessage('user', message);
    this.chatInput.value = '';
    this.chatInput.style.height = 'auto';
    
    // Show initial loading message
    this.showLoadingMessage('Starting video analysis...');

    try {
      const response = await this.processMessage(message);
      this.hideLoadingMessage();
      this.addMessage('assistant', response);
    } catch (error) {
      this.hideLoadingMessage();
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`);
    }
  }

  async processMessage(message) {
    // Check if video is indexed, if not, index it first
    if (!this.videoIndexed) {
      this.updateLoadingMessage('Checking if video needs indexing...');
      await this.indexCurrentVideo();
    }

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

  async indexCurrentVideo() {
    const videoUrl = window.location.href;
    
    try {
      console.log('Checking if video is already indexed...');
      
      // Check if video is already indexed
      console.log('Sending getVideoId message to background script...');
      
      // Add timeout to prevent hanging
      const messagePromise = chrome.runtime.sendMessage({
        action: 'getVideoId',
        videoUrl: videoUrl
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Message timeout after 10 seconds')), 10000);
      });
      
      const existingVideoId = await Promise.race([messagePromise, timeoutPromise]);
      console.log('Received response from background script:', existingVideoId);
      
      if (existingVideoId) {
        console.log('Video already indexed, ID:', existingVideoId);
        this.videoIndexed = true;
        this.updateLoadingMessage('Video already indexed, proceeding with analysis...');
        this.addMessage('assistant', 'Video is already indexed and ready for analysis!');
        return { video_id: existingVideoId, already_indexed: true };
      }
      
      console.log('Video needs indexing, starting processing flow...');
      this.updateLoadingMessage('Video needs indexing, starting processing...');
      
      // Start the comprehensive video processing flow
      await this.showVideoProcessingFlow();
      
      const response = await chrome.runtime.sendMessage({
        action: 'indexVideo',
        videoUrl: videoUrl
      });
      
      console.log('Video indexing complete:', response);
      this.hideVideoProcessingFlow();
      this.videoIndexed = true;
      this.addMessage('assistant', 'Video processing complete! The video is now indexed and ready for AI analysis. You can ask questions, get summaries, or search for specific content!');
      return response;
    } catch (error) {
      console.error('Failed to index video:', error);
      this.hideVideoProcessingFlow();
      this.addMessage('assistant', `Video processing failed: ${error.message}. Please try again.`);
      throw error;
    }
  }

  async showVideoProcessingFlow() {
    // Create a comprehensive processing flow display
    const processingDiv = document.createElement('div');
    processingDiv.className = 'message assistant-message video-processing-flow';
    processingDiv.id = 'video-processing-flow';
    processingDiv.innerHTML = `
      <div class="message-content">
        <div class="processing-header">
          <h3>Video Processing Pipeline</h3>
          <p>Processing your video for AI analysis...</p>
        </div>
        
        <div class="processing-steps">
          <div class="step" id="step-1">
            <div class="step-icon">1</div>
            <div class="step-content">
              <div class="step-title">Downloading Video</div>
              <div class="step-description">Retrieving video content from YouTube</div>
              <div class="step-status">In Progress...</div>
            </div>
          </div>
          
          <div class="step" id="step-2">
            <div class="step-icon">2</div>
            <div class="step-content">
              <div class="step-title">Processing Content</div>
              <div class="step-description">Extracting audio, visual, and text data</div>
              <div class="step-status">Waiting...</div>
            </div>
          </div>
          
          <div class="step" id="step-3">
            <div class="step-icon">3</div>
            <div class="step-content">
              <div class="step-title">Uploading to Twelve Labs</div>
              <div class="step-description">Sending video to AI processing engine</div>
              <div class="step-status">Waiting...</div>
            </div>
          </div>
          
          <div class="step" id="step-4">
            <div class="step-icon">4</div>
            <div class="step-content">
              <div class="step-title">AI Indexing</div>
              <div class="step-description">Creating searchable embeddings and analysis</div>
              <div class="step-status">Waiting...</div>
            </div>
          </div>
          
          <div class="step" id="step-5">
            <div class="step-icon">5</div>
            <div class="step-content">
              <div class="step-title">Ready for Analysis</div>
              <div class="step-description">Video is indexed and ready for questions</div>
              <div class="step-status">Waiting...</div>
            </div>
          </div>
        </div>
        
        <div class="processing-progress">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
          </div>
          <div class="progress-text" id="progress-text">Starting video processing...</div>
        </div>
      </div>
    `;

    this.chatMessages.appendChild(processingDiv);
    this.scrollToBottom();

    // Start the step-by-step animation
    this.animateProcessingSteps();
  }

  animateProcessingSteps() {
    const steps = [
      { id: 'step-1', title: 'Downloading Video', description: 'Retrieving video content from YouTube', duration: 2000 },
      { id: 'step-2', title: 'Processing Content', description: 'Extracting audio, visual, and text data', duration: 3000 },
      { id: 'step-3', title: 'Uploading to Twelve Labs', description: 'Sending video to AI processing engine', duration: 4000 },
      { id: 'step-4', title: 'AI Indexing', description: 'Creating searchable embeddings and analysis', duration: 5000 },
      { id: 'step-5', title: 'Ready for Analysis', description: 'Video is indexed and ready for questions', duration: 1000 }
    ];

    let currentStep = 0;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const processStep = () => {
      if (currentStep < steps.length) {
        const step = steps[currentStep];
        const stepElement = document.getElementById(step.id);
        
        // Update step status
        stepElement.classList.add('active');
        stepElement.querySelector('.step-status').textContent = 'In Progress...';
        
        // Update progress
        const progress = ((currentStep + 1) / steps.length) * 100;
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${step.title}...`;
        
        // Complete step after duration
        setTimeout(() => {
          stepElement.classList.add('completed');
          stepElement.querySelector('.step-status').textContent = 'Completed';
          currentStep++;
          processStep();
        }, step.duration);
      } else {
        // All steps completed
        progressText.textContent = 'Video processing complete! Ready for analysis.';
        progressFill.style.width = '100%';
      }
    };

    processStep();
  }

  hideVideoProcessingFlow() {
    const processingFlow = document.getElementById('video-processing-flow');
    if (processingFlow) {
      processingFlow.remove();
    }
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
      
      // Use the new analyze API for better search results
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeVideo',
        videoId: videoId,
        type: 'search',
        customPrompt: `Search through this video for content related to: "${query}". Provide timestamps and descriptions of relevant segments.`
      });
      return this.formatSearchResults(response, query);
    } catch (error) {
      // Fallback to old search method if analyze fails
      try {
        const fallbackResponse = await chrome.runtime.sendMessage({
          action: 'searchVideo',
          query: query
        });
        return this.formatSearchResults(fallbackResponse, query);
      } catch (fallbackError) {
        throw error;
      }
    }
  }

  formatSearchResults(results, query) {
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
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const timestamp = new Date().toLocaleTimeString();
    messageDiv.innerHTML = `
      <div class="message-content">${this.formatMessageContent(content)}</div>
      <div class="message-time">${timestamp}</div>
    `;

    this.chatMessages.appendChild(messageDiv);
    this.scrollToBottom();
  }

  formatMessageContent(content) {
    // Convert markdown-like formatting to HTML
    let formatted = content
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
      // Line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap consecutive list items in ul tags
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    return formatted;
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
            <label for="api-key">Twelve Labs API Key:</label>
            <input type="password" id="api-key" placeholder="Enter your API key" />
            <button id="save-api-key">Save</button>
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

    modal.querySelector('#save-api-key').addEventListener('click', async () => {
      const apiKey = modal.querySelector('#api-key').value;
      if (apiKey) {
        await chrome.runtime.sendMessage({
          action: 'saveApiKey',
          apiKey: apiKey
        });
        modal.remove();
      }
    });

    // Load current settings
    chrome.storage.sync.get(['apiKey', 'theme']).then(result => {
      modal.querySelector('#api-key').value = result.apiKey || '';
      modal.querySelector('#theme-select').value = result.theme || 'light';
    });
  }

  updateVideoInfo(videoId) {
    this.videoId = videoId;
    this.videoIndexed = false;
    
    // Clear chat messages and show welcome
    this.chatMessages.innerHTML = `
      <div class="welcome-message">
        <p>Hi! I can help you understand this video better.</p>
        <p>Ask me questions, get summaries, or search for specific topics!</p>
      </div>
    `;
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
