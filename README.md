# Live-Translate

A real-time video conferencing application with live translation capabilities.

## Features

- Peer-to-peer video conferencing using WebRTC
- Real-time speech translation using OpenAI Whisper
- In-meeting chat functionality with translation
- Support for multiple languages
- Clean, intuitive user interface
- AWS Amplify authentication with Google OAuth

## Technology Stack

- Frontend: React.js
- Translation: OpenAI Whisper API
- Video Conferencing: WebRTC
- Authentication: AWS Cognito
- Deployment: AWS Amplify
- Domain: live-translate.org

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API Key
- AWS Account with Cognito User Pool

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
# AWS Amplify Configuration
REACT_APP_AWS_REGION=us-east-1
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-client-id
REACT_APP_DOMAIN=live-translate.org

# API Configuration
REACT_APP_API_URL=http://localhost:3001

# OpenAI Configuration
REACT_APP_OPENAI_API_KEY=your-openai-api-key

# Environment
REACT_APP_ENV=development
```

4. Start the development server
```bash
npm start
```

5. In a separate terminal, start the backend server
```bash
cd ../server
npm install
npm run dev
```

6. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Authentication Setup

1. Create a User Pool in AWS Cognito
2. Add Google as an identity provider
3. Configure the domain for your Cognito hosted UI
4. Add the client ID and user pool ID to your .env file

## Deployment

The application is deployed using AWS Amplify and is accessible at [live-translate.org](https://live-translate.org).

### Deployment Steps

1. Connect your GitHub repository to AWS Amplify
2. Configure the build settings as specified in `amplify.yml`
3. Add the required environment variables in the Amplify Console:
   - REACT_APP_AWS_REGION
   - REACT_APP_USER_POOL_ID
   - REACT_APP_USER_POOL_CLIENT_ID
   - REACT_APP_DOMAIN
   - REACT_APP_API_URL
   - REACT_APP_OPENAI_API_KEY
4. Deploy your application