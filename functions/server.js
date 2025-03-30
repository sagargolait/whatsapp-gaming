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

// The main endpoint where messages arrive
app.post('/', async (req, res) => {
  console.log('Received webhook:', req.body);
  const user = req.session.user || {};

  try {
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
    res.sendMessage(serverErrorMsg);
  }
});

// Add a simple GET endpoint for health checks
app.get('/', (req, res) => {
  res.send('SMS Gaming Platform is running!');
});

// Export the serverless handler
module.exports.handler = serverless(app);
