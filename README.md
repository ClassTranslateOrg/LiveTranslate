# Live-Translate

A real-time video conferencing application with live translation capabilities.

## Features

- Video conferencing powered by Zoom SDK
- Real-time speech translation using OpenAI Whisper
- In-meeting chat functionality
- Support for multiple languages
- Clean, intuitive user interface

## Technology Stack

- Frontend: React.js
- Translation: OpenAI Whisper API
- Video Conferencing: Zoom SDK
- Deployment: AWS Amplify
- Domain: live-translate.org

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Zoom Developer Account
- OpenAI API Key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/LiveTranslate.git
cd LiveTranslate
```

2. Install dependencies
```bash
cd frontend
npm install
```

3. Create a `.env` file in the frontend directory with your API keys
```
REACT_APP_ZOOM_SDK_KEY=your_zoom_sdk_key
REACT_APP_ZOOM_SDK_SECRET=your_zoom_sdk_secret
REACT_APP_OPENAI_API_KEY=your_openai_api_key
REACT_APP_API_URL=http://localhost:3000
REACT_APP_ENV=development
```

4. Start the development server
```bash
npm start
```

5. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

### Local Development Testing

For local development testing:

1. The application is configured to run on `localhost:3000` by default
2. Zoom SDK integration uses a mock signature for local testing
3. API calls will be directed to the local development server
4. You'll see a yellow notice bar indicating you're in local development mode

## Deployment

The application is deployed using AWS Amplify and is accessible at [live-translate.org](https://live-translate.org).

For production deployment, update the `.env` file with production values and remove the development indicators.