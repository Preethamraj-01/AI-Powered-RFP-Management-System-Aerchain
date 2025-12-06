AI-Powered RFP Management System

To run project

1. Clone repository
2. Install dependencies: `npm install` (both folders, backend and frontend)
3. Configure environment variables (.env files)
4. Run MailHog: `MailHog.exe`
5. Start backend: `node server.js`
6. Start frontend: `npm start`

-----------------------------------------------------------------------------

Overview
A comprehensive procurement management system designed to streamline the Request for Proposal (RFP) process using artificial intelligence. The system transforms natural language procurement requirements into structured RFPs, manages vendor relationships, automates email communications, and provides intelligent proposal comparison using AI analysis.

Key Features
1.Natural Language RFP Creation: Users describe procurement needs in plain English, and the AI converts these descriptions into structured RFP documents with categorized items, budgets, and timelines.

2.Vendor Management System: Created master DB to store vendor information including contact details, categories, ratings, and historical performance tracking.

3.Email Automation: Integrated email system that sends RFPs to multiple desired vendors simultaneously.

4.AI-Powered Response Parsing: Advanced AI algorithms extract structured data from unstructured vendor attachments, converting them into analyzable formats.

5.Intelligent Proposal Comparison: AI evaluates multiple vendor proposals based on price, specifications, delivery timelines, and compliance with requirements, providing ranked recommendations.

6.Proposal Management: Centralized storage and organization of all vendor proposals with automatic data extraction and categorization.
--------------------------------------------
Technology Stack

>Frontend
React 18.x with functional components and hooks

Tailwind CSS for responsive and modern UI design

Axios for API communication

React Router for navigation

>Backend

Node.js with Express framework

MongoDB with Mongoose ODM

CORS and security middleware implementations

File upload handling with Multer

>AI Integration

Groq API with llama-3.1-8b-instant

Custom prompt engineering for different AI tasks

Structured JSON output parsing and validation

Fallback mechanisms for API reliability

>Email System

MailHog for development email testing

Nodemailer for SMTP email sending

Webhook endpoints for receiving vendor responses

Email parsing and attachment handling

>Database

MongoDB for flexible document storage

Mongoose schemas for data validation

Indexed collections for performance optimization

Connection pooling for scalability
-----------------------------------------------------------------------------
System Requirements
Software Prerequisites
Node.js version 18.0 or higher

MongoDB Community Edition or MongoDB Atlas account

npm package manager (included with Node.js)

Git for version control (optional)
--------------------------------------------------------------------
Installation Instructions

Step 1: Environment Setup
Extract the downloaded zip file to your preferred directory. Navigate to the project root folder using your terminal or command prompt.

Step 2: Backend Configuration
Navigate to the backend directory: cd backend

Install dependencies: npm install

Create environment configuration file: Copy .env (Note : I will add the .env code in the ReadMe of Github {Copy from code part}, since I was unable to push secrets..)

Configure the following environment variables in .env:

PORT: 5000 (backend server port)

MONGODB_URI: MongoDB connection string

GROQ_API_KEY: Your Groq API key

MAILHOG_PORT: 1025
-----------------------------------------------------------------
Step 3: Frontend Configuration

Navigate to the frontend directory: cd frontend

Install dependencies: npm install

Create environment configuration file: Copy .env.example to .env

Configure the following environment variable in .env:

REACT_APP_API_URL: http://localhost:5000/api
----------------------------------------------------------------------
Step 4: Email System Setup
Download MailHog from the official GitHub repository

Extract MailHog to an accessible directory

Run MailHog executable (no installation required)

Verify MailHog is running by accessing http://localhost:8025
-------------------------------------------------------------------------
Step 5: Database Configuration

MongoDB Atlas (Recommended)

Create free account at mongodb.com/cloud/atlas

Create a new cluster in your preferred region

Create database user with read/write permissions

Copy connection string and update MONGODB_URI in backend/.env

--------------------------------------------------------------------------

Step 6: Application Startup

Start MailHog email testing service

Start backend server: cd backend && npm start

Start frontend application: cd frontend && npm start

Access the application at http://localhost:3000

--------------------------------------------------------------------------

API Documentation

Note: All APIs are mentioned in routes folder

Base Url or REACT_APP_API_URL: http://localhost:5000/api

>Important APIs

-- http://localhost:5000/api/rfp - to fetch all request for proposals

-- router.get("/", getAllVendors); -> to get all vendors for selection 

--  sendToVendors: (id, vendorIds) => {
    console.log('Sending RFP to vendors:', { id, vendorIds });
    return api.post(`/rfp/${id}/send`, { vendorIds });
  }

-- router.post("/compare", upload.array("proposalFiles", 10), compareProposals); -> to post files for comparison

-- router.get("/results/:rfpId", getComparisonResults); -> to get comparison results

-- router.post("/generate", generateRFP); -> generate rfps using groq ai

-- router.get("/", getAllRFPs); -> get all rfps

-- router.post("/:id/send", sendRFPToVendors); -> to send rfp to vendors

-- router.post('/parse-demo', upload.single('file'), parseDemoProposal); -> parse proposal


------------------------------------------------------------

 Decisions & Assumptions

1. The Manager/User enters the RFP in plain English, clicks Send, and the system converts it into a structured RFP format. The UI also displays the complete list of all vendors and all created RFPs.

2. The user selects the desired vendor and sends the structured RFP via email, and the sent email can be viewed in the MailHog server.

3. Assumptions: It is assumed that the vendor will respond to the received RFP via email with a proposal attached as a .txt file (inbound email processing was not fully completed due to time constraints). In this system, the user can manually upload the vendor’s .txt proposal—often unstructured or messy—and the AI will parse it to extract structured information and summarize key points.

4. AI Comparison: In the final step, the user selects an RFP from the created list and compares proposals submitted by multiple vendors. AI analyzes the proposals, highlights key points, and helps determine the best vendor match.

-----------------------------------------------------------------------

AI Tools Usage

Used Github copilot for UI design and ChatGPT for few coding and AI integration

I learned a lot using GitHUb copilot. It made development lot easier.

-----------------------------------------------

Limitations/Future Enhancements


1. Instead of showing all vednors while selection, just show relevant field vendors
2. Inbound mail reply from vendor and direct parsing of content/attachments

------------------------------

Errors might occur

1. Groq model might reach out of limit .(replace with any other lighter model in place of wherever I have used model: llama-3.1-8b-instant)
