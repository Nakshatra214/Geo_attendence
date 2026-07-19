const mongoose = require('mongoose');
const Location = require('./models/Location');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_system';

mongoose.connect(MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Find Pune Office HQ and update it
  const result = await Location.updateMany(
    { locationName: 'Pune Office HQ' },
    { 
      $set: { 
        locationName: 'Ahmedabad Ognaj Office',
        latitude: 23.0805,
        longitude: 72.5186,
        description: 'Main corporate headquarters block (Ahmedabad)'
      } 
    }
  );
  
  console.log(`Matched ${result.matchedCount} and modified ${result.modifiedCount} location(s).`);
  
  // If nothing was modified, let's make sure we have at least one Ahmedabad location
  if (result.matchedCount === 0) {
    const existing = await Location.findOne({ locationName: 'Ahmedabad Ognaj Office' });
    if (!existing) {
      await Location.create({
        locationName: 'Ahmedabad Ognaj Office',
        latitude: 23.0805,
        longitude: 72.5186,
        radius: 150,
        description: 'Main corporate headquarters block'
      });
      console.log('Created new Ahmedabad Ognaj Office geofence.');
    } else {
      console.log('Ahmedabad Ognaj Office already exists.');
    }
  }
  
  mongoose.disconnect();
}).catch(err => {
  console.error('Migration error:', err.message);
  process.exit(1);
});
