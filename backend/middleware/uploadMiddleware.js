const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (folder) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(__dirname, '..', 'uploads', folder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
  });

const imageFilter = (req, file, cb) => {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only image files are allowed'), false);
};

const csvFilter = (req, file, cb) => {
  const allowed = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('Only CSV/Excel files are allowed'), false);
};

const uploadProfile = multer({ storage: createStorage('profiles'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadSelfie = multer({ storage: createStorage('selfies'), fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadCSV = multer({ storage: createStorage('csv'), fileFilter: csvFilter, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = { uploadProfile, uploadSelfie, uploadCSV };
