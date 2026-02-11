const nodemailer = require('nodemailer');
const User = require('../models/userModel');

const sendContactEmail = async (req, res) => {
  try {
    const { email, message } = req.body;

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Email options
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: '24xz5a0515@gmail.com',
      subject: `Contact Form Message from ${user.username}`,
      html: `
        <h2>New Contact Message</h2>
        <p><strong>From:</strong> ${user.username} (${email})</p>
        <p><strong>User Email:</strong> ${user.email}</p>
        <p><strong>Message:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><small>Sent from CloudBox Dashboard</small></p>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};

module.exports = { sendContactEmail };
