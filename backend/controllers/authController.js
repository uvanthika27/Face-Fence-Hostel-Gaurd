const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

// POST /api/auth/login
const login = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ success: false, message: 'Username and password are required' });

  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ success: false, message: 'Invalid credentials' });

  if (!user.isActive)
    return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });

  const token = signToken(user._id);
  const userData = { id: user._id, fullName: user.fullName, username: user.username, role: user.role, mustChangePassword: user.mustChangePassword, profilePhoto: user.profilePhoto, faceRegistered: user.faceRegistered };

  res.json({ success: true, token, user: userData });
};

// PUT /api/auth/change-password
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword)
    return res.status(400).json({ success: false, message: 'Both fields are required' });
  if (newPassword.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword)))
    return res.status(401).json({ success: false, message: 'Current password is incorrect' });

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully' });
};

// GET /api/auth/me
const getMe = async (req, res) => {
  // The 'protect' middleware already attached the user to req.user
  // and excluded the password. No need to re-fetch from DB.
  res.json({ 
    success: true, 
    user: req.user 
  });
};

// POST /api/auth/save-face-descriptor
const saveFaceDescriptor = async (req, res) => {
  const { descriptors } = req.body; // Expecting an array of 10-20 descriptors

  if (!descriptors || !Array.isArray(descriptors) || descriptors.length === 0)
    return res.status(400).json({ success: false, message: 'Face descriptors are required' });

  // Validate each descriptor in the array
  const isValid = descriptors.every(d => 
    Array.isArray(d) && d.length === 128 && d.every(v => typeof v === 'number' && isFinite(v))
  );

  if (!isValid)
    return res.status(400).json({ success: false, message: 'One or more descriptors are invalid or corrupt.' });

  // Use $set with markModified so Mongoose saves the Mixed field
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { faceDescriptors: descriptors, faceRegistered: true } },
    { new: true }
  );

  res.json({ success: true, message: 'Face registered successfully' });
};

// POST /api/auth/reset-face
const resetFaceDescriptor = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    $set: { faceDescriptors: [], faceRegistered: false },
  });
  res.json({ success: true, message: 'Face registration cleared' });
};

module.exports = { login, changePassword, getMe, saveFaceDescriptor, resetFaceDescriptor };
