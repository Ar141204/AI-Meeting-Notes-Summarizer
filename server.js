const express = require('express');
const cors = require('cors');
const multer = require('multer');
const nodemailer = require('nodemailer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
require('dotenv').config();

// Force garbage collection periodically to prevent memory buildup
if (global.gc) {
  setInterval(() => {
    global.gc();
  }, 30000); // Run GC every 30 seconds
}

const app = express();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Initialize OpenAI for voice transcription (optional)
let openai = null;
if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // Reduced to 5MB limit to prevent memory issues
    files: 1 // Only allow 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/m4a',
      'audio/webm',
      'audio/ogg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not supported. Please upload text, PDF, DOC, DOCX, or audio files.'), false);
    }
  }
});

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Helper function to extract text from different file types
async function extractTextFromFile(file) {
  const { buffer, mimetype, originalname } = file;
  
  try {
    switch (mimetype) {
      case 'text/plain':
        return buffer.toString('utf-8');
        
      case 'application/pdf':
        const pdfData = await pdfParse(buffer);
        const pdfText = pdfData.text;
        // Clear buffer from memory
        buffer = null;
        return pdfText;
        
      case 'application/msword':
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        const docResult = await mammoth.extractRawText({ buffer });
        const docText = docResult.value;
        // Clear buffer from memory
        buffer = null;
        return docText;
        
      case 'audio/mpeg':
      case 'audio/wav':
      case 'audio/mp4':
      case 'audio/m4a':
      case 'audio/webm':
      case 'audio/ogg':
        // For audio files, we need to use OpenAI Whisper
        if (!openai) {
          throw new Error('Audio transcription requires OpenAI API key. Please either:\n1. Add OPENAI_API_KEY to your .env file, or\n2. Use the text input field to paste your transcript manually after transcribing the audio file.');
        }
        
        try {
          // Check file size for audio processing (limit to 2MB for memory efficiency)
          if (buffer.length > 2 * 1024 * 1024) {
            throw new Error('Audio file too large. Please use files smaller than 2MB or use text input instead.');
          }
          
          // Create a readable stream from buffer for OpenAI API
          const { Readable } = require('stream');
          const audioStream = new Readable();
          audioStream.push(buffer);
          audioStream.push(null);
          
          // Add filename property to stream for OpenAI API
          audioStream.path = originalname;
          
          const transcription = await openai.audio.transcriptions.create({
            file: audioStream,
            model: "whisper-1",
          });
          
          // Clear buffer from memory immediately after use
          buffer = null;
          
          return transcription.text;
        } catch (audioError) {
          console.error('Audio transcription error:', audioError);
          // Clear buffer from memory on error
          buffer = null;
          throw new Error(`Audio transcription failed: ${audioError.message}. Please try a smaller audio file or use text input instead.`);
        }
        
      default:
        throw new Error('Unsupported file type');
    }
  } catch (error) {
    throw new Error(`Failed to extract text from ${mimetype}: ${error.message}`);
  }
}

// Generate summary endpoint
app.post('/api/generate-summary', upload.single('transcript'), async (req, res) => {
  try {
    // Check if API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      console.error('Gemini API key not configured');
      return res.status(500).json({ error: 'Gemini API key not configured. Please check your .env file.' });
    }

    let transcriptText = '';
    const customPrompt = req.body.customPrompt || 'CRITICAL FORMATTING RULES:\n1. Use descriptive labels followed by hyphens and content\n2. Use **bold** for research tasks and action items\n3. Keep formatting clean with descriptive categories\n4. Use hyphens (-) after labels\n\nFormat example:\n\nDiscussion point:\n - Quantum computers and their ability to factor large numbers efficiently.\nKey concept:\n - Quantum computers\' efficiency in factoring is not directly related to quantum mechanics, but rather to their ability to find periods of periodic functions.\nDiscussion point:\n - The connection between period finding and factoring large numbers.\nKey point:\n - Efficient period finding allows for efficient factoring.\n**Research: Further investigate the purely arithmetic reasons connecting period finding and factoring.**\nKey application:\n - The implication of efficient factoring for breaking RSA encryption.\nHistorical note:\n - Peter Shor\'s discovery of quantum computers\' super efficiency in period finding (1994-1995).\nKey concern:\n - The potential threat to internet security posed by quantum computers.\n\nSTRICT REQUIREMENTS:\nUse descriptive labels like "Discussion point:", "Key concept:", "Key point:", "Historical note:", etc.\nFollow each label with a line break and hyphen (-) with content\nUse **bold** for research tasks and action items\nNo bullet points (•) or other symbols';

    // Get transcript text from file upload or direct input
    if (req.file) {
      console.log('Processing file:', req.file.originalname, 'Type:', req.file.mimetype);
      transcriptText = await extractTextFromFile(req.file);
    } else if (req.body.transcriptText) {
      transcriptText = req.body.transcriptText;
    } else {
      return res.status(400).json({ error: 'No transcript provided' });
    }

    if (!transcriptText.trim()) {
      return res.status(400).json({ error: 'Transcript text is empty' });
    }

    console.log('Generating summary for transcript of length:', transcriptText.length);
    console.log('Using prompt:', customPrompt);

    // Create the full prompt
    const fullPrompt = `${customPrompt}\n\nTranscript:\n${transcriptText}`;

    // Generate summary using Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const summary = response.text();

    console.log('Summary generated successfully');
    res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error.message);
    console.error('Full error:', error);
    
    if (error.message.includes('API_KEY_INVALID')) {
      res.status(500).json({ error: 'Invalid Gemini API key. Please check your API key.' });
    } else if (error.message.includes('PERMISSION_DENIED')) {
      res.status(500).json({ error: 'Permission denied. Please check your Gemini API key permissions.' });
    } else if (error.message.includes('OpenAI API key required')) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to generate summary: ' + error.message });
    }
  }
});

// Share summary via email endpoint
app.post('/api/share-summary', async (req, res) => {
  try {
    console.log('Email share request received:', req.body);
    console.log('EMAIL_USER configured:', !!process.env.EMAIL_USER);
    console.log('EMAIL_PASS configured:', !!process.env.EMAIL_PASS);
    
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || 
        process.env.EMAIL_USER === 'your_gmail_address@gmail.com' ||
        process.env.EMAIL_PASS === 'your_gmail_app_password') {
      console.log('Email credentials not configured properly');
      return res.status(500).json({ 
        error: 'Email credentials not configured. Please set EMAIL_USER and EMAIL_PASS in your .env file.' 
      });
    }

    const { summary, recipients, subject } = req.body;

    if (!summary || !recipients || recipients.length === 0) {
      return res.status(400).json({ error: 'Summary and recipients are required' });
    }

    console.log('Attempting to send email to:', recipients);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipients.join(', '),
      subject: subject || 'Meeting Summary',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Meeting Summary</h2>
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            ${summary.replace(/\n/g, '<br>')}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            This summary was generated using AI-powered meeting notes summarizer.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
    res.json({ message: 'Summary shared successfully' });
  } catch (error) {
    console.error('Error sharing summary:', error.message);
    console.error('Full error:', error);
    
    if (error.code === 'EAUTH') {
      res.status(500).json({ 
        error: 'Email authentication failed. Please check your Gmail credentials and ensure you are using an App Password, not your regular password.' 
      });
    } else if (error.code === 'ECONNECTION') {
      res.status(500).json({ 
        error: 'Failed to connect to email server. Please check your internet connection.' 
      });
    } else {
      res.status(500).json({ error: 'Failed to share summary: ' + error.message });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
