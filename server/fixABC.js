require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixABC() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Show all abc users
  const abcUsers = await User.find({ role: 'abc' });
  console.log('All ABC users:');
  abcUsers.forEach(u => console.log(`  id: ${u._id} | email: ${u.email} | isActive: ${u.isActive}`));

  // Fix: update the abc@test.com user — set real email and activate
  const result = await User.findOneAndUpdate(
    { role: 'abc', email: 'abc@test.com' },
    { email: 'abhishekdixit@mitsgwalior.in', isActive: true },
    { new: true }
  );

  if (result) {
    console.log('\n✅ Updated ABC user:', result.email, '| isActive:', result.isActive);
  } else {
    // Maybe email is already set, just activate
    const activated = await User.findOneAndUpdate(
      { role: 'abc' },
      { isActive: true },
      { new: true }
    );
    if (activated) {
      console.log('\n✅ Activated ABC user:', activated.email);
    } else {
      console.log('\n❌ No ABC user found at all');
    }
  }

  await mongoose.disconnect();
}

fixABC().catch(console.error);
