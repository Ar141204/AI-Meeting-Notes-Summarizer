# AI-Powered Meeting Notes Summarizer

A full-stack web application that uses Google Gemini AI to generate structured summaries from meeting transcripts and allows sharing via email.

## Features

- **File Upload**: Upload text files containing meeting transcripts
- **Direct Text Input**: Paste transcript text directly into the interface
- **Custom Instructions**: Add custom prompts to tailor the summary format
- **AI-Powered Summarization**: Uses Google Gemini for intelligent summarization
- **Editable Summaries**: Edit the generated summary before sharing
- **Email Sharing**: Share summaries via email to multiple recipients

## Tech Stack

### Backend
- **Node.js** with Express.js framework
- **Google Gemini API** for AI summarization
- **Nodemailer** for email functionality
- **Multer** for file upload handling
- **CORS** for cross-origin requests

### Frontend
- **HTML5** for structure
- **CSS3** for styling (responsive design)
- **Vanilla JavaScript** for interactivity
- **Fetch API** for backend communication

### Deployment
- **Backend**: Node.js server (can be deployed on Heroku, Railway, etc.)
- **Frontend**: Static files served by Express

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in the required values:

```env
# Google Gemini API Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Email Configuration (Gmail SMTP)
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password

# Server Configuration
PORT=3000
NODE_ENV=development or production
```

### 3. Gmail Setup for Email Sharing

1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in `EMAIL_PASS`(.env)

### 4. Run the Application

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

### POST `/api/generate-summary`
Generates AI summary from transcript text or uploaded file.

**Request:**
- `transcriptText` (string): Direct text input
- `transcript` (file): Text file upload
- `customPrompt` (string, optional): Custom instructions

**Response:**
```json
{
  "summary": "Generated summary text..."
}
```

### POST `/api/share-summary`
Shares summary via email.

**Request:**
```json
{
  "summary": "Summary text to share",
  "recipients": ["email1@example.com", "email2@example.com"],
  "subject": "Meeting Summary"
}
```

**Response:**
```json
{
  "message": "Summary shared successfully"
}
```

### GET `/api/health`
Health check endpoint.

## Usage Flow

1. **Upload Transcript**: Choose a transcript file or paste transcript directly
2. **Add Instructions**: Optionally specify how you want the summary formatted
3. **Generate Summary**: Click "Generate Summary" to process with AI
4. **Edit Summary**: Modify the generated summary as needed
5. **Share**: Enter email addresses and send the summary

## Example Custom Prompts

- "Summarize in bullet points for executives"
- "Highlight only action items and deadlines"
- "Create a structured summary with key decisions and next steps"
- "Focus on technical discussions and implementation details"

## Error Handling

- File upload validation (text files only, 10MB limit)
- Email address validation
- API error handling with user-friendly messages
- Loading states and status indicators

## Security Considerations

- Environment variables for sensitive data
- File type validation
- Input sanitization
- CORS configuration
- Rate limiting (can be added for production)

## Deployment Notes

For production deployment:
1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Add rate limiting middleware
4. Use a process manager like PM2
5. Set up proper logging
6. Configure HTTPS

## Dependencies

### Production
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `multer`: File upload handling
- `nodemailer`: Email functionality
- `@google/generative-ai`: Google Gemini API client
- `dotenv`: Environment variable management

### Development
- `nodemon`: Development server with auto-restart
