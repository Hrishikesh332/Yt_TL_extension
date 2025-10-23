class VideoDownloader {
  constructor() {
    this.downloadQueue = new Map();
    this.activeDownloads = new Set();
  }

  async downloadVideo(videoUrl, options = {}) {
    const videoId = this.extractVideoId(videoUrl);
    
    if (this.activeDownloads.has(videoId)) {
      throw new Error('Video is already being downloaded');
    }

    this.activeDownloads.add(videoId);
    
    try {
      // Get video information first
      const videoInfo = await this.getVideoInfo(videoUrl);
      
      // Download the video using multiple methods
      const downloadResult = await this.performDownload(videoUrl, videoInfo, options);
      
      return downloadResult;
    } finally {
      this.activeDownloads.delete(videoId);
    }
  }

  extractVideoId(url) {
    const match = url.match(/[?&]v=([^&]+)/);
    return match ? match[1] : 'unknown';
  }

  async getVideoInfo(videoUrl) {
    try {
      // Use YouTube's oEmbed API to get basic video info
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
      const response = await fetch(oembedUrl);
      const data = await response.json();
      
      return {
        title: data.title,
        author: data.author_name,
        thumbnail: data.thumbnail_url,
        videoId: this.extractVideoId(videoUrl)
      };
    } catch (error) {
      console.warn('Could not fetch video info:', error);
      return {
        title: 'Unknown Video',
        author: 'Unknown Author',
        thumbnail: '',
        videoId: this.extractVideoId(videoUrl)
      };
    }
  }

  async performDownload(videoUrl, videoInfo, options) {
    // For now, we'll use a different approach since direct YouTube downloads
    // are complex and require server-side processing
    
    // Method 1: Try to get video stream URL (limited success)
    try {
      const streamUrl = await this.getVideoStreamUrl(videoUrl);
      if (streamUrl) {
        return await this.downloadFromStream(streamUrl, videoInfo, options);
      }
    } catch (error) {
      console.warn('Stream download failed:', error);
    }

    // Method 2: Use a proxy service (requires external service)
    try {
      return await this.downloadViaProxy(videoUrl, videoInfo, options);
    } catch (error) {
      console.warn('Proxy download failed:', error);
    }

    // Method 3: Fallback to URL-based indexing (original method)
    console.log('Falling back to URL-based indexing');
    return {
      method: 'url',
      videoUrl: videoUrl,
      videoInfo: videoInfo,
      success: true
    };
  }

  async getVideoStreamUrl(videoUrl) {
    // This is a simplified approach - in reality, YouTube's video URLs
    // are complex and change frequently
    try {
      // Try to extract video ID and construct a direct URL
      const videoId = this.extractVideoId(videoUrl);
      
      // Note: This is a placeholder - actual implementation would need
      // to parse YouTube's player response or use a service
      return null; // Return null to trigger fallback
    } catch (error) {
      return null;
    }
  }

  async downloadFromStream(streamUrl, videoInfo, options) {
    try {
      const response = await fetch(streamUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const blob = await response.blob();
      
      return {
        method: 'stream',
        blob: blob,
        videoInfo: videoInfo,
        success: true
      };
    } catch (error) {
      throw new Error(`Stream download failed: ${error.message}`);
    }
  }

  async downloadViaProxy(videoUrl, videoInfo, options) {
    // This would require a server-side proxy service
    // For now, we'll simulate this
    throw new Error('Proxy service not implemented');
  }

  async uploadToTwelveLabs(videoData, apiKey, indexId = null) {
    try {
      const formData = new FormData();
      formData.append('index_id', indexId);
      
      if (videoData.method === 'stream' && videoData.blob) {
        formData.append('video_file', videoData.blob, `${videoData.videoInfo.videoId}.mp4`);
      } else if (videoData.method === 'url') {
        formData.append('video_url', videoData.videoUrl);
      }
      
      formData.append('enable_video_stream', 'true');
      formData.append('user_metadata', JSON.stringify({
        source: 'youtube_extension',
        title: videoData.videoInfo.title,
        author: videoData.videoInfo.author,
        timestamp: new Date().toISOString()
      }));

      const response = await fetch('https://api.twelvelabs.io/v1.3/tasks', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      // Log the response format for debugging
      console.log('Twelve Labs indexing response:', result);
      
      // Ensure we return the correct format
      return {
        _id: result._id,
        video_id: result.video_id || result._id,
        success: true,
        original_response: result
      };
    } catch (error) {
      console.error('Twelve Labs upload error:', error);
      throw error;
    }
  }

  // Utility method to check if a URL is a valid YouTube video
  isValidYouTubeUrl(url) {
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  }

  // Get download progress (placeholder for future implementation)
  getDownloadProgress(videoId) {
    return this.downloadQueue.get(videoId) || { progress: 0, status: 'idle' };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VideoDownloader;
} else if (typeof window !== 'undefined') {
  window.VideoDownloader = VideoDownloader;
}
