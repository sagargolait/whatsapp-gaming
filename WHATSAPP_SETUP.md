# WhatsApp Integration Guide for SMS Gaming Platform

This guide will help you properly set up your SMS Gaming Platform on WhatsApp after deploying to Netlify.

## Deployment Steps

1. **Push your code to GitHub** (if not already done)

2. **Deploy to Netlify**:
   - Log in to Netlify
   - Click "New site from Git"
   - Connect to your GitHub repository
   - Use these build settings:
     - Build command: `npm run build`
     - Publish directory: `public`
   - Click "Deploy site"

3. **Set Environment Variables in Netlify**:
   - Go to Site settings > Environment variables
   - Add the following variables:
     ```
     TWILIO_ACCOUNT_SID=your_account_sid
     TWILIO_AUTH_TOKEN=your_auth_token
     SESSION_SECRET=your_session_secret
     NODE_ENV=production
     ```

## WhatsApp Configuration

1. **Configure WhatsApp Sandbox in Twilio**:
   - Log in to your Twilio Console
   - Navigate to Messaging > Try it out > Send a WhatsApp message
   - In the WhatsApp Sandbox Settings section:
     - Set "WHEN A MESSAGE COMES IN" to: `https://your-site-name.netlify.app/.netlify/functions/server`
     - Make sure HTTP Method is set to POST

2. **Join WhatsApp Sandbox**:
   - Send the join code (shown in Twilio console) to your Twilio WhatsApp number
   - This step is necessary for testing in the WhatsApp Sandbox

## Troubleshooting

If you're not getting responses:

1. **Check Netlify Function Logs**:
   - Go to Netlify dashboard > Functions > Function logs
   - Look for errors in the server function

2. **Verify Webhook URL**:
   - Make sure you're using the `.netlify/functions/server` path
   - Test the endpoint with a tool like Postman

3. **Test with a Simple GET Request**:
   - Visit `https://your-site-name.netlify.app/.netlify/functions/server` in your browser
   - You should see "SMS Gaming Platform is running!"

4. **Check Twilio Logs**:
   - Go to Twilio Console > Monitor > Logs
   - Look for any errors related to your webhook

## Important Notes

- WhatsApp has a 24-hour session window for business messages
- Initial users need to send the join code to opt in to your WhatsApp service
- The serverless function has been configured to handle both SMS and WhatsApp messages

For any additional help, refer to:
- [Twilio WhatsApp API Documentation](https://www.twilio.com/docs/whatsapp/api)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
