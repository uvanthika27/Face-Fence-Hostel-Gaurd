const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    registerNumber: {
      type: String,
      unique: true,
      sparse: true, // null for admin accounts
      trim: true,
      uppercase: true,
    },
    block: {
      type: String,
      trim: true,
      uppercase: true,
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false, // never return password by default
    },
    profilePhoto: {
      type: String, // relative path: uploads/profiles/<filename>
      default: null,
    },
    role: {
      type: String,
      enum: ['admin', 'student'],
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    // Array of face descriptors (each is 128 floats) — stored as Mixed
    // Multiple descriptors = robust matching across angles and lighting
    faceDescriptors: {
      type: mongoose.Schema.Types.Mixed, // array of arrays
      default: null,
    },
    faceRegistered: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare plain password with hashed
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
