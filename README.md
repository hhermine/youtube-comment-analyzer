# YouTube Comment Analyzer

A modern web application that analyzes YouTube video comments using AI-powered sentiment analysis and topic extraction. Built with Google Cloud Functions, Gemini AI, and a responsive frontend.

## 🎯 Project Overview

The YouTube Comment Analyzer allows users to paste any YouTube video URL and receive an automated analysis of the comment section's overall sentiment and key discussion topics. It leverages Google's Gemini 2.5 Pro AI model to provide intelligent insights from comment data.

### Key Features

- **AI-Powered Analysis**: Uses Gemini 2.5 Pro for sentiment and topic extraction
- **Modern Frontend**: Clean, responsive design with Tailwind CSS
- **Real-time Processing**: Instant analysis with loading states and progress indicators
- **Robust Error Handling**: Graceful fallbacks and user-friendly error messages
- **Multiple URL Formats**: Supports various YouTube URL patterns
- **Serverless Architecture**: Built on Google Cloud Functions for scalability

## 🏗️ Architecture

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
                  │  │ API v3          │ │ (Gemini 2.5)    ││
                  │  │                 │ │                 ││
                  │  └─────────────────┘ └─────────────────┘│
                  └─────────────────────────────────────────┘
```

## 🛠️ Technologies Used

### Backend

- **Node.js 20**: Runtime environment
- **Google Cloud Functions (2nd Gen)**: Serverless backend
- **@google/genai**: Official Gemini AI SDK
- **googleapis**: YouTube Data API v3 client
- **Express.js**: HTTP request handling

### Frontend

- **HTML5**: Semantic markup
- **Tailwind CSS**: Utility-first CSS framework
- **Vanilla JavaScript**: ES6+ with modern features
- **Font Awesome**: Icons and visual elements

### Cloud Services

- **Google Cloud Platform**: Hosting and APIs
- **Vertex AI**: Gemini 2.5 Pro model access
- **YouTube Data API v3**: Comment and video metadata
- **Cloud Build**: Automated deployment
- **Artifact Registry**: Container image storage

## 📁 Project Structure

```
youtube-comment-analyzer/
├── index.js              # Cloud Function backend
├── package.json          # Node.js dependencies
├── package-lock.json     # Dependency lock file
├── index.html            # Frontend HTML structure
├── style.css             # Custom CSS styles
├── script.js             # Frontend JavaScript
├── env.example           # Environment variables template
├── TDD.md               # Technical Design Document
├── README.md            # This file
└── test-*.js            # Various test files
```

## 🚀 Quick Start

### Prerequisites

- **Google Cloud Account** with billing enabled
- **Node.js 20+** installed
- **Python 3.x** (for local frontend server)
- **gcloud CLI** installed and configured
- **YouTube Data API key**

### 1. Clone and Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd youtube-comment-analyzer

# Install dependencies
npm install
```

### 2. Environment Configuration

```bash
# Copy environment template
cp env.example env.local

# Edit env.local with your values
nano env.local
```

Required environment variables:

```bash
# Google Cloud Project Configuration
GOOGLE_CLOUD_PROJECT=your-project-id
VERTEX_AI_LOCATION=us-central1

# YouTube Data API Configuration
YOUTUBE_API_KEY=your_youtube_api_key_here

# Cloud Function Configuration
FUNCTION_REGION=us-central1
FUNCTION_MEMORY=512MB
FUNCTION_TIMEOUT=60s

# Service Account Configuration
SERVICE_ACCOUNT_EMAIL=youtube-analyzer-sa@your-project-id.iam.gserviceaccount.com
```

### 3. Google Cloud Setup

#### Create Project and Enable APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"

# Create project (if needed)
gcloud projects create $PROJECT_ID --name="YouTube Comment Analyzer"

# Set as default project
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable aiplatform.googleapis.com
gcloud services enable youtube.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
```

#### Create Service Account

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

# Add Cloud Build permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:48402388528-compute@developer.gserviceaccount.com" \
    --role="roles/cloudbuild.builds.builder"
```

#### Create YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** > **Credentials**
3. Click **+ CREATE CREDENTIALS** > **API key**
4. Restrict the key to **YouTube Data API v3**
5. Copy the key to your `env.local` file

### 4. Local Development

#### Start Backend

```bash
# Load environment variables
source env.local

# Start Cloud Function locally
npm start
```

The backend will be available at `http://localhost:8080`

#### Start Frontend

```bash
# In a new terminal
python3 -m http.server 3000
```

The frontend will be available at `http://localhost:3000`

#### Test the Application

1. Open `http://localhost:3000` in your browser
2. Enter a YouTube URL (e.g., `https://www.youtube.com/watch?v=dQw4w9WgXcQ`)
3. Click "Analyze Comments"
4. Wait for analysis (10-30 seconds)
5. View results!

### 5. Deploy to Production

#### Deploy Cloud Function

```bash
# Deploy to Google Cloud
gcloud functions deploy analyze-comments \
    --gen2 \
    --runtime=nodejs20 \
    --region=us-central1 \
    --source=. \
    --entry-point=analyzeComments \
    --trigger-http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=60s \
    --service-account=youtube-analyzer-sa@$PROJECT_ID.iam.gserviceaccount.com \
    --set-env-vars=YOUTUBE_API_KEY=$YOUTUBE_API_KEY,GOOGLE_CLOUD_PROJECT=$PROJECT_ID
```

#### Update Frontend for Production

Edit `script.js` and update the API endpoint:

```javascript
this.apiEndpoint = "https://your-function-url.com";
```

#### Deploy Frontend

Choose one of these options:

**Option 1: Netlify (Recommended)**

1. Drag and drop `index.html`, `style.css`, and `script.js` to Netlify
2. Your site will be live instantly

**Option 2: GitHub Pages**

1. Push to GitHub repository
2. Enable GitHub Pages in repository settings

**Option 3: Firebase Hosting**

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize Firebase
firebase init hosting

# Deploy
firebase deploy
```

## 🧪 Testing

### Manual Testing

Test with various YouTube URL formats:

- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

### Automated Testing

```bash
# Test backend locally
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Test deployed function
curl -X POST https://your-function-url.com \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

## 🔧 Configuration

### Environment Variables

| Variable               | Description             | Required                  |
| ---------------------- | ----------------------- | ------------------------- |
| `YOUTUBE_API_KEY`      | YouTube Data API v3 key | Yes                       |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud project ID | Yes                       |
| `VERTEX_AI_LOCATION`   | Vertex AI region        | No (default: us-central1) |

### Function Configuration

| Setting | Value       | Description                |
| ------- | ----------- | -------------------------- |
| Runtime | Node.js 20  | JavaScript runtime         |
| Memory  | 512MB       | Function memory allocation |
| Timeout | 60s         | Maximum execution time     |
| Region  | us-central1 | Deployment region          |

## 🔍 Troubleshooting

### Common Issues

**1. "One or more users named in the policy do not belong to a permitted customer"**

- This is an organization policy restriction
- Contact your organization admin to allow the required permissions
- Or use authentication for function access

**2. "API quota exceeded"**

- Check your YouTube Data API quota in Google Cloud Console
- Consider implementing caching for frequently analyzed videos

**3. "AI service error"**

- Verify Vertex AI API is enabled
- Check service account permissions
- Ensure Gemini 2.5 Pro model is accessible

**4. "Comments disabled"**

- Some videos have comments disabled
- Handle gracefully in your application

### Debug Commands

```bash
# Check function logs
gcloud functions logs read analyze-comments --region=us-central1

# Test function with authentication
curl -X POST https://your-function-url.com \
  -H "Authorization: Bearer $(gcloud auth print-identity-token)" \
  -H "Content-Type: application/json" \
  -d '{"videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# Check IAM permissions
gcloud projects get-iam-policy $PROJECT_ID
```

## 📊 Performance & Cost

### Performance Metrics

- **Average Response Time**: 10-30 seconds
- **Comments Processed**: Up to 50 per analysis
- **Text Length**: Limited to ~8000 characters for AI processing

### Cost Estimation

- **Cloud Functions**: ~$0.40 per million invocations
- **Vertex AI**: ~$0.002 per 1K characters processed
- **YouTube API**: Free up to 10K units/day
- **Estimated cost per analysis**: $0.01-0.05

### Optimization Tips

- Implement result caching
- Use efficient AI models
- Monitor API quotas
- Optimize comment processing

## 🔒 Security

### Best Practices

- ✅ Store API keys as environment variables
- ✅ Restrict API keys to specific services
- ✅ Use service accounts with minimal permissions
- ✅ Enable audit logging
- ✅ Regularly rotate credentials

### CORS Configuration

The function includes CORS headers for web frontend access:

```javascript
res.set("Access-Control-Allow-Origin", "*");
res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
res.set("Access-Control-Allow-Headers", "Content-Type");
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Cloud Functions**: Serverless computing platform
- **Gemini AI**: Advanced AI model for analysis
- **Tailwind CSS**: Utility-first CSS framework
- **YouTube Data API**: Video and comment data access
- **Font Awesome**: Beautiful icons

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review the [TDD.md](TDD.md) for technical details
3. Open an issue on GitHub
4. Check Google Cloud Console logs for detailed error information

---

**Happy Analyzing! 🎉**

_Built with ❤️ using Google Cloud Functions and Gemini AI_
