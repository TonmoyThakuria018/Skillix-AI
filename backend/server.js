import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, param, validationResult } from 'express-validator';
import morgan from 'morgan';
import fs from 'fs';

dotenv.config();

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(helmet());

if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
            return res.redirect(`https://${req.get('Host')}${req.url}`);
        }
        next();
    });
}

app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms'));

// Custom alert logger
const logAbuse = (req, message) => {
    console.warn(`[SECURITY ALERT] ${message} | IP: ${req.ip} | URL: ${req.originalUrl}`);
};

const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logAbuse(req, 'Payload Validation Failure (Possible Malformed Request)');
        return res.status(400).json({ error: "Validation failed.", details: errors.array() });
    }
    next();
};

const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, 
    max: 100, 
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logAbuse(req, 'API Global Rate Limit Breached');
        res.status(429).json({ error: "Too many requests, please try again later." });
    }
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 50, // Relaxed for testing
    handler: (req, res) => {
        logAbuse(req, 'Login Brute-Force Attempt Prevented');
        res.status(429).json({ error: "Too many login attempts from this IP, please try again after 15 minutes." });
    }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 30, 
    handler: (req, res) => {
        logAbuse(req, 'Suspicious Account Generation Exceeded');
        res.status(429).json({ error: "Too many accounts created from this IP, please try again after an hour." });
    }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 50, // Relaxed for testing
    handler: (req, res) => {
        logAbuse(req, 'AI Generation Quota Maxed Out');
        res.status(429).json({ error: "AI generation quota exceeded for your IP. Please try again after an hour." });
    }
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    handler: (req, res) => {
        logAbuse(req, 'General Auth Endpoint Flooded');
        res.status(429).json({ error: "Too many requests from this IP, please try again after 15 minutes." });
    }
});

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
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String },
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

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("CRITICAL FATAL ERROR: JWT_SECRET is not defined in environment variables.");
    process.exit(1);
}

const requireAuth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ error: "Access denied. No token provided." });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(400).json({ error: "Invalid token." });
    }
};

const resend = new Resend(process.env.RESEND_API_KEY);

// Verify Resend configuration at startup (basic check)
if (!process.env.RESEND_API_KEY) {
    console.warn("⚠️  WARNING: RESEND_API_KEY is missing. Emails will not send.");
} else {
    console.log("📨 Resend Email Service initialized");
}

app.post('/api/auth/register', registerLimiter, 
    body('name').trim().notEmpty().withMessage('Name is required').escape(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    validateRequest,
    async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ error: "Email already in use." });
        
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const verificationToken = crypto.randomInt(100000, 1000000).toString();
        const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
        
        const newUser = new User({ 
            name, 
            email, 
            password: hashedPassword,
            verificationToken: verificationTokenHash
        });
        await newUser.save();

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Skillix AI <onboarding@resend.dev>',
                to: email,
                subject: 'Skillix Account Verification Code',
                html: `<strong>Your Skillix Account Verification Code is:</strong> <p style="font-size: 24px; font-weight: bold;">${verificationToken}</p>`
            });
        }

        res.json({ message: "Registration successful. Please check your email for the verification token." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify-email', authLimiter, 
    body('email').isEmail().normalizeEmail(),
    body('verificationToken').isString().isLength({ min: 6, max: 6 }).isNumeric().withMessage("Invalid code format"),
    validateRequest,
    async (req, res) => {
    try {
        const { email, verificationToken } = req.body;
        if (!email || !verificationToken) return res.status(400).json({ error: "Email and token required." });

        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const user = await User.findOne({ email, verificationToken: hashedToken });
        
        if (!user) return res.status(400).json({ error: "Invalid or already used verification token." });
        
        user.isVerified = true;
        user.verificationToken = undefined;
        await user.save();
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ message: "Email verified successfully.", token, user: { name: user.name, email: user.email } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/resend-verification', authLimiter, 
    body('email').isEmail().normalizeEmail(),
    validateRequest,
    async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ error: "User not found." });
        
        if (user.isVerified) return res.status(400).json({ error: "Account already verified." });
        
        const verificationToken = crypto.randomInt(100000, 1000000).toString();
        const verificationTokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
        
        user.verificationToken = verificationTokenHash;
        await user.save();

        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Skillix AI <onboarding@resend.dev>',
                to: email,
                subject: 'Skillix Account Verification Code',
                html: `<strong>Your Skillix Account Verification Code is:</strong> <p style="font-size: 24px; font-weight: bold;">${verificationToken}</p>`
            });
        }

        res.json({ message: "Verification code resent. Please check your email." });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', loginLimiter, 
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage("Password is required"),
    validateRequest,
    async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: "Invalid credentials." });
        
        if (!user.isVerified) return res.status(403).json({ error: "Account not verified. Please check your email for the verification token." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });
        
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ token, user: { name: user.name, email: user.email } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 3. SECURE FORGOT PASSWORD (Email Convo)
// ==========================================
app.post('/api/auth/forgot-password', authLimiter, 
    body('email').isEmail().normalizeEmail(),
    validateRequest,
    async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        // Use a generic message even if user not found for security, 
        // but here we keep the 404 for debugging as per original logic if needed.
        if (!user) return res.status(404).json({ error: "User not found with this email." });
        
        const resetToken = crypto.randomInt(100000, 1000000).toString();
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        user.resetToken = hashedResetToken;
        user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
        await user.save();
        
        if (process.env.RESEND_API_KEY) {
            await resend.emails.send({
                from: 'Skillix AI <onboarding@resend.dev>',
                to: email,
                subject: 'Skillix Password Recovery Code',
                html: `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2 style="color: #0ea5e9;">Skillix AI - Password Reset</h2>
                        <p>You requested a password reset. Use the following 6-digit code to proceed:</p>
                        <div style="font-size: 24px; font-weight: bold; background: #f1f5f9; padding: 10px; text-align: center; border-radius: 5px;">
                            ${resetToken}
                        </div>
                        <p>This code expires in 15 minutes.</p>
                        <p style="font-size: 12px; color: #64748b;">If you did not request this, please ignore this email.</p>
                    </div>
                `
            });
        }
        res.json({ message: "Recovery code sent to your email!" });
    } catch (err) { 
        console.error("Forgot Password critical failure:", err);
        res.status(500).json({ error: "Failed to send reset email. Contact support.", detail: err.message }); 
    }
});

app.post('/api/auth/reset-password', authLimiter, 
    body('email').isEmail().normalizeEmail(),
    body('resetToken').isString().isLength({ min: 6, max: 6 }).isNumeric(),
    body('newPassword').isLength({ min: 6 }),
    validateRequest,
    async (req, res) => {
    try {
        const { email, resetToken, newPassword } = req.body;
        const hashedResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        const user = await User.findOne({ 
            email, 
            resetToken: hashedResetToken, 
            resetTokenExpiry: { $gt: Date.now() } 
        });
        
        if (!user) return res.status(400).json({ error: "Invalid or expired reset token." });
        
        const salt = await bcrypt.genSalt(12);
        user.password = await bcrypt.hash(newPassword, salt);
        user.isVerified = true; // Automatically verify if they reset via email
        user.resetToken = undefined;
        user.resetTokenExpiry = undefined;
        await user.save();
        
        res.json({ message: "Password reset successfully!" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 4. AI & ROADMAPS
// ==========================================
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error("Unsafe or invalid file type. Only PDFs are permitted."), false);
        }
    }
});
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const roleKeywordMap = {
    'Full Stack Developer': ['full stack', 'javascript', 'html', 'css', 'react', 'node', 'database', 'api'],
    'Frontend Engineer': ['frontend', 'react', 'vue', 'angular', 'css', 'html', 'javascript', 'ui'],
    'Backend Developer': ['backend', 'node', 'express', 'api', 'database', 'sql', 'java', 'python'],
    'Data Scientist': ['data', 'python', 'machine learning', 'statistics', 'pandas', 'numpy', 'analysis'],
    'AI Prompt Engineer': ['prompt', 'ai', 'gpt', 'llm', 'natural language', 'generation'],
    'DevOps Engineer': ['devops', 'docker', 'kubernetes', 'ci/cd', 'aws', 'azure', 'infrastructure'],
    'Product Manager': ['product', 'roadmap', 'user research', 'stakeholder', 'strategy', 'metrics'],
    'UI/UX Designer': ['ui', 'ux', 'design', 'wireframe', 'prototyping', 'user research', 'figma'],
    'Cloud Architect': ['cloud', 'aws', 'azure', 'gcp', 'architecture', 'infrastructure', 'scalability'],
    'Cyber Security Analyst': ['security', 'cyber', 'risk', 'penetration testing', 'compliance', 'firewall']
};

const computeATSScore = (resumeText, role, verifiedSkills = [], missingSkills = []) => {
    const normalized = resumeText.toLowerCase();
    const roleKeywords = roleKeywordMap[role] || role.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const matchedRoleKeywords = roleKeywords.reduce((count, keyword) => count + (normalized.includes(keyword) ? 1 : 0), 0);
    const roleMatchRatio = roleKeywords.length ? matchedRoleKeywords / roleKeywords.length : 0;

    const verifiedCount = Array.isArray(verifiedSkills) ? verifiedSkills.length : 0;
    const missingCount = Array.isArray(missingSkills) ? missingSkills.length : 0;
    const skillMatchRatio = verifiedCount + missingCount > 0 ? verifiedCount / (verifiedCount + missingCount) : 0;

    const lengthFactor = Math.min(1, resumeText.length / 5000);
    const rawScore = Math.round((roleMatchRatio * 0.35 + skillMatchRatio * 0.55 + lengthFactor * 0.10) * 100);
    return Math.max(10, Math.min(100, rawScore));
};

const uploadHandler = (req, res, next) => {
    upload.single('resume')(req, res, (err) => {
        if (err) return res.status(400).json({ error: err.message });
        next();
    });
};

app.post('/api/analyze', aiLimiter, uploadHandler, 
    body('role').trim().notEmpty().escape(),
    body('timeline').trim().notEmpty().escape(),
    validateRequest,
    async (req, res) => {
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

        const verifiedSkills = Array.isArray(analysisData.verifiedSkills) ? analysisData.verifiedSkills : [];
        const missingSkills = Array.isArray(analysisData.missingSkills) ? analysisData.missingSkills : [];
        const atsScore = computeATSScore(resumeText, role, verifiedSkills, missingSkills);
        analysisData.atsScore = atsScore;

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

app.get('/api/auth/profile', requireAuth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: "User not found." });
        res.json(user);
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});

app.get('/api/roadmaps/me', requireAuth, async (req, res) => {
    try {
        const rms = await Roadmap.find({ userId: req.user.id }).sort('-createdAt');
        res.json(rms);
    } catch (err) { res.status(500).json({ error: "Server error." }); }
});

app.patch('/api/roadmaps/:id/tasks', requireAuth, 
    param('id').isMongoId().withMessage('Invalid roadmap ID'),
    body('checkedTasks').isObject().withMessage('checkedTasks must be an object'),
    validateRequest,
    async (req, res) => {
    try {
        const { checkedTasks } = req.body;
        const roadmap = await Roadmap.findOne({ _id: req.params.id, userId: req.user.id });
        
        if (!roadmap) return res.status(404).json({ error: "Roadmap not found or unauthorized access." });
        
        roadmap.checkedTasks = checkedTasks;
        await roadmap.save();
        res.json({ message: "Cloud Synced!" });
    } catch (err) { res.status(500).json({ error: "Sync failed." }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Port ${PORT}`));

app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);
    try {
        fs.appendFileSync('express_error.txt', `[${new Date().toISOString()}] ${err.stack}\n`);
    } catch (fsErr) {
        // Ignore file system errors in read-only environments
    }
    
    if (!res.headersSent) {
        res.status(500).json({
            error: "Server encountered an error", 
            msg: process.env.NODE_ENV === 'production' ? "Internal server error" : err.message
        });
    } else {
        next(err);
    }
});
