// YouTube Comment Analyzer Frontend JavaScript

class YouTubeCommentAnalyzer {
  constructor() {
    this.apiEndpoint = "http://localhost:8080"; // Local development
    this.init();
  }

  init() {
    this.bindEvents();
    this.setupFormValidation();
  }

  bindEvents() {
    // Form submission
    const form = document.getElementById("analyzeForm");
    form.addEventListener("submit", (e) => this.handleFormSubmit(e));

    // New analysis button
    const newAnalysisBtn = document.getElementById("newAnalysisBtn");
    newAnalysisBtn.addEventListener("click", () => this.resetForm());

    // URL input validation
    const urlInput = document.getElementById("videoUrl");
    urlInput.addEventListener("input", (e) =>
      this.validateYouTubeUrl(e.target.value)
    );
  }

  setupFormValidation() {
    const form = document.getElementById("analyzeForm");
    const urlInput = document.getElementById("videoUrl");

    // Real-time URL validation
    urlInput.addEventListener("blur", () => {
      this.validateYouTubeUrl(urlInput.value);
    });

    // Form submission validation
    form.addEventListener("submit", (e) => {
      if (!this.isValidYouTubeUrl(urlInput.value)) {
        e.preventDefault();
        this.showError("Please enter a valid YouTube URL");
        urlInput.focus();
        return false;
      }
    });
  }

  validateYouTubeUrl(url) {
    const isValid = this.isValidYouTubeUrl(url);
    const input = document.getElementById("videoUrl");

    if (url && !isValid) {
      input.classList.add("border-red-500");
      input.classList.remove("border-gray-200");
    } else {
      input.classList.remove("border-red-500");
      input.classList.add("border-gray-200");
    }

    return isValid;
  }

  isValidYouTubeUrl(url) {
    if (!url) return false;

    const patterns = [
      /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?.*v=([^&\n?#]+)/,
      /^(https?:\/\/)?(www\.)?youtu\.be\/([^&\n?#]+)/,
    ];

    return patterns.some((pattern) => pattern.test(url));
  }

  async handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const videoUrl = formData.get("videoUrl");

    if (!this.isValidYouTubeUrl(videoUrl)) {
      this.showError("Please enter a valid YouTube URL");
      return;
    }

    this.showLoading();
    this.hideError();
    this.hideResults();

    try {
      const result = await this.analyzeComments(videoUrl);
      this.displayResults(result);
    } catch (error) {
      console.error("Analysis failed:", error);
      this.handleError(error);
    } finally {
      this.hideLoading();
    }
  }

  async analyzeComments(videoUrl) {
    const response = await fetch(this.apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoUrl }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message ||
          `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || "Analysis failed");
    }

    return data.data;
  }

  displayResults(data) {
    // Update video information
    document.getElementById("videoTitle").textContent =
      data.videoTitle || "Unknown Title";
    document.getElementById("commentsCount").textContent =
      data.commentsAnalyzed || 0;

    // Update sentiment
    const sentimentText = document.getElementById("sentimentText");
    const sentimentIcon = document.getElementById("sentimentIcon");

    sentimentText.textContent = data.analysis.sentiment;
    sentimentText.className = "text-2xl font-bold";

    // Add sentiment-specific styling
    if (data.analysis.sentiment.toLowerCase().includes("positive")) {
      sentimentText.classList.add("sentiment-positive");
      sentimentIcon.innerHTML = '<i class="fas fa-smile"></i>';
      sentimentIcon.className = "text-4xl mr-4 sentiment-positive";
    } else if (data.analysis.sentiment.toLowerCase().includes("negative")) {
      sentimentText.classList.add("sentiment-negative");
      sentimentIcon.innerHTML = '<i class="fas fa-frown"></i>';
      sentimentIcon.className = "text-4xl mr-4 sentiment-negative";
    } else {
      sentimentText.classList.add("sentiment-mixed");
      sentimentIcon.innerHTML = '<i class="fas fa-meh"></i>';
      sentimentIcon.className = "text-4xl mr-4 sentiment-mixed";
    }

    // Update topics
    this.displayTopics(data.analysis.topics);

    // Update timestamp
    document.getElementById("analysisTimestamp").textContent =
      new Date().toLocaleString();

    // Show results with animation
    const resultsSection = document.getElementById("resultsSection");
    resultsSection.classList.remove("hidden");
    resultsSection.classList.add("success-animation");

    // Scroll to results
    setTimeout(() => {
      resultsSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  displayTopics(topics) {
    const container = document.getElementById("topicsContainer");
    container.innerHTML = "";

    if (!topics || topics.length === 0) {
      container.innerHTML =
        '<p class="text-gray-500 italic">No topics identified</p>';
      return;
    }

    topics.forEach((topic, index) => {
      const badge = document.createElement("span");
      badge.className = "topic-badge";
      badge.textContent = topic;
      badge.style.animationDelay = `${index * 0.1}s`;
      container.appendChild(badge);
    });
  }

  handleError(error) {
    let errorMessage = "An unexpected error occurred";

    // Map common error messages to user-friendly versions
    if (error.message.includes("INVALID_URL")) {
      errorMessage = "Please enter a valid YouTube URL";
    } else if (error.message.includes("VIDEO_NOT_FOUND")) {
      errorMessage = "Video not found or is private";
    } else if (error.message.includes("COMMENTS_DISABLED")) {
      errorMessage = "Comments are disabled for this video";
    } else if (error.message.includes("API_QUOTA_EXCEEDED")) {
      errorMessage = "API quota exceeded. Please try again later.";
    } else if (error.message.includes("AI_SERVICE_ERROR")) {
      errorMessage = "AI analysis service is temporarily unavailable";
    } else if (error.message.includes("Failed to fetch")) {
      errorMessage =
        "Unable to connect to the analysis service. Please check your connection.";
    } else {
      errorMessage = error.message;
    }

    this.showError(errorMessage);
  }

  showLoading() {
    const loadingState = document.getElementById("loadingState");
    const form = document.getElementById("analyzeForm");
    const analyzeBtn = document.getElementById("analyzeBtn");

    loadingState.classList.remove("hidden");
    form.classList.add("hidden");
    analyzeBtn.disabled = true;
  }

  hideLoading() {
    const loadingState = document.getElementById("loadingState");
    const form = document.getElementById("analyzeForm");
    const analyzeBtn = document.getElementById("analyzeBtn");

    loadingState.classList.add("hidden");
    form.classList.remove("hidden");
    analyzeBtn.disabled = false;
  }

  showError(message) {
    const errorState = document.getElementById("errorState");
    const errorMessage = document.getElementById("errorMessage");

    errorMessage.textContent = message;
    errorState.classList.remove("hidden");
    errorState.classList.add("shake");

    // Remove shake animation after it completes
    setTimeout(() => {
      errorState.classList.remove("shake");
    }, 500);
  }

  hideError() {
    const errorState = document.getElementById("errorState");
    errorState.classList.add("hidden");
  }

  hideResults() {
    const resultsSection = document.getElementById("resultsSection");
    resultsSection.classList.add("hidden");
  }

  resetForm() {
    // Reset form
    document.getElementById("analyzeForm").reset();
    document.getElementById("videoUrl").classList.remove("border-red-500");
    document.getElementById("videoUrl").classList.add("border-gray-200");

    // Hide results and errors
    this.hideResults();
    this.hideError();

    // Focus on URL input
    document.getElementById("videoUrl").focus();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Method to update API endpoint for production
  setApiEndpoint(endpoint) {
    this.apiEndpoint = endpoint;
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.analyzer = new YouTubeCommentAnalyzer();

  // Add some example URLs for testing
  const urlInput = document.getElementById("videoUrl");
  urlInput.addEventListener("focus", () => {
    if (!urlInput.value) {
      urlInput.placeholder = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
  });

  urlInput.addEventListener("blur", () => {
    if (!urlInput.value) {
      urlInput.placeholder = "https://www.youtube.com/watch?v=...";
    }
  });
});

// Export for potential use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = YouTubeCommentAnalyzer;
}
