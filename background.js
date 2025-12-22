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
          
        case 'agenticChat':
          this.agenticChat(request.query, request.conversationContext, sender.tab.id).then(sendResponse);
          return true;
          
        case 'agenticChatStream':
          this.agenticChatStream(request.query, request.conversationContext, sender.tab.id).then(sendResponse);
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
      const response = await fetch(`${backendUrl}/api/health`);
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
      if (!this.isValidYouTubeUrl(videoUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      const backendUrl = await this.getBackendUrl();
      if (!backendUrl || backendUrl === 'REPLACE_WITH_BACKEND_URL') {
        throw new Error('Backend URL not configured');
      }

      this.sendStatusUpdate(tabId, 'Downloading Video', 'Retrieving video content from YouTube');
      this.sendStatusUpdate(tabId, 'Processing Content', 'Extracting audio, visual, and text data');
      this.sendStatusUpdate(tabId, 'Uploading to Twelve Labs', 'Sending video to AI processing engine');
      
      const response = await fetch(`${backendUrl}/api/download-and-index`, {
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

      this.sendStatusUpdate(tabId, 'AI Indexing', 'Creating searchable embeddings and analysis');
      
      if (result.video_id) {
        await this.storeVideoId(videoUrl, result.video_id);
        this.sendStatusUpdate(tabId, 'Ready for Analysis', 'Video is indexed and ready for questions');
        
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
      const videoMappings = await chrome.storage.local.get(['videoMappings']) || {};
      const mappings = videoMappings.videoMappings || {};
      
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

      if (tabId) {
        this.sendStatusUpdate(tabId, 'Preparing Analysis', 'Setting up AI analysis request...');
      }

      const analysisTypeMap = {
        'summary': 'summary',
        'chapters': 'chapter',
        'highlights': 'highlight',
        'search': 'open-ended',
        'open-ended': 'open-ended'
      };

      const backendAnalysisType = analysisTypeMap[type] || 'open-ended';

      const requestBody = {
        video_id: videoId,
        analysis_type: backendAnalysisType
      };

      if (prompt || customPrompt) {
        requestBody.prompt = customPrompt || prompt;
      }

      if (tabId) {
        this.sendStatusUpdate(tabId, 'Connecting to AI', 'Starting streaming analysis...');
      }

      const response = await fetch(`${backendUrl}/api/analyze`, {
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
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.status === 'success' && data.streaming) {
              metadata = data;
              if (tabId) {
                this.sendStatusUpdate(tabId, 'Streaming Response', 'Receiving AI analysis...');
              }
              continue;
            }

            if (data.chunk) {
              fullText += data.chunk;
              
              if (tabId) {
                chrome.tabs.sendMessage(tabId, {
                  action: 'streamingChunk',
                  chunk: data.chunk,
                  fullText: fullText
                });
              }
            }

            if (data.done) {
              console.log('Streaming complete, full text:', fullText);
              break;
            }
          } catch (e) {
            console.warn('Failed to parse NDJSON line:', line, e);
          }
        }
      }

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

  async agenticChat(query, conversationContext = {}, tabId = null) {
    try {
      const backendUrl = await this.getBackendUrl();
      if (!backendUrl || backendUrl === 'REPLACE_WITH_BACKEND_URL') {
        throw new Error('Backend URL not configured');
      }

      if (tabId) {
        this.sendStatusUpdate(tabId, 'Processing Query', 'Understanding your request...');
      }

      const response = await fetch(`${backendUrl}/api/agentic-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          conversation_context: conversationContext
        })
      });

      if (tabId) {
        this.sendStatusUpdate(tabId, 'Processing Response', 'Getting results from AI...');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Backend request failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      let formattedResponse = result.response || 'I processed your request.';

      if (result.found_videos && result.found_videos.length > 0) {
        formattedResponse += '\n\n**Found Videos:**\n\n';
        result.found_videos.forEach((video, index) => {
          formattedResponse += `${index + 1}. **${video.title || 'Untitled'}**\n`;
          if (video.channelName) {
            formattedResponse += `   📺 Channel: ${video.channelName}\n`;
          }
          if (video.duration && video.duration !== 'Unknown') {
            formattedResponse += `   ⏱️ Duration: ${video.duration}\n`;
          }
          if (video.url) {
            formattedResponse += `   🔗 ${video.url}\n`;
          }
          formattedResponse += '\n';
        });
      }

      if (result.indexed_videos && result.indexed_videos.length > 0) {
        formattedResponse += '\n**Indexed Videos:**\n\n';
        result.indexed_videos.forEach((video, index) => {
          formattedResponse += `${index + 1}. ${video.video_url || video.url || 'Video'} - ${video.status || 'indexed'}\n`;
        });
        formattedResponse += '\n';
      }

      if (result.analysis_result) {
        formattedResponse += '\n**Analysis Result:**\n\n' + result.analysis_result;
      }

      return {
        result: formattedResponse,
        intent: result.intent,
        found_videos: result.found_videos,
        indexed_videos: result.indexed_videos,
        video_id: result.video_id,
        success: true
      };
    } catch (error) {
      console.error('Agentic chat error:', error);
      throw error;
    }
  }

  async agenticChatStream(query, conversationContext = {}, tabId = null) {
    try {
      const backendUrl = await this.getBackendUrl();
      if (!backendUrl || backendUrl === 'REPLACE_WITH_BACKEND_URL') {
        throw new Error('Backend URL not configured');
      }

      if (tabId) {
        this.sendStatusUpdate(tabId, 'Processing Query', 'Understanding your request...');
      }

      const response = await fetch(`${backendUrl}/api/agentic-chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: query,
          conversation_context: conversationContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Backend request failed: ${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullResponse = '';
      let completedData = null;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Handle Server-Sent Events format: data: {...}
          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6);
              const data = JSON.parse(jsonStr);

              if (data.status === 'info' && data.message) {
                if (tabId) {
                  chrome.tabs.sendMessage(tabId, {
                    action: 'agenticChatStatus',
                    status: data.status,
                    message: data.message
                  });
                }
                continue;
              }

              if (data.status === 'success') {
                if (data.message) {
                  if (tabId) {
                    chrome.tabs.sendMessage(tabId, {
                      action: 'agenticChatStatus',
                      status: data.status,
                      message: data.message
                    });
                  }
                }
                continue;
              }

              if (data.status === 'completed') {
                completedData = data;
                fullResponse = data.response || '';
                
                if (fullResponse.startsWith('Intent classified as:')) {
                  fullResponse = fullResponse.replace(/^Intent classified as:\s*/i, '').trim();
                  if (!fullResponse && data.found_videos && data.found_videos.length > 0) {
                    fullResponse = `Found ${data.found_videos.length} video${data.found_videos.length > 1 ? 's' : ''} for you:`;
                  }
                }
                
                if (tabId) {
                  chrome.tabs.sendMessage(tabId, {
                    action: 'streamingChunk',
                    chunk: fullResponse,
                    fullText: fullResponse,
                    found_videos: data.found_videos
                  });
                }
                break;
              }

              if (data.status === 'error') {
                throw new Error(data.message || data.error || 'Unknown error');
              }

            } catch (e) {
              console.warn('Failed to parse SSE data:', line, e);
            }
          }
        }

        if (completedData) break;
      }

      return {
        result: completedData?.response || fullResponse,
        intent: completedData?.intent,
        found_videos: completedData?.found_videos || [],
        indexed_videos: completedData?.indexed_videos || [],
        video_id: completedData?.video_id,
        success: true,
        streaming: true
      };
    } catch (error) {
      console.error('Agentic chat streaming error:', error);
      throw error;
    }
  }
}

new BackgroundService();
