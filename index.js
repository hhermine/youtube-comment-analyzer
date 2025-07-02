const { google } = require("googleapis");
const { GoogleGenAI } = require("@google/genai");

// Initialize YouTube API client
const youtube = google.youtube("v3");

// Initialize Vertex AI GenAI client
const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: "global",
});

/**
 * YouTube Comment Analyzer Cloud Function
 * Analyzes sentiment and extracts topics from YouTube video comments using AI
 */
exports.analyzeComments = async (req, res) => {
  // Set CORS headers for web frontend access
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  // Validate request method
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST requests are allowed",
      },
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Validate request body
    if (!req.body || !req.body.videoUrl) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_REQUEST",
          message: "Request body must contain videoUrl field",
        },
        timestamp: new Date().toISOString(),
      });
    }

    const { videoUrl } = req.body;
    console.log(`Processing video URL: ${videoUrl}`);

    // Extract video ID from URL
    const videoId = extractVideoId(videoUrl);
    console.log(`Extracted video ID: ${videoId}`);

    // Get video metadata
    const videoInfo = await getVideoInfo(videoId);
    console.log(`Video title: ${videoInfo.title}`);

    // Fetch comments
    const comments = await fetchComments(videoId);
    console.log(`Fetched ${comments.length} comments`);

    if (comments.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          videoId,
          videoTitle: videoInfo.title,
          commentsAnalyzed: 0,
          analysis: {
            sentiment: "Mixed",
            topics: ["No comments available for analysis"],
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Analyze comments using Gemini 2.5 Pro
    const analysis = await analyzeCommentsWithAI(comments);
    console.log(
      `Analysis completed: ${analysis.sentiment} sentiment, ${analysis.topics.length} topics`
    );

    // Return successful response
    res.status(200).json({
      success: true,
      data: {
        videoId,
        videoTitle: videoInfo.title,
        commentsAnalyzed: comments.length,
        analysis,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in analyzeComments:", error);

    // Handle specific error types
    let errorCode = "INTERNAL_ERROR";
    let errorMessage = "An unexpected error occurred";
    let statusCode = 500;

    if (error.message.includes("Invalid YouTube URL")) {
      errorCode = "INVALID_URL";
      errorMessage = "Invalid or unsupported YouTube URL format";
      statusCode = 400;
    } else if (error.message.includes("Video not found")) {
      errorCode = "VIDEO_NOT_FOUND";
      errorMessage = "Video does not exist or is private";
      statusCode = 404;
    } else if (error.message.includes("Comments disabled")) {
      errorCode = "COMMENTS_DISABLED";
      errorMessage = "Comments are disabled for this video";
      statusCode = 400;
    } else if (error.message.includes("API quota exceeded")) {
      errorCode = "API_QUOTA_EXCEEDED";
      errorMessage = "YouTube API quota exceeded. Please try again later.";
      statusCode = 429;
    } else if (error.message.includes("AI service error")) {
      errorCode = "AI_SERVICE_ERROR";
      errorMessage = "Error in AI analysis service";
      statusCode = 500;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Extract video ID from various YouTube URL formats
 */
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtu\.be\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  throw new Error("Invalid YouTube URL");
}

/**
 * Get video metadata from YouTube API
 */
async function getVideoInfo(videoId) {
  try {
    const response = await youtube.videos.list({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      id: videoId,
    });

    if (!response.data.items || response.data.items.length === 0) {
      throw new Error("Video not found");
    }

    return {
      title: response.data.items[0].snippet.title,
      channelTitle: response.data.items[0].snippet.channelTitle,
    };
  } catch (error) {
    if (error.code === 403) {
      throw new Error("API quota exceeded");
    }
    throw new Error("Video not found");
  }
}

/**
 * Fetch comments from YouTube video
 */
async function fetchComments(videoId) {
  try {
    const response = await youtube.commentThreads.list({
      key: process.env.YOUTUBE_API_KEY,
      part: "snippet",
      videoId: videoId,
      maxResults: 50,
      order: "relevance",
    });

    if (!response.data.items) {
      return [];
    }

    // Extract comment text and filter out very short comments
    const comments = response.data.items
      .map((item) => item.snippet.topLevelComment.snippet.textDisplay)
      .filter((comment) => comment && comment.length >= 10)
      .slice(0, 50); // Limit to 50 comments

    return comments;
  } catch (error) {
    if (error.code === 403) {
      if (error.message.includes("commentsDisabled")) {
        throw new Error("Comments disabled");
      }
      throw new Error("API quota exceeded");
    }
    throw new Error("Failed to fetch comments");
  }
}

/**
 * Analyze comments using Gemini 2.5 Pro (Vertex AI GenAI)
 */
async function analyzeCommentsWithAI(comments) {
  try {
    // Prepare comments text for analysis
    const commentsText = comments.join("\n\n");
    // Limit text length to ~8000 characters
    const limitedText =
      commentsText.length > 8000
        ? commentsText.substring(0, 8000) + "..."
        : commentsText;

    // Create the prompt for analysis
    const prompt = `Analyze these YouTube comments and return JSON:

Comments: ${limitedText}

Return JSON like this: {"sentiment": "Positive", "topics": ["music", "nostalgia"]}`;

    // Set up generation config
    const generationConfig = {
      maxOutputTokens: 1024,
      temperature: 0.1,
      topP: 0.8,
      seed: 0,
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "OFF" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "OFF" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "OFF" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "OFF" },
      ],
    };

    const req = {
      model: "gemini-2.5-pro",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: generationConfig,
    };

    // Call Gemini 2.5 Pro
    let aiResponse = "";
    const streamingResp = await ai.models.generateContentStream(req);

    // Wait for complete response with timeout
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout

    for await (const chunk of streamingResp) {
      if (chunk.text) {
        aiResponse += chunk.text;
      }

      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.log("Streaming timeout reached, processing partial response");
        break;
      }
    }

    console.log("Raw AI Response:", aiResponse); // Debug log
    console.log("Response length:", aiResponse.length);
    console.log("Response type:", typeof aiResponse);

    // Try to extract and complete the JSON if it's truncated
    let jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Try to find JSON in code blocks (```json)
      jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[0], jsonMatch[1]];
      }
    }

    if (!jsonMatch) {
      // Try to find any code block with JSON
      jsonMatch = aiResponse.match(/```\s*(\{[\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[0], jsonMatch[1]];
      }
    }

    if (!jsonMatch) {
      // Try to find incomplete JSON and complete it
      const incompleteMatch = aiResponse.match(/\{[\s\S]*/);
      if (incompleteMatch) {
        let incompleteJson = incompleteMatch[0];
        console.log(
          "Found incomplete JSON, attempting to complete:",
          incompleteJson
        );

        // Count open braces and close them
        const openBraces = (incompleteJson.match(/\{/g) || []).length;
        const closeBraces = (incompleteJson.match(/\}/g) || []).length;
        const missingBraces = openBraces - closeBraces;
        console.log(
          `Open braces: ${openBraces}, Close braces: ${closeBraces}, Missing: ${missingBraces}`
        );

        // Handle incomplete strings in arrays
        let lines = incompleteJson.split("\n");
        if (lines.length > 0) {
          let lastLine = lines[lines.length - 1];
          // If the last line is an incomplete string (odd number of quotes)
          const quoteCount = (lastLine.match(/"/g) || []).length;
          if (quoteCount % 2 === 1) {
            // Add a closing quote
            lastLine += '"';
            lines[lines.length - 1] = lastLine;
            console.log(
              "Closed incomplete string in last array element:",
              lastLine
            );
          }
          // Only add a comma if the last line is a string and not empty or a bracket
          if (
            lastLine.trim().length > 0 &&
            !lastLine.trim().endsWith("]") &&
            !lastLine.trim().endsWith("}")
          ) {
            if (!lastLine.trim().endsWith(",")) {
              lastLine += ",";
              lines[lines.length - 1] = lastLine;
              console.log("Added comma to last array element:", lastLine);
            }
          }
        }
        incompleteJson = lines.join("\n");
        // If we have an incomplete array, close it
        const openArrays = (incompleteJson.match(/\[/g) || []).length;
        const closeArrays = (incompleteJson.match(/\]/g) || []).length;
        const missingArrays = openArrays - closeArrays;
        if (missingArrays > 0) {
          for (let i = 0; i < missingArrays; i++) {
            incompleteJson += "]";
          }
          console.log(`Closed ${missingArrays} missing array brackets`);
        }
        // Add missing closing braces for objects
        if (missingBraces > 0) {
          for (let i = 0; i < missingBraces; i++) {
            incompleteJson += "}";
          }
          console.log(`Closed ${missingBraces} missing object braces`);
        }
        // Final pass: remove any trailing comma before ] or }
        incompleteJson = incompleteJson.replace(/,\s*\]/g, "]");
        incompleteJson = incompleteJson.replace(/,\s*\}/g, "}");
        jsonMatch = [incompleteJson, incompleteJson];
        console.log("Completed JSON:", incompleteJson);
      }
    }

    if (!jsonMatch) {
      console.error("Could not extract JSON from response:", aiResponse);
      // Create a smart fallback based on the raw response
      let sentiment = "Mixed";
      let topics = ["Unable to analyze - no structured response from AI"];

      // Try to extract sentiment from the raw response
      if (aiResponse.toLowerCase().includes("positive")) {
        sentiment = "Positive";
      } else if (aiResponse.toLowerCase().includes("negative")) {
        sentiment = "Negative";
      }

      // Try to extract topics from the raw response
      const topicMatches = aiResponse.match(/\b\w+\b/g);
      if (topicMatches && topicMatches.length > 0) {
        // Filter out common words and take unique topics
        const commonWords = [
          "the",
          "and",
          "or",
          "but",
          "in",
          "on",
          "at",
          "to",
          "for",
          "of",
          "with",
          "by",
          "is",
          "are",
          "was",
          "were",
          "be",
          "been",
          "have",
          "has",
          "had",
          "do",
          "does",
          "did",
          "will",
          "would",
          "could",
          "should",
          "may",
          "might",
          "can",
          "this",
          "that",
          "these",
          "those",
          "i",
          "you",
          "he",
          "she",
          "it",
          "we",
          "they",
          "me",
          "him",
          "her",
          "us",
          "them",
          "my",
          "your",
          "his",
          "her",
          "its",
          "our",
          "their",
          "mine",
          "yours",
          "his",
          "hers",
          "ours",
          "theirs",
        ];
        const filteredTopics = topicMatches
          .filter(
            (word) =>
              word.length > 3 && !commonWords.includes(word.toLowerCase())
          )
          .slice(0, 5);
        if (filteredTopics.length > 0) {
          topics = [...new Set(filteredTopics)]; // Remove duplicates
        }
      }

      return {
        sentiment,
        topics,
      };
    }

    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Attempted to parse:", jsonMatch[1] || jsonMatch[0]);
      // Return fallback response instead of throwing error
      return {
        sentiment: "Mixed",
        topics: ["Unable to parse AI response"],
      };
    }

    // Validate response structure
    if (
      !analysis.sentiment ||
      !analysis.topics ||
      !Array.isArray(analysis.topics)
    ) {
      throw new Error("AI service error: Invalid response structure");
    }

    return {
      sentiment: analysis.sentiment,
      topics: analysis.topics,
    };
  } catch (error) {
    console.error("AI Analysis error:", error);
    // Add detailed error logging
    if (error.response) {
      console.error("AI error response:", error.response);
    }
    if (error.stack) {
      console.error("AI error stack:", error.stack);
    }
    if (error.message.includes("AI service error")) {
      throw error;
    }
    throw new Error(
      "AI service error: Failed to analyze comments. " + error.message
    );
  }
}
