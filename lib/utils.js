const twilio = require('twilio');
const MessagingResponse = twilio.twiml.MessagingResponse;

// Check if environment variables are properly loaded
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Validate Twilio credentials before initializing the client
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
  console.error('Error: Twilio credentials are missing. Please check your .env.local file.');
  console.error('Make sure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are properly set.');
  // Using dummy values for development if not set
  console.log('Using dummy Twilio credentials for development');
}

// Initialize Twilio client with explicit parameters
const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Function to send a direct WhatsApp message using Twilio client
const sendWhatsAppMessage = async (to, message) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.error('Cannot send WhatsApp message: Twilio credentials missing');
    return false;
  }

  try {
    console.log(`Sending direct WhatsApp message to ${to}`);
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER || '+14155238886'}`, // Default to Twilio sandbox number
      to: `whatsapp:${to}`
    });
    console.log(`WhatsApp message sent successfully, SID: ${result.sid}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
};

const sendMessage = res => message => {
  console.log('Preparing to send message to Twilio:', message ? message.substring(0, 100) + '...' : 'null');
  
  try {
    const twiml = new MessagingResponse();

    if (message instanceof Array) {
      for (const msg of message) {
        twiml.message(msg);
      }
    } else {
      twiml.message(message);
    }

    const twimlString = twiml.toString();
    console.log('Generated TwiML response:', twimlString.substring(0, 100) + '...');
    
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twimlString);
    console.log('Message sent to Twilio successfully');
    
    // Also try to send a direct WhatsApp message if we have the user's phone number
    if (res.req && res.req.body && res.req.body.From) {
      const userPhone = res.req.body.From.replace('whatsapp:', '');
      sendWhatsAppMessage(userPhone, message).catch(err => {
        console.error('Failed to send direct WhatsApp message:', err);
      });
    }
  } catch (error) {
    console.error('Error sending message to Twilio:', error);
    // Still try to send a response to prevent hanging requests
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Error generating response');
  }
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
  sessionConfig,
  sendWhatsAppMessage
};
