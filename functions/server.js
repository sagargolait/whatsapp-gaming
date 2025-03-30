const serverless = require('serverless-http');
const express = require('express');
const session = require('express-session');
const path = require('path');

// Import your existing app logic
const multiPlayerModeHandler = require('../lib/mode-controllers/multiplayer');
const singlePlayerModeHandler = require('../lib/mode-controllers/singleplayer');
const { singlePlayerWelcomeMsg, serverErrorMsg } = require('../lib/messages');
const {
  sendMessage,
  saveUserSession,
  broadcastMessage,
  sessionConfig
} = require('../lib/utils');

// Create Express app
const app = express();

// Parse incoming Twilio request
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Add raw body parsing for Twilio signature validation
app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

// Session middleware with modified cookie settings for serverless
const netlifySessionConfig = {
  ...sessionConfig,
  cookie: {
    ...sessionConfig.cookie,
    // Ensure cookies work in serverless environment
    sameSite: 'none'
  }
};

// Session middleware
app.use(session(netlifySessionConfig));

// Custom properties attached on each request & response
app.use((req, res, next) => {
  req.user = req.session.user;
  res.sendMessage = sendMessage(res);
  req.saveUserSession = saveUserSession(req);
  req.broadcastMessage = broadcastMessage(req);
  next();
});

// Simple debug endpoint
app.get('/', (req, res) => {
  console.log('GET request received');
  res.send('SMS Gaming Platform is running!');
});

// The main endpoint where messages arrive
app.post('/', async (req, res) => {
  console.log('POST webhook received:', JSON.stringify(req.body));
  
  // Simple direct response for debugging
  if (req.body && req.body.Body) {
    const twiml = new (require('twilio').twiml.MessagingResponse)();
    twiml.message(`You said: ${req.body.Body}. This is a test response.`);
    
    console.log('Sending response:', twiml.toString());
    
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    return res.end(twiml.toString());
  }
  
  // If we reach here, try the normal flow
  try {
    const user = req.session.user || {};
    
    if (user.mode === 'single-player') {
      singlePlayerModeHandler(req, res);
    } else if (user.mode === 'multi-player') {
      multiPlayerModeHandler(req, res);
    } else {
      const userSession = {
        phone: req.body.From,
        mode: 'single-player'
      };

      await req.saveUserSession(userSession);
      res.sendMessage(singlePlayerWelcomeMsg);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    
    // Send a simple error response
    const twiml = new (require('twilio').twiml.MessagingResponse)();
    twiml.message('Sorry, there was an error processing your request.');
    
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
});

// Export the serverless handler
module.exports.handler = serverless(app);
