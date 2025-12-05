# AI-Powered RFP Management System

## Live Demo
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Email Testing: http://localhost:8025

## Features
1. **Natural Language RFP Creation** - Describe needs in plain English
2. **Vendor Management** - CRUD operations for vendors
3. **Email Automation** - Send RFPs via MailHog
4. **AI Response Parsing** - Extract data from vendor emails
5. **Intelligent Comparison** - AI-powered proposal evaluation

## Tech Stack
- **Frontend**: React, Tailwind CSS, Axios
- **Backend**: Node.js, Express, MongoDB
- **AI**: Groq API (Llama 3.3 70B)
- **Email**: MailHog, Nodemailer

## Setup
1. Clone repository
2. Install dependencies: `npm install` (both folders)
3. Configure environment variables (.env files)
4. Run MailHog: `MailHog.exe`
5. Start backend: `node server.js`
6. Start frontend: `npm start`

## API Documentation
- `POST /api/rfp/generate` - Create RFP from text
- `POST /api/rfp/:id/send` - Send RFP to vendors
- `GET /api/vendors` - List all vendors
- `POST /api/proposals/parse-demo` - Parse vendor proposal
- `GET /api/proposals/compare/:rfpId` - Compare proposals with AI