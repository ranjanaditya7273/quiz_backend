const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const Quiz = require('./Model/QuizSchema'); 

const app = express();

// --- Middleware Configuration ---
app.use(cors());
// 50mb limit for large quiz files
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ Error: MONGO_URI is not defined in .env file");
  process.exit(1);
}

// --- MongoDB Connection with Indexing Options ---
mongoose.connect(mongoURI)
  .then(() => {
    console.log("✅ MongoDB Connected!");
    // Forcefully create index to prevent memory sort issues (FREE solution)
    Quiz.createIndexes({ createdAt: -1 }).catch(err => console.log("Index Error:", err));
  })
  .catch(err => console.log("❌ Connection Error:", err));


/**
 * @route   POST /api/quizzes/admin-fetch
 * @desc    Verify admin credentials and return all quiz data (Fixed Sort Error)
 */
app.post('/api/quizzes/admin-fetch', async (req, res) => {
  const { email, password } = req.body;

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    // Use double equals for safety as per your original code
    if (email == adminEmail && password == adminPassword) {
      
      /** * SOLUTION FOR 32MB LIMIT: 
       * .allowDiskUse(true) allows MongoDB to use temporary files for sorting
       * if the result exceeds the 32MB RAM limit.
       */
      const allQuizzes = await Quiz.find({})
        .sort({ createdAt: -1 })
        .allowDiskUse(true); // <--- This fixes the 33554432 bytes error
      
      return res.status(200).json({
        success: true,
        message: "Authentication successful",
        count: allQuizzes.length,
        data: allQuizzes
      });

    } else {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid Email or Password" 
      });
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Data fetch karne mein galti hui", 
      details: err.message 
    });
  }
});

/**
 * @route   POST /api/quizzes/upload-raw
 * @desc    Save raw .txt content to DB
 */
app.post('/api/quizzes/upload-raw', upload.single('quizFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a .txt file" });
    }

    const rawText = req.file.buffer.toString('utf-8');

    const newQuiz = new Quiz({
      testName: req.body.testName,
      category: req.body.category,
      description: req.body.description,
      fileContent: rawText, 
      totalQuestions: req.body.totalQuestions || 0 
    });

    const savedQuiz = await newQuiz.save();
    res.status(201).json({ 
      success: true, 
      message: "Raw file content saved successfully!",
      id: savedQuiz._id 
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Root Route
app.get('/', (req, res) => {
  res.send("Backend Server is Running Successfully with Disk Sorting Enabled!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});