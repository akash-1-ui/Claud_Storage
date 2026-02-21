const nodemailer = require('nodemailer');
const User = require('../models/userModel');

const sendContactEmail = async (req, res) => {
  try {
    const { email, message } = req.body;
    const emailUser = (process.env.EMAIL_USER || '').trim();
    const emailPass = (process.env.EMAIL_PASS || '')
      .replace(/\s+/g, '')
      .replace(/^['"]|['"]$/g, '');

    // Validate input
    if (!email || !message) {
      return res.status(400).json({ success: false, message: 'Email and message are required' });
    }

    // Check if email credentials are configured
    if (!emailUser || !emailPass) {
      console.error('Email credentials not configured in .env');
      return res.status(500).json({ 
        success: false, 
        message: 'Email service is not configured. Please contact the administrator.' 
      });
    }

    // Get user details
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: emailUser,
        pass: emailPass
      }
    });

    // Email options
    const mailOptions = {
      from: emailUser,
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
    console.error('Email send error - Full details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    
    let errorMessage = 'Failed to send email';
    
    // Provide specific error messages
    if (error.code === 'EAUTH') {
      errorMessage = 'Email authentication failed. Verify Gmail app password, then restart backend server.';
    } else if (error.message.includes('connect')) {
      errorMessage = 'Failed to connect to email service. Please try again later.';
    } else if (error.message.includes('Invalid login')) {
      errorMessage = 'Invalid email credentials. Check EMAIL_USER and EMAIL_PASS.';
    } else if (error.message.includes('ENOTFOUND')) {
      errorMessage = 'Cannot reach Gmail service. Check your internet connection.';
    }
    
    res.status(500).json({ success: false, message: errorMessage });
  }
};

module.exports = { sendContactEmail };
