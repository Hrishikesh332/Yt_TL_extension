importScripts('video-downloader.js');

class BackgroundService {
  constructor() {
    this.videoDownloader = new VideoDownloader();
    this.setupMessageHandlers();
    this.setupInstallHandlers();
  }

  setupMessageHandlers() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'getApiKey':
          this.getApiKey().then(sendResponse);
          return true; // Keep message channel open for async response
          
        case 'saveApiKey':
          this.saveApiKey(request.apiKey).then(sendResponse);
          return true;
          
        case 'saveConfig':
          this.saveConfig(request.apiKey, request.indexId).then(sendResponse);
          return true;
          
        case 'callTwelveLabsAPI':
          this.callTwelveLabsAPI(request.endpoint, request.data).then(sendResponse);
          return true;
          
        case 'indexVideo':
          this.indexVideo(request.videoUrl, sender.tab.id).then(sendResponse);
          return true;
          
        case 'searchVideo':
          this.searchVideo(request.query, request.indexId).then(sendResponse);
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
          
        case 'getIndexId':
          this.getIndexId().then(sendResponse);
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
        // Auto-configure with provided credentials (will be replaced by build script)
        chrome.storage.sync.set({
          theme: 'light',
          apiKey: 'REPLACE_WITH_API_KEY',
          indexId: 'REPLACE_WITH_INDEX_ID',
          autoIndex: true,
          autoConfigured: true,
          configuredAt: new Date().toISOString()
        }, () => {
          console.log('Extension auto-configured with API key and Index ID');
        });
      }
    });
  }

  async getApiKey() {
    const result = await chrome.storage.sync.get(['apiKey']);
    return result.apiKey || '';
  }

  async saveApiKey(apiKey) {
    await chrome.storage.sync.set({ apiKey });
    return { success: true };
  }

  async saveConfig(apiKey, indexId) {
    await chrome.storage.sync.set({ 
      apiKey: apiKey,
      indexId: indexId
    });
    return { success: true };
  }

  async getIndexId() {
    const result = await chrome.storage.sync.get(['indexId']);
    return result.indexId || '6298d673f1090f1100476d4c'; // Default index ID
  }

  async callTwelveLabsAPI(endpoint, data) {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      const response = await fetch(`https://api.twelvelabs.io/v1.2${endpoint}`, {
        method: data.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: data.body ? JSON.stringify(data.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Twelve Labs API error:', error);
      throw error;
    }
  }

  async indexVideo(videoUrl, tabId) {
    try {
      // Validate YouTube URL
      if (!this.videoDownloader.isValidYouTubeUrl(videoUrl)) {
        throw new Error('Invalid YouTube URL');
      }

      // Send status update: Downloading Video
      this.sendStatusUpdate(tabId, 'Downloading Video', 'Retrieving video content from YouTube');

      // Download the video
      const videoData = await this.videoDownloader.downloadVideo(videoUrl);
      
      // Send status update: Processing Content
      this.sendStatusUpdate(tabId, 'Processing Content', 'Extracting audio, visual, and text data');
      
      // Get API key
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      // Get stored index ID
      const indexId = await this.getIndexId();
      
      // Send status update: Uploading to Twelve Labs
      this.sendStatusUpdate(tabId, 'Uploading to Twelve Labs', 'Sending video to AI processing engine');
      
      // Upload to Twelve Labs
      const result = await this.videoDownloader.uploadToTwelveLabs(videoData, apiKey, indexId);
      
      // Send status update: AI Indexing
      this.sendStatusUpdate(tabId, 'AI Indexing', 'Creating searchable embeddings and analysis');
      
      // Store the video ID for future analysis calls
      if (result._id || result.video_id) {
        const videoId = result.video_id || result._id;
        await this.storeVideoId(videoUrl, videoId);
        
        // Send final status update
        this.sendStatusUpdate(tabId, 'Ready for Analysis', 'Video is indexed and ready for questions');
        
        // Return the result with the video ID
        return {
          ...result,
          video_id: videoId,
          success: true
        };
      }
      
      return result;
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


  async searchVideo(query, indexId = null) {
    try {
      const searchData = {
        method: 'POST',
        body: {
          query: query,
          ...(indexId && { index_id: indexId })
        }
      };
      return await this.callTwelveLabsAPI('/search', searchData);
    } catch (error) {
      console.error('Video search error:', error);
      throw error;
    }
  }

  async analyzeVideo(videoId, type, prompt = null, customPrompt = null, tabId = null) {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      // Send status update
      if (tabId) {
        this.sendStatusUpdate(tabId, 'Preparing Analysis', 'Setting up AI analysis request...');
      }

      // Define analysis prompts and schemas based on type
      const analysisConfigs = {
        summary: {
          prompt: customPrompt || "I want to generate a description for my video with the following format - Title of the video, followed by a summary in 2-3 sentences, highlighting the main topic, key events, and concluding remarks.",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              keywords: { type: "array", items: { type: "string" } }
            }
          }
        },
        chapters: {
          prompt: customPrompt || "Analyze this video and break it down into logical chapters or sections. For each chapter, provide a title, start time, and brief description of what happens in that section.",
          schema: {
            type: "object",
            properties: {
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    start_time: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        },
        highlights: {
          prompt: customPrompt || "Identify the key highlights and most important moments in this video. For each highlight, provide a timestamp and brief description of what makes it significant.",
          schema: {
            type: "object",
            properties: {
              highlights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string" },
                    description: { type: "string" },
                    importance: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              }
            }
          }
        },
        search: {
          prompt: customPrompt || "Search through this video for content related to the query. Provide timestamps and descriptions of relevant segments.",
          schema: {
            type: "object",
            properties: {
              results: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string" },
                    description: { type: "string" },
                    relevance_score: { type: "number" }
                  }
                }
              }
            }
          }
        }
      };

      const config = analysisConfigs[type];
      if (!config) {
        throw new Error(`Unknown analysis type: ${type}`);
      }

      // Send status update
      if (tabId) {
        this.sendStatusUpdate(tabId, 'Sending Request', 'Sending analysis request to Twelve Labs API...');
      }

      const requestBody = {
        video_id: videoId,
        prompt: config.prompt,
        temperature: 0.2,
        stream: false, // Set to true for streaming responses
        response_format: {
          type: "json_schema",
          json_schema: config.schema
        },
        max_tokens: 2000
      };

      const response = await fetch('https://api.twelvelabs.io/v1.3/analyze', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status} ${response.statusText}`);
      }

      // Send status update
      if (tabId) {
        this.sendStatusUpdate(tabId, 'Processing Response', 'Processing AI analysis results...');
      }

      const result = await response.json();
      return this.parseAnalysisResult(result, type);
    } catch (error) {
      console.error('Video analysis error:', error);
      throw error;
    }
  }

  parseAnalysisResult(result, type) {
    try {
      // Parse the JSON data from the response
      const parsedData = JSON.parse(result.data);
      
      // Format the result based on analysis type
      switch (type) {
        case 'summary':
          return {
            title: parsedData.title || 'Video Summary',
            summary: parsedData.summary || 'No summary available',
            keywords: parsedData.keywords || []
          };
        
        case 'chapters':
          return {
            chapters: parsedData.chapters || []
          };
        
        case 'highlights':
          return {
            highlights: parsedData.highlights || []
          };
        
        case 'search':
          return {
            results: parsedData.results || []
          };
        
        default:
          return parsedData;
      }
    } catch (error) {
      console.error('Error parsing analysis result:', error);
      // Fallback to raw data if parsing fails
      return {
        raw_data: result.data,
        error: 'Failed to parse structured response'
      };
    }
  }

  async analyzeVideoStream(videoId, type, prompt = null, customPrompt = null, tabId) {
    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error('API key not configured');
      }

      // Use the same analysis configs as the regular analyze function
      const analysisConfigs = {
        summary: {
          prompt: customPrompt || "I want to generate a description for my video with the following format - Title of the video, followed by a summary in 2-3 sentences, highlighting the main topic, key events, and concluding remarks.",
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              summary: { type: "string" },
              keywords: { type: "array", items: { type: "string" } }
            }
          }
        },
        chapters: {
          prompt: customPrompt || "Analyze this video and break it down into logical chapters or sections. For each chapter, provide a title, start time, and brief description of what happens in that section.",
          schema: {
            type: "object",
            properties: {
              chapters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    start_time: { type: "string" },
                    description: { type: "string" }
                  }
                }
              }
            }
          }
        },
        highlights: {
          prompt: customPrompt || "Identify the key highlights and most important moments in this video. For each highlight, provide a timestamp and brief description of what makes it significant.",
          schema: {
            type: "object",
            properties: {
              highlights: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    timestamp: { type: "string" },
                    description: { type: "string" },
                    importance: { type: "string", enum: ["high", "medium", "low"] }
                  }
                }
              }
            }
          }
        }
      };

      const config = analysisConfigs[type];
      if (!config) {
        throw new Error(`Unknown analysis type: ${type}`);
      }

      const requestBody = {
        video_id: videoId,
        prompt: config.prompt,
        temperature: 0.2,
        stream: true, // Enable streaming
        response_format: {
          type: "json_schema",
          json_schema: config.schema
        },
        max_tokens: 2000
      };

      const response = await fetch('https://api.twelvelabs.io/v1.3/analyze', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Streaming analysis failed: ${response.status} ${response.statusText}`);
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep the last incomplete line

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return { success: true, completed: true };
            }

            try {
              const parsed = JSON.parse(data);
              // Send streaming update to content script
              chrome.tabs.sendMessage(tabId, {
                action: 'streamingUpdate',
                type: type,
                data: parsed
              });
            } catch (error) {
              console.warn('Failed to parse streaming data:', error);
            }
          }
        }
      }

      return { success: true, completed: true };
    } catch (error) {
      console.error('Streaming analysis error:', error);
      throw error;
    }
  }
}

// Initialize background service
new BackgroundService();
