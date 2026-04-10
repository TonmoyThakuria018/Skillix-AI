# Skillix AI - Personalized Learning Roadmap Generator

Skillix AI is a full-stack web application designed to help students and self-learners navigate the overwhelming world of information. Most learners get stuck wondering *where* to start; Skillix AI solves this by generating structured, step-by-step learning paths in seconds using AI.

[![Skillix Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://skillix-ai.vercel.app)

---

## 🚀 Key Features

- **Resume-to-Roadmap Scan:** Analyzes uploaded resumes to identify skill gaps and generate custom career-ready learning paths.
- **AI Roadmap Generation:** Leverages Google's Gemini AI to create detailed, hierarchical learning paths for any topic.
- **Instant Access:** Includes a **Guest Login** feature for recruiters and guests to try the app instantly.
- **Secure Authentication:** Robust user accounts with email verification and password recovery.
- **PDF Export:** Allows users to download and save their personalized roadmaps for offline study.
- **Responsive UI:** Built with Material UI for a polished, mobile-friendly experience.

---

## 🛠️ The Tech Stack

- **Frontend:** React.js (Vite), Material UI, Framer Motion
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (Atlas)
- **AI Integration:** Google Gemini Pro API
- **Deployment:** Frontend on **Vercel**, Backend on **Render**

---

## 👨‍💻 Developed By

This project was built as a collaborative effort to solve a real learning problem.

- **Krinjal Kashyap** ([@Kkashyap777](https://github.com/Kkashyap777))
- **Tonmoy Thakuria** ([@TonmoyThakuria018](https://github.com/TonmoyThakuria018))

---

## ⚙️ Quick Local Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/Kkashyap777/Skillix-AI.git
   ```

2. **Backend Config:**
   Create a `.env` in the `backend/` folder:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   GEMINI_API_KEY=your_key
   JWT_SECRET=your_secret
   ```

3. **Install & Run:**
   - Backend: `cd backend && npm install && npm start`
   - Frontend: `cd frontend && npm install && npm run dev`

---

*Made with ❤️ for the student community.*
