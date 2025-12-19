const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

const Quiz = require('./Model/QuizSchema'); 

const app = express();

app.use(cors());
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

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.log("❌ Connection Error:", err));


/**
 * @route   POST /api/quizzes/admin-fetch
 * @desc    Verify admin credentials and return all quiz data
 */
app.post('/api/quizzes/admin-fetch', async (req, res) => {
  const { email, password } = req.body;

  try {

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (email == adminEmail && password == adminPassword) {
      
      const allQuizzes = await Quiz.find().sort({ createdAt: -1 });
      
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
    res.status(500).json({ 
      success: false, 
      error: "Data fetch karne mein galti hui", 
      details: err.message 
    });
  }
});

/**
 * @route   POST /api/quizzes/upload-raw
 * @desc    Direct .txt file ka poora text database mein save karna (No Parsing)
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


// /**
//  * @route   GET /api/quizzes/all
//  * @desc    Database mein maujood saare quizzes fetch karna
//  */
// app.get('/api/quizzes/all', async (req, res) => {
//   try {
//     const allQuizzes = await Quiz.find().sort({ createdAt: -1 });
    
//     res.status(200).json({
//       success: true,
//       count: allQuizzes.length,
//       data: allQuizzes
//     });
//   } catch (err) {
//     res.status(500).json({ 
//       success: false, 
//       error: "Data fetch karne mein galti hui", 
//       details: err.message 
//     });
//   }
// });


app.get('/', (req, res) => {
  res.send("Backend Server is Running Successfully!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});