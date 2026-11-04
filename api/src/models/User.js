const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true, // unique index theo yeu cau de bai
      maxlength: 254,
    },
    // Mat khau da bam (bcrypt). select:false de khong vo tinh lay ra khi truy van.
    passwordHash: { type: String, required: true, select: false },
    avatarUrl: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
