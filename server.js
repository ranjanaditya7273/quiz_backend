const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
require('dotenv').config();

// यहाँ सुनिश्चित करें कि आपने दोनों मॉडल एक ही फाइल से इंपोर्ट किए हैं
const { Quiz, Book } = require('./Model/QuizSchema'); 

const app = express();

app.use(cors());
// app.use(cors({ origin: ['http://localhost:3000', 'https://quiz-backend-98qe.onrender.com']}))
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } 
});

const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ Error: MONGO_URI is not defined");
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.log("❌ Connection Error:", err));

/**
 * @route   POST /api/quizzes/admin-fetch
 * @desc    Manual Sort to bypass MongoDB 32MB Memory Limit (With Book Data)
 */
app.post('/api/quizzes/admin-fetch', async (req, res) => {
  const { email, password } = req.body;

  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email === adminEmail && password === adminPassword) {
      
      // Aggregation Pipeline का उपयोग करके डेटा को Group करना
      const formattedData = await Book.aggregate([
        {
          // 1. Book को Quiz के साथ जोड़ें (Left Join)
          $lookup: {
            from: "quizzes", // MongoDB में कलेक्शन का नाम आमतौर पर lowercase plural होता है
            localField: "_id",
            foreignField: "book",
            as: "allQuizzes"
          }
        },
        {
          // 2. हर बुक के क्विज़ को कैटेगरी के आधार पर ग्रुप करें
          $project: {
            bookName: 1,
            author: 1,
            categories: {
              $map: {
                // पहले सभी यूनिक कैटेगरीज निकालें
                input: { $setUnion: ["$allQuizzes.category"] },
                as: "catName",
                in: {
                  categoryName: "$$catName",
                  // उस कैटेगरी से जुड़े सारे सवाल फिल्टर करें
                  questions: {
                    $filter: {
                      input: "$allQuizzes",
                      as: "q",
                      cond: { $eq: ["$$q.category", "$$catName"] }
                    }
                  }
                }
              }
            }
          }
        },
        { $sort: { bookName: 1 } } // बुक के नाम से सॉर्ट करें
      ]);

      return res.status(200).json({
        success: true,
        message: "Data retrieved using Aggregation",
        count: formattedData.length,
        data: formattedData
      });

    } else {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid Email or Password" 
      });
    }
  } catch (err) {
    console.error("Aggregation Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Data fetch karne mein galti hui", 
      details: err.message 
    });
  }
});

/**
 * @route   POST /api/quizzes/upload-raw
 * @desc    Upload quiz with book name (Automatically finds or creates the book)
 */
app.post('/api/quizzes/upload-raw', upload.single('quizFile'), async (req, res) => {
  try {
    const { testName, category, description, totalQuestions, bookName } = req.body;

    // 1. Validation Check
    if (!req.file) {
      return res.status(400).json({ success: false, error: "Please upload a .txt file" });
    }
    if (!bookName) {
      return res.status(400).json({ success: false, error: "Book Name is required" });
    }

    // 2. Book findOrCreate logic
    let book = await Book.findOne({ bookName: bookName.trim() });
    if (!book) {
      book = await Book.create({ bookName: bookName.trim() });
      console.log(`✅ New book created: ${bookName}`);
    }

    // 3. Quiz Save logic
    const rawText = req.file.buffer.toString('utf-8');

    const newQuiz = new Quiz({
      book: book._id, // Foreign Key Reference
      testName,
      category,
      description,
      fileContent: rawText, 
      totalQuestions: totalQuestions || 0 
    });

    const savedQuiz = await newQuiz.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Quiz saved successfully with Book reference!",
      quizId: savedQuiz._id,
      bookId: book._id 
    });

  } catch (err) {
    console.error("Upload Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send("Backend Server is Running (Manual Sort & Book Schema Linked)");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});