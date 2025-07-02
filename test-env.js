// Test script to verify environment variables
console.log("Testing environment variables...");
console.log(
  "YOUTUBE_API_KEY:",
  process.env.YOUTUBE_API_KEY ? "SET" : "NOT SET"
);
console.log("GOOGLE_CLOUD_PROJECT:", process.env.GOOGLE_CLOUD_PROJECT);
console.log("VERTEX_AI_LOCATION:", process.env.VERTEX_AI_LOCATION);

// Test YouTube API call
const { google } = require("googleapis");
const youtube = google.youtube("v3");

async function testYouTubeAPI() {
  try {
    const response = await youtube.commentThreads.list({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      videoId: "dQw4w9WgXcQ",
      maxResults: 5,
    });
    console.log("YouTube API test: SUCCESS");
    console.log(
      "Comments found:",
      response.data.items ? response.data.items.length : 0
    );
  } catch (error) {
    console.log("YouTube API test: FAILED");
    console.log("Error:", error.message);
    console.log("Error code:", error.code);
  }
}

testYouTubeAPI();
