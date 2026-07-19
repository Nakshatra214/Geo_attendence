// Quick script to make a user an admin
const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  let user = await User.findOne({ email: 'admin@company.com' });
  
  if (!user) {
    console.log('Admin user not found. Creating one...');
    user = await User.create({
      name: 'Admin',
      email: 'admin@company.com',
      password: 'Admin@123',
      role: 'admin',
      department: 'Administration',
      employeeId: 'ADM001'
    });
    console.log('✅ Admin user created successfully.');
  } else {
    if (user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
      console.log('✅ User role updated to admin.');
    } else {
      console.log('ℹ️ Admin user already exists with role admin.');
    }
  }
  
  console.log('Admin details:', {
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId
  });
  
  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  process.exit(1);
});
