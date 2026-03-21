require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function fixABC() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  // Show all abc users before
  const abcUsers = await User.find({ role: 'abc' });
  console.log('ABC users found:', abcUsers.length);
  abcUsers.forEach(u => console.log(`  id: ${u._id} | email: ${u.email} | isActive: ${u.isActive}`));

  // Just update the email field on the existing ABC user (keep everything else)
  const result = await User.findOneAndUpdate(
    { role: 'abc' },
    { email: 'abhishekdixit@mitsgwalior.in', isActive: true },
    { new: true }
  );

  if (result) {
    console.log('\n✅ ABC user email updated to:', result.email, '| isActive:', result.isActive);
  } else {
    console.log('\n❌ No ABC user found');
  }

  await mongoose.disconnect();
}

fixABC().catch(console.error);
