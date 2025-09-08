require('dotenv').config();
const { sendVerificationEmail } = require('../utils/emailSender');

// Test sending an email
(async () => {
  try {
    console.log('Attempting to send test email...');
    await sendVerificationEmail('recipient@example.com', '123456');
    console.log('Test email sent successfully!');
  } catch (error) {
    console.error('Failed to send test email:', error);
  }
})();