const serverless = require('serverless-http');
const express = require('express');
const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;

// Create Express app
const app = express();

// Parse incoming Twilio request
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Simple GET endpoint for testing
app.get('/', (req, res) => {
  console.log('GET request received');
  res.status(200).send('SMS Gaming Platform is running!');
});

// Simple POST endpoint that just echoes back the message
app.post('/', (req, res) => {
  console.log('POST request received:', req.body);
  
  try {
    const twiml = new MessagingResponse();
    
    // Get the incoming message text
    const incomingMsg = req.body.Body || 'No message provided';
    
    // Send a simple response
    twiml.message(`You said: ${incomingMsg}. This is a test response from Netlify function.`);
    
    // Set the correct headers and send the response
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
    
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error in POST handler:', error);
    res.status(500).send('Server error');
  }
});

// Export the serverless handler
module.exports.handler = serverless(app);
