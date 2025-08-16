const nodemailer = require('nodemailer');

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
    const { summary, recipients, subject } = JSON.parse(event.body);

    if (!summary || !recipients || recipients.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Summary and recipients are required' })
      };
    }

    // Configure nodemailer
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Summary shared successfully' })
    };
  } catch (error) {
    console.error('Error sharing summary:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to share summary' })
    };
  }
};
