# Technical Design Document (TDD)

## YouTube Comment Analyzer


## 1. Executive Summary

The YouTube Comment Analyzer is a simple web application that enables users to analyze the sentiment and key topics of discussion in YouTube video comments. The application consists of a static frontend and a serverless backend, leveraging Google Cloud services for scalability and AI-powered analysis.

### 1.1 Core Vision

Allow users to paste any public YouTube video URL and receive an automated analysis of the comment section's overall sentiment and key discussion topics.

### 1.2 Key Features

- Single-page web interface for URL input
- Real-time comment analysis using AI
- Sentiment classification (Positive, Negative, Mixed)
- Topic extraction from comment discussions
- Serverless architecture for cost efficiency

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────┐    HTTPS     ┌──────────────────────┐
│                 │──────────────▶│                      │
│   Static Web    │               │  Google Cloud        │
│   Frontend      │               │  Function (2nd Gen)  │
│   (index.html)  │◀──────────────│  (Node.js)           │
│                 │    JSON       │                      │
└─────────────────┘               └──────────────────────┘
                                           │
                                           │ API Calls
                                           ▼
                  ┌─────────────────────────────────────────┐
                  │           Google Cloud APIs             │
                  │                                         │
                  │  ┌─────────────────┐ ┌─────────────────┐│
                  │  │ YouTube Data    │ │ Vertex AI API   ││
                  │  │ API v3          │ │ (Gemini Model)  ││
                  │  │                 │ │                 ││
                  │  └─────────────────┘ └─────────────────┘│
                  └─────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 Frontend (Static Web Application)

- **Technology:** Vanilla HTML, CSS, JavaScript
- **Hosting:** Can be hosted on any static web hosting service
- **Responsibilities:**
  - User interface for URL input
  - Form validation and user feedback
  - HTTP requests to backend API
  - Result display and formatting

#### 2.2.2 Backend (Google Cloud Function)

- **Technology:** Node.js (2nd Generation Cloud Function)
- **Trigger:** HTTP trigger
- **Responsibilities:**
  - URL validation and video ID extraction
  - YouTube API integration for comment fetching
  - Comment aggregation and preprocessing
  - AI model integration for sentiment and topic analysis
  - Response formatting

---

## 3. API Specification

### 3.1 Endpoint Definition

**Endpoint:** `POST /analyze-comments`  
**Method:** HTTP POST  
**Content-Type:** `application/json`

### 3.2 Request Payload

```json
{
  "videoUrl": "string"
}
```

**Field Specifications:**

- `videoUrl` (required): Full YouTube video URL
  - Example: `"https://www.youtube.com/watch?v=dQw4w9WgXcQ"`
  - Supported formats:
    - `https://www.youtube.com/watch?v=VIDEO_ID`
    - `https://youtu.be/VIDEO_ID`
    - `https://www.youtube.com/embed/VIDEO_ID`

### 3.3 Response Object

#### 3.3.1 Successful Response (200 OK)

```json
{
  "success": true,
  "data": {
    "videoId": "string",
    "videoTitle": "string",
    "commentsAnalyzed": "number",
    "analysis": {
      "sentiment": "string",
      "topics": ["string"]
    }
  },
  "timestamp": "string"
}
```

**Field Specifications:**

- `success`: Boolean indicating operation success
- `data.videoId`: Extracted YouTube video ID
- `data.videoTitle`: Title of the analyzed video
- `data.commentsAnalyzed`: Number of comments processed
- `data.analysis.sentiment`: One of "Positive", "Negative", "Mixed"
- `data.analysis.topics`: Array of key discussion topics (strings)
- `timestamp`: ISO 8601 timestamp of analysis

#### 3.3.2 Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string"
  },
  "timestamp": "string"
}
```

**Error Codes:**

- `INVALID_URL`: Malformed or unsupported YouTube URL
- `VIDEO_NOT_FOUND`: Video does not exist or is private
- `COMMENTS_DISABLED`: Comments are disabled for the video
- `API_QUOTA_EXCEEDED`: YouTube API quota exceeded
- `AI_SERVICE_ERROR`: Error in AI analysis service
- `INTERNAL_ERROR`: Unexpected server error

---

## 4. Data Flow

### 4.1 User Journey Flow

1. **User Input**

   - User visits webpage
   - Enters YouTube URL in input field
   - Clicks "Analyze Comments" button

2. **Frontend Processing**

   - JavaScript validates URL format
   - Shows loading indicator
   - Sends POST request to Cloud Function

3. **Backend Processing**

   - Cloud Function receives request
   - Extracts video ID from URL
   - Fetches comments via YouTube Data API
   - Aggregates comment text
   - Calls Vertex AI API with analysis prompt
   - Returns structured JSON response

4. **Result Display**
   - Frontend receives response
   - Hides loading indicator
   - Displays sentiment and topics
   - Shows error message if applicable

### 4.2 Backend Processing Flow

```
URL Input → Video ID Extraction → YouTube API Call → Comment Aggregation → AI Analysis → Response Formation
```

---

## 5. Google Cloud Services & APIs

### 5.1 Required Google Cloud Services

#### 5.1.1 Google Cloud Functions (2nd Generation)

- **Purpose:** Host the serverless backend logic
- **Runtime:** Node.js 20
- **Trigger:** HTTP
- **Memory:** 512 MB (adjustable based on performance needs)
- **Timeout:** 60 seconds (max for comment processing)

#### 5.1.2 Vertex AI API

- **Purpose:** Access Gemini model for sentiment and topic analysis
- **Model:** `gemini-1.5-flash` or `gemini-1.5-pro`
- **Usage:** Text analysis and structured output generation

#### 5.1.3 YouTube Data API v3

- **Purpose:** Fetch video comments and metadata
- **Quota:** 10,000 units per day (default)
- **Key Endpoints Used:**
  - `commentThreads.list` - Fetch top-level comments
  - `videos.list` - Get video metadata

### 5.2 APIs to Enable

```bash
# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable youtube.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## 6. IAM Permissions & Security

### 6.1 Service Account Permissions

The Cloud Function requires a service account with the following IAM roles:

#### 6.1.1 Required Roles

- `roles/aiplatform.user` - Access Vertex AI APIs
- `roles/serviceusage.serviceUsageConsumer` - Use enabled APIs

#### 6.1.2 API Key Requirements

- **YouTube Data API:** Requires API key for public data access
- **Vertex AI:** Uses service account authentication

### 6.2 Security Considerations

#### 6.2.1 API Security

- YouTube API key should be restricted to specific APIs
- Cloud Function should validate input parameters
- Rate limiting should be implemented to prevent abuse

#### 6.2.2 CORS Configuration

```javascript
// CORS headers for frontend access
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
}
```

---

## 7. Implementation Details

### 7.1 Video ID Extraction Logic

```javascript
function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  throw new Error("Invalid YouTube URL");
}
```

### 7.2 AI Prompt Template

```javascript
const analysisPrompt = `
Analyze the following YouTube comments and provide a JSON response with two keys:

1. "sentiment": Classify the overall sentiment as "Positive", "Negative", or "Mixed"
2. "topics": Extract 3-5 key topics being discussed (as an array of strings)

Comments to analyze:
${aggregatedComments}

Respond only with valid JSON in the specified format.
`;
```

### 7.3 Comment Aggregation Strategy

- Fetch top 50-100 comments using YouTube Data API
- Filter out spam and very short comments (< 10 characters)
- Concatenate comment text with newline separators
- Limit total text to ~8000 characters for AI processing

---

## 8. Error Handling & Edge Cases

### 8.1 Frontend Error Handling

- Invalid URL format validation
- Network connectivity issues
- API timeout handling
- User-friendly error messages

### 8.2 Backend Error Handling

- YouTube API rate limiting
- Video privacy restrictions
- Comments disabled scenarios
- AI service availability
- Malformed response handling

### 8.3 Edge Cases

- Videos with no comments
- Non-English comments
- Very long comment threads
- Private or unlisted videos
- Age-restricted content

---

## 9. Performance & Scalability

### 9.1 Performance Considerations

- **Cold starts:** Cloud Function may have initial latency
- **API quotas:** YouTube API has daily limits
- **Processing time:** 10-30 seconds typical for analysis

### 9.2 Optimization Strategies

- Implement caching for frequently analyzed videos
- Use Cloud Function minimum instances for faster response
- Batch API calls when possible
- Optimize comment text preprocessing

---

## 10. Deployment & Configuration

### 10.1 Environment Variables

```bash
# Required environment variables for Cloud Function
YOUTUBE_API_KEY=your_youtube_api_key
GOOGLE_CLOUD_PROJECT=your_project_id
VERTEX_AI_LOCATION=us-central1
```

### 10.2 Deployment Commands

```bash
# Deploy Cloud Function
gcloud functions deploy analyze-youtube-comments \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=analyzeComments \
  --trigger=http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=60s
```

---

## 11. Monitoring & Logging

### 11.1 Metrics to Monitor

- Function invocation count
- Error rates by error type
- Response latency
- API quota usage
- Cost per analysis

### 11.2 Logging Strategy

- Request/response logging
- Error details and stack traces
- API call success/failure rates
- Performance metrics

---

## 12. Cost Estimation

### 12.1 Variable Costs

- **Cloud Functions:** ~$0.40 per million invocations
- **Vertex AI:** ~$0.002 per 1K characters processed
- **YouTube API:** Free up to 10K units/day
- **Estimated cost per analysis:** $0.01-0.05

### 12.2 Cost Optimization

- Implement request caching
- Use efficient AI models
- Monitor and set quotas
- Optimize comment processing

---

## 13. Future Enhancements

### 13.1 Potential Features

- Multi-language support
- Historical sentiment tracking
- Comment thread analysis
- Batch URL processing
- Advanced analytics dashboard

### 13.2 Technical Improvements

- Result caching with Cloud Storage
- Real-time updates with WebSockets
- Enhanced AI prompting strategies
- Performance monitoring dashboard

---

## 14. Conclusion

This TDD provides a comprehensive foundation for building the YouTube Comment Analyzer. The serverless architecture ensures cost efficiency while leveraging Google Cloud's AI capabilities for accurate analysis. The simple frontend design prioritizes user experience while the robust backend handles complex processing requirements.

The design emphasizes scalability, maintainability, and security while keeping the implementation straightforward and focused on the core functionality.

---

## 15. Google Cloud Project Setup Guide

### 15.1 Project Creation and Configuration Commands

Follow these gcloud commands to set up your Google Cloud project:

#### Step 1: Create a New Google Cloud Project
```bash
# Set variables for your project
export PROJECT_ID="youtube-comment-analyzer-$(date +%s)"
export BILLING_ACCOUNT_ID="your-billing-account-id"

# Create the project
gcloud projects create $PROJECT_ID --name="YouTube Comment Analyzer"

# Set the project as default for subsequent commands
gcloud config set project $PROJECT_ID
```

#### Step 2: Link Billing to the Project
```bash
# List available billing accounts (to find your billing account ID)
gcloud billing accounts list

# Link billing to your project (replace with your actual billing account ID)
gcloud billing projects link $PROJECT_ID --billing-account=$BILLING_ACCOUNT_ID
```

#### Step 3: Enable Required APIs
```bash
# Enable all necessary APIs for the YouTube Comment Analyzer
gcloud services enable iam.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable logging.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable youtube.googleapis.com
gcloud services enable cloudfunctions.googleapis.com

# Verify enabled services
gcloud services list --enabled
```

#### Step 4: Create Service Account for Cloud Function
```bash
# Create service account
gcloud iam service-accounts create youtube-analyzer-sa \
    --display-name="YouTube Comment Analyzer Service Account" \
    --description="Service account for YouTube Comment Analyzer Cloud Function"

# Assign necessary roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:youtube-analyzer-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:youtube-analyzer-sa@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/serviceusage.serviceUsageConsumer"
```

### 15.2 API Key Creation and Configuration Guide

#### Step 1: Access Google Cloud Console
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com)
2. Ensure your YouTube Comment Analyzer project is selected in the project dropdown

#### Step 2: Navigate to APIs & Services
1. In the left navigation menu, click on "APIs & Services"
2. Click on "Credentials" in the submenu

#### Step 3: Create API Key
1. Click the "**+ CREATE CREDENTIALS**" button at the top
2. Select "**API key**" from the dropdown menu
3. A dialog will appear showing your new API key - **copy and save this key securely**
4. Click "**RESTRICT KEY**" to configure security settings

#### Step 4: Configure API Key Restrictions

##### Application Restrictions:
1. In the "Application restrictions" section, select "**None**" (since this will be used from a Cloud Function)
   - Note: For production applications, consider using "IP addresses" and specify your Cloud Function's IP ranges

##### API Restrictions:
1. In the "API restrictions" section, select "**Restrict key**"
2. Click "**Select APIs**" dropdown
3. Find and check the following APIs:
   - ✅ **YouTube Data API v3**
   - ✅ **Vertex AI API** (if available in the list)
4. Click "**OK**" to save the selection

#### Step 5: Configure API Key Name and Save
1. At the top, change the API key name to something descriptive like "YouTube-Analyzer-API-Key"
2. Click "**SAVE**" to apply all restrictions

#### Step 6: Additional Security Considerations

##### For YouTube Data API v3:
```bash
# You can also restrict the API key via gcloud CLI
gcloud alpha services api-keys update $API_KEY_ID \
    --api-target=youtube.googleapis.com \
    --display-name="YouTube-Analyzer-API-Key"
```

##### Environment Variable Setup:
```bash
# Set the API key as an environment variable for your Cloud Function
export YOUTUBE_API_KEY="your-created-api-key-here"
```

### 15.3 Verification Commands

#### Verify Project Setup:
```bash
# Check project configuration
gcloud config get-value project
gcloud projects describe $PROJECT_ID

# Verify billing is linked
gcloud billing projects describe $PROJECT_ID

# Check enabled APIs
gcloud services list --enabled --filter="name:(youtube.googleapis.com OR aiplatform.googleapis.com OR cloudfunctions.googleapis.com)"
```

#### Test API Access:
```bash
# Test YouTube API access (replace with actual API key)
curl "https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&key=YOUR_API_KEY&part=snippet"

# Check Vertex AI API access
gcloud ai models list --region=us-central1
```

### 15.4 Security Best Practices

#### API Key Security:
- ✅ Store API keys as environment variables, never in code
- ✅ Restrict API keys to specific APIs only
- ✅ Regularly rotate API keys
- ✅ Monitor API key usage in Cloud Console
- ✅ Use least-privilege principle for all permissions

#### Service Account Security:
- ✅ Use dedicated service accounts with minimal permissions
- ✅ Regularly audit service account permissions
- ✅ Enable audit logging for security monitoring

#### Project Security:
```bash
# Enable audit logging
gcloud logging sinks create youtube-analyzer-audit-sink \
    bigquery.googleapis.com/projects/$PROJECT_ID/datasets/security_audit \
    --log-filter='protoPayload.serviceName="youtube.googleapis.com" OR protoPayload.serviceName="aiplatform.googleapis.com"'
```
