// src/utils/sendEmail.js
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async ({ to, subject, html }) => {
  await sgMail.send({
    to,
    from: process.env.FROM_EMAIL, // Must be verified in SendGrid
    subject,
    html,
  });
};

export default sendEmail;
