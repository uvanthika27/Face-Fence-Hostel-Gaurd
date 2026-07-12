require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

const seed = async () => {
  await connectDB();

  const exists = await User.findOne({ username: 'admin' });
  if (exists) {
    console.log('Admin account already exists. Skipping seed.');
    process.exit(0);
  }

  await User.create({
    fullName: 'Hostel Warden',
    username: 'admin',
    password: 'Admin@123',
    role: 'admin',
    mustChangePassword: false,
    isActive: true,
  });

  console.log('✅ Admin account created.');
  console.log('   Username : admin');
  console.log('   Password : Admin@123');
  console.log('   ⚠️  Change this password immediately after first login!');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });
