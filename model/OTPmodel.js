const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: { type: String, required: true },
  otp: { type: String, required: true },
  fullName: { type: String, required: true },
  password: { type: String, required: true },
  mobile: { type: String, required: true },
  expiry: { type: Date, required: true },
});

module.exports = mongoose.model('OTP', otpSchema);
