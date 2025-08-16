const { GoogleGenerativeAI } = require('@google/generative-ai');

exports.handler = async (event, context) => {
  // Handle CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { transcriptText, customPrompt } = JSON.parse(event.body);

    if (!transcriptText) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No transcript provided' })
      };
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Create the full prompt
    const defaultPrompt = 'Summarize the following meeting notes in a clear and structured format:';
    const fullPrompt = `${customPrompt || defaultPrompt}\n\nTranscript:\n${transcriptText}`;

    // Generate summary using Gemini
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const summary = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ summary })
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate summary' })
    };
  }
};
