import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// 1. DATABASE & MODELS
// ==========================================
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("🔥 Connected!"))
    .catch(err => console.log("❌ DB Error:", err.message));

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

const roadmapSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetRole: { type: String, required: true },
    timeline: { type: String, required: true },
    analysisData: { type: Object, required: true },
    checkedTasks: { type: Object, default: {} }
}, { timestamps: true });
const Roadmap = mongoose.model('Roadmap', roadmapSchema);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ==========================================
// 2. AUTHENTICATION (Register & Login)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: "Used email." });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ name, email, password: hashedPassword });
        await newUser.save();
        const token = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { name: newUser.name, email: newUser.email } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials." });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. SECURE FORGOT PASSWORD (Email Convo)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "Not found." });
        const token = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 600000; // 10 mins
        await user.save();
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Skillix Password Recovery',
            text: `Your reset code: ${token}`
        });
        res.json({ message: "Code sent." });
    } catch (err) { 
        console.error("Email Error:", err);
        res.status(500).json({ error: "Email error." }); 
    }
});

app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        const user = await User.findOne({ email, resetToken, resetTokenExpiry: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ error: "Invalid/Expired." });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
        res.json({ message: "Success!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. AI & ROADMAPS
// ==========================================
const upload = multer({ storage: multer.memoryStorage() });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/analyze', upload.single('resume'), async (req, res) => {
    try {
        const { role, timeline } = req.body;
        if (!req.file) return res.status(400).json({ error: 'Resume file is required.' });

        const pdfParser = new PDFParse({ data: req.file.buffer });
        const resumeResult = await pdfParser.getText();
        const resumeText = resumeResult.text.replace(/\s+/g, ' ').trim().slice(0, 16000);

        const prompt = `You are a professional career analyst. Use the resume text below to identify the verified skills present in the resume, then determine what skills are missing for the selected target role. Finally, based on the selected timeline, generate a roadmap with phases and tasks that include YouTube resources for each task. Return only valid JSON with these fields:\n` +
            `atsScore: number, verifiedSkills: array of strings, missingSkills: array of strings, roadmap: [{ phase: string, tasks: [string], youtubeResources: [string] }]\n` +
            `Resume Text: """${resumeText}"""\n` +
            `Target Role: ${role}\nTimeline: ${timeline}`;

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        const text = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysisData = JSON.parse(text);

        // PERSISTENCE: Save to DB if token is present
        const token = req.header('x-auth-token');
        if (token) {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                const roadmap = new Roadmap({
                    userId: decoded.id,
                    targetRole: role,
                    timeline: timeline,
                    analysisData: analysisData
                });
                await roadmap.save();
            } catch (authErr) { console.log("Cloud sync skipped: No valid session."); }
        }

        res.json(analysisData);
    } catch (err) { 
        console.error("AI Analysis Critical Fault:", err.message);
        res.status(500).json({ error: `Analysis Failure: ${err.message}` }); 
    }
});

app.get('/api/auth/profile', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        if (!token) return res.status(401).json({ error: "No token." });
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        res.json(user);
    } catch (err) { res.status(401).json({ error: "Invalid token." }); }
});

app.get('/api/roadmaps/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token');
        const decoded = jwt.verify(token, JWT_SECRET);
        const rms = await Roadmap.find({ userId: decoded.id }).sort('-createdAt');
        res.json(rms);
    } catch (err) { res.status(500).json({ error: "Auth failed." }); }
});

app.patch('/api/roadmaps/:id/tasks', async (req, res) => {
    try {
        const { checkedTasks } = req.body;
        const roadmap = await Roadmap.findById(req.params.id);
        roadmap.checkedTasks = checkedTasks;
        await roadmap.save();
        res.json({ message: "Cloud Synced!" });
    } catch (err) { res.status(500).json({ error: "Sync failed." }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Port ${PORT}`));
