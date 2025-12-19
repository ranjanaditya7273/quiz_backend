const mongoose = require('mongoose'); 

const quizSchema = new mongoose.Schema({
  testName: { type: String, required: true },
  category: { type: String, required: true, index: true },
  description: { type: String, default: "" },
  fileContent: { type: String, required: true },
  totalQuestions: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Quiz', quizSchema);