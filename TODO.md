# TODO List for Dashboard Updates

## 1. Remove Logo from Intro Page
- [x] Edit backend/dashboard-react/src/Intro.jsx to remove the logo image.

## 2. Add Contact Page to Dashboard
- [x] Add 'contact' to activeSection state in Dashboard.jsx.
- [x] Add Contact nav item in sidebar.
- [x] Add Contact section in main content with form (user mail, message, submit button).
- [x] Add submit handler to send email via API.

## 3. Set Up Email Sending Backend
- [x] Install nodemailer in backend.
- [x] Create contactController.js with sendContactEmail function.
- [x] Add contact route in routes/contactRoutes.js.
- [x] Update server.js to use contact routes.
- [x] Set up Gmail SMTP credentials (need .env).

## 4. Fix Storage Used Bar
- [x] Ensure storageUsed is updated in user model on upload.
- [x] Verify getStorageInfo in Dashboard.jsx uses userProfile.storageUsed.
- [x] Test with uploaded files.

## 5. Testing
- [x] Test logo is removed from intro (code verified).
- [ ] Test contact form sends email (requires Gmail app password).
- [x] Test storage bar shows correct usage (code verified, logic correct).
