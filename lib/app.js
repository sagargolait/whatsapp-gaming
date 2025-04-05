require('dotenv').config();

const multiPlayerModeHandler = require('./mode-controllers/multiplayer');
const singlePlayerModeHandler = require('./mode-controllers/singleplayer');

const express = require('express');
const session = require('express-session');
const path = require('path');

const { singlePlayerWelcomeMsg, serverErrorMsg } = require('./messages');
const {
  sendMessage,
  saveUserSession,
  broadcastMessage,
  sessionConfig
} = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// Parse incoming Twilio request
app.use(express.urlencoded({ extended: false }));
// Parse JSON for API requests
app.use(express.json());

// Session middleware
app.use(session(sessionConfig));

// Custom properties attached on each request & response
app.use((req, res, next) => {
  req.user = req.session.user;
  res.sendMessage = sendMessage(res);
  req.saveUserSession = saveUserSession(req);
  req.broadcastMessage = broadcastMessage(req);
  next();
});

// Serve the WhatsApp UI on the root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// The main endpoint where messages arrive from Twilio
app.post('/webhook', async (req, res) => {
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
    console.error('Error processing webhook:', error);
    res.sendMessage(serverErrorMsg);
  }
});

// API endpoint to handle messages from the web interface
app.post('/api/messages', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    // Initialize user session if it doesn't exist
    if (!req.session.user) {
      req.session.user = {
        phone: 'web-user',
        mode: 'single-player'
      };
      // Save the session to ensure it persists
      await new Promise((resolve, reject) => {
        req.session.save(err => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
    
    // Create a mock request object similar to what Twilio would send
    const mockReq = {
      body: {
        Body: message,
        From: 'web-user',
      },
      session: req.session,
      user: req.session.user,
      saveUserSession: async (userData) => {
        req.session.user = userData;
        return new Promise((resolve, reject) => {
          req.session.save(err => {
            if (err) reject(err);
            else resolve(userData);
          });
        });
      },
      broadcastMessage: req.broadcastMessage
    };
    
    // Create a mock response object to capture the response
    const mockRes = {
      writeHead: () => {},
      end: (content) => {
        // Parse the TwiML response to extract the message
        const messageMatch = content.match(/<Message>(.*?)<\/Message>/s);
        const responseMessage = messageMatch ? messageMatch[1] : 'No response';
        
        res.json({ success: true, message: responseMessage });
      },
      sendMessage: (message) => {
        res.json({ success: true, message });
      }
    };
    
    // Process the message using the existing handlers
    if (mockReq.user && mockReq.user.mode === 'single-player') {
      await singlePlayerModeHandler(mockReq, mockRes);
    } else if (mockReq.user && mockReq.user.mode === 'multi-player') {
      await multiPlayerModeHandler(mockReq, mockRes);
    } else {
      const userSession = {
        phone: 'web-user',
        mode: 'single-player'
      };

      await mockReq.saveUserSession(userSession);
      mockRes.sendMessage(singlePlayerWelcomeMsg);
    }
    
    // Update the actual session with any changes made in the mock request
    req.session.user = mockReq.user;
    await new Promise((resolve, reject) => {
      req.session.save(err => {
        if (err) reject(err);
        else resolve();
      });
    });
    
  } catch (error) {
    console.error('Error processing API message:', error);
    res.status(500).json({ error: 'Failed to process message', details: error.message });
  }
});

// For backward compatibility, keep the root POST endpoint
app.post('/', async (req, res) => {
  // Redirect to the webhook endpoint
  req.url = '/webhook';
  app.handle(req, res);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
