class BackgroundService {
  constructor() {
    this.setupMessageHandlers();
    this.setupInstallHandlers();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getBackendUrl':
          this.getBackendUrl().then(sendResponse);
          return true;
          
        case 'saveBackendUrl':
          this.saveBackendUrl(request.backendUrl).then(sendResponse);
          return true;
          
        case 'checkBackendHealth':
          this.checkBackendHealth().then(sendResponse);
          return true;
          
        case 'indexVideo':
          this.indexVideo(request.videoUrl, sender.tab.id).then(sendResponse);
          return true;
          
        case 'analyzeVideo':
          this.analyzeVideo(request.videoId, request.type, request.prompt, request.customPrompt, sender.tab.id).then(sendResponse);
          return true;
          
        case 'analyzeVideoStream':
          this.analyzeVideoStream(request.videoId, request.type, request.prompt, request.customPrompt, sender.tab.id).then(sendResponse);
          return true;
          
        case 'getVideoId':
          console.log('Background: Received getVideoId request for:', request.videoUrl);
          this.getVideoId(request.videoUrl).then(result => {
            console.log('Background: Sending getVideoId response:', result);
            sendResponse(result);
          }).catch(error => {
            console.error('Background: Error in getVideoId:', error);
            sendResponse(null);
          });
          return true;
          
        case 'test':
          console.log('Background: Received test message');
          sendResponse({status: 'ok', timestamp: Date.now()});
          return true;
      }
    });
  }

  setupInstallHandlers() {
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        // Auto-configure with backend URL (will be replaced by build script)
        chrome.storage.sync.set({
          theme: 'light',
          backendUrl: 'http://localhost:5000',
          autoIndex: true,
          autoConfigured: true,
          configuredAt: new Date().toISOString()
        }, () => {
          console.log('Extension auto-configured with backend URL');
        });
      }
    });
  }

  async getBackendUrl() {
    const result = await chrome.storage.sync.get(['backendUrl']);
    return result.backendUrl || 'http://localhost:5000';
  }

  async saveBackendUrl(backendUrl) {
    await chrome.storage.sync.set({ backendUrl });
    return { success: true };
  }

  async checkBackendHealth() {
    try {
      const backendUrl = await this.getBackendUrl();
      const response = await fetch(`${backendUrl}/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Backend health check error:', error);
      throw new Error(`Cannot connect to backend: ${error.message}`);
    }
  }


  isValidYouTubeUrl(url) {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    return patterns.some(pattern => pattern.test(url));
  }

  async indexVideo(videoUrl, tabId) {
    try {
      // Validate YouTube URL
      if (!this.isValidYouTubeUrl(videoUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      // Get backend URL
      const backendUrl = await this.getBackendUrl();
      if (!backendUrl || backendUrl === 'REPLACE_WITH_BACKEND_URL') {
        throw new Error('Backend URL not configured');
      }

      // Send status update: Downloading Video
      this.sendStatusUpdate(tabId, 'Downloading Video', 'Retrieving video content from YouTube');

      // Send status update: Processing Content
      this.sendStatusUpdate(tabId, 'Processing Content', 'Extracting audio, visual, and text data');
      
      // Send status update: Uploading to Twelve Labs
      this.sendStatusUpdate(tabId, 'Uploading to Twelve Labs', 'Sending video to AI processing engine');
      
      // Call backend API to download and index video
      const response = await fetch(`${backendUrl}/download-and-index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          youtube_url: videoUrl
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Backend request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Send status update: AI Indexing
      this.sendStatusUpdate(tabId, 'AI Indexing', 'Creating searchable embeddings and analysis');
      
      // Store the video ID for future analysis calls
      if (result.video_id) {
        await this.storeVideoId(videoUrl, result.video_id);
        
        // Send final status update
        this.sendStatusUpdate(tabId, 'Ready for Analysis', 'Video is indexed and ready for questions');
        
        // Return the result with the video ID
        return {
          video_id: result.video_id,
          success: true,
          message: result.message
        };
      }
      
      throw new Error('No video_id returned from backend');
    } catch (error) {
      console.error('Video indexing error:', error);
      this.sendStatusUpdate(tabId, 'Error', `Processing failed: ${error.message}`);
      throw error;
    }
  }

  sendStatusUpdate(tabId, step, description) {
    try {
      chrome.tabs.sendMessage(tabId, {
        action: 'processingStatusUpdate',
        step: step,
        description: description,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('Could not send status update:', error);
    }
  }

  async storeVideoId(videoUrl, videoId) {
    try {
      // Store the mapping between YouTube URL and Twelve Labs video ID
      const videoMappings = await chrome.storage.local.get(['videoMappings']) || {};
      const mappings = videoMappings.videoMappings || {};
      
      // Extract YouTube video ID for the key
      const youtubeVideoId = this.extractYouTubeVideoId(videoUrl);
      mappings[youtubeVideoId] = {
        video_id: videoId,
        url: videoUrl,
        timestamp: Date.now()
      };
      
      await chrome.storage.local.set({ videoMappings: mappings });
      console.log('Stored video ID mapping:', youtubeVideoId, '->', videoId);
    } catch (error) {
      console.error('Error storing video ID:', error);
    }
  }

  async getVideoId(videoUrl) {
    try {
      console.log('Background: Extracting YouTube video ID from:', videoUrl);
      const youtubeVideoId = this.extractYouTubeVideoId(videoUrl);
      console.log('Background: Extracted YouTube video ID:', youtubeVideoId);
      
      const videoMappings = await chrome.storage.local.get(['videoMappings']) || {};
      const mappings = videoMappings.videoMappings || {};
      console.log('Background: Current video mappings:', mappings);
      
      if (mappings[youtubeVideoId]) {
        console.log('Background: Found video ID:', mappings[youtubeVideoId].video_id);
        return mappings[youtubeVideoId].video_id;
      }
      
      console.log('Background: No video ID found for:', youtubeVideoId);
      return null;
    } catch (error) {
      console.error('Background: Error getting video ID:', error);
      return null;
    }
  }

  extractYouTubeVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : null;
  }



  async analyzeVideo(videoId, type, prompt = null, customPrompt = null, tabId = null) {
    try {
      const backendUrl = await this.getBackendUrl();
      if (!backendUrl || backendUrl === 'REPLACE_WITH_BACKEND_URL') {
        throw new Error('Backend URL not configured');
      }

      // Send status update
      if (tabId) {
        this.sendStatusUpdate(tabId, 'Preparing Analysis', 'Setting up AI analysis request...');
      }

      // Map analysis types to backend format
      const analysisTypeMap = {
        'summary': 'summary',
        'chapters': 'chapter',
        'highlights': 'highlight',
        'search': 'open-ended',
        'open-ended': 'open-ended'
      };

      const backendAnalysisType = analysisTypeMap[type] || 'open-ended';

      // Build request body
      const requestBody = {
        video_id: videoId,
        analysis_type: backendAnalysisType
      };

      // Add prompt if provided (for open-ended or custom prompts)
      if (prompt || customPrompt) {
        requestBody.prompt = customPrompt || prompt;
      }

      // Send status update
      if (tabId) {
        this.sendStatusUpdate(tabId, 'Connecting to AI', 'Starting streaming analysis...');
      }

      const response = await fetch(`${backendUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Analysis failed: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let metadata = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            // First line contains metadata
            if (data.status === 'success' && data.streaming) {
              metadata = data;
              if (tabId) {
                this.sendStatusUpdate(tabId, 'Streaming Response', 'Receiving AI analysis...');
              }
              continue;
            }

            // Text chunks
            if (data.chunk) {
              fullText += data.chunk;
              
              // Send streaming update to content script
              if (tabId) {
                chrome.tabs.sendMessage(tabId, {
                  action: 'streamingChunk',
                  chunk: data.chunk,
                  fullText: fullText
                });
              }
            }

            // Done marker
            if (data.done) {
              console.log('Streaming complete, full text:', fullText);
              break;
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line, e);
          }
        }
      }

      // Return the complete result
      return {
        result: fullText,
        video_id: metadata?.video_id || videoId,
        analysis_type: metadata?.analysis_type || backendAnalysisType,
        success: true,
        streaming: true
      };
    } catch (error) {
      console.error('Video analysis error:', error);
      throw error;
    }
  }
}

// Initialize background service
new BackgroundService();
