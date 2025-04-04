const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;

// Check if environment variables are properly loaded
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Validate Twilio credentials before initializing the client
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('Error: Twilio credentials are missing. Please check your .env.local file.');
  console.error('Make sure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are properly set.');
}

// Initialize Twilio client with explicit parameters
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const sendMessage = res => message => {
  const twiml = new MessagingResponse();

  if (message instanceof Array) {
    for (const msg of message) {
      twiml.message(msg);
    }
  } else {
    twiml.message(message);
  }

  res.writeHead(200, { 'Content-Type': 'text/xml' });
  res.end(twiml.toString());
};

const saveUserSession = req => user => {
  req.session.user = user;

  return new Promise((resolve, reject) => {
    req.session.save(err => {
      if (err) reject(err);
      else resolve(user);
    });
  });
};

const broadcastMessage = req => async (message, users) => {
  const { To: smsGamingNum } = req.body;

  for (const user of users) {
    await client.messages.create({
      body: message,
      from: smsGamingNum,
      to: user.phone
    });
  }
};

const sessionConfig = {
  name: 'SESS_ID',
  secret: process.env.SESSION_SECRET || 'default_session_secret',
  resave: false,
  saveUninitialized: false,
  // Twilio expires cookie after 4 hours automatically
  cookie: {
    secure: process.env.NODE_ENV === 'production'
  }
};

module.exports = {
  sendMessage,
  saveUserSession,
  broadcastMessage,
  sessionConfig
};
