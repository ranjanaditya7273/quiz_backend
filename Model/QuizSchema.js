const mongoose = require('mongoose');

// 1. Book Schema (Parent Schema)
const bookSchema = new mongoose.Schema({
  bookName: { 
    type: String, 
    required: true, 
    trim: true 
  },
  author: { 
    type: String, 
    default: "" 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// 2. Quiz Schema (Child Schema - Linked with Book via Foreign Key)
const quizSchema = new mongoose.Schema({
  book: {
    type: mongoose.Schema.Types.ObjectId, // Foreign Key
    ref: 'Book', // Book Model से कनेक्शन
    required: true
  },
  testName: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true, 
    index: true 
  },
  description: { 
    type: String, 
    default: "" 
  },
  fileContent: { 
    type: String, 
    required: true 
  },
  totalQuestions: { 
    type: Number 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// मॉडल एक्सपोर्ट करना
const Book = mongoose.model('Book', bookSchema);
const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = { Book, Quiz };