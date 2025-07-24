const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rating: { type: Number, default: 1500 },
  matchHistory: [
    {
      opponent: String,
      result: String, // "win", "loss", "draw"
      mode: String,   // "1v1" or "3v3"
      date: Date
    }
  ]
});

module.exports = mongoose.model("User", userSchema);
