To run code

1. Clone repository
2. mkdir backend
cd backend
npm init -y
npm install express cors mongoose dotenv
npm install openai
npm install nodemailer imap-simple
npm install multer
npm install pdf-parse
npm create vite@latest frontend --template react
npm install axios

cd frontend
npm install
npm run dev
npm install groq-sdk  ( Install dependencies: `npm install` (both folders, frontend and backend) )
4. Configure environment variables (.env files)
5. Run MailHog: `MailHog.exe`
6. Start backend: `node server.js`
7. Start frontend: `npm start`

To run MailHog server: http://localhost:8025


Please find .env file

PORT=5000
MONGO_URI=mongodb+srv://rajesh:Raju361@rajcluster.rwcfkjm.mongodb.net/?appName=RajCluster
GROQ_API_KEY=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
EMAIL_HOST=localhost
EMAIL_PORT=1025
EMAIL_FROM=procurement@yourcompany.com
COMPANY_NAME="AI RFP System"
