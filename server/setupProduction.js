/**
 * Production Setup Script
 * Run: node server/setupProduction.js
 * - Updates ABC user to Dr. Abhishek Dixit
 * - Creates CST club if not exists
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Club = require('./models/Club')

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB Atlas')

  // 1. Update/Create ABC user — Dr. Abhishek Dixit
  let abcUser = await User.findOne({ email: 'abhishekdixit@mitsgwalior.in' })
  if (abcUser) {
    abcUser.name = 'Dr. Abhishek Dixit'
    abcUser.role = 'abc'
    abcUser.isActive = true
    await abcUser.save()
    console.log('✅ ABC user updated:', abcUser.email)
  } else {
    const hashed = await bcrypt.hash('password123', 10)
    abcUser = await User.create({
      name: 'Dr. Abhishek Dixit',
      email: 'abhishekdixit@mitsgwalior.in',
      password: hashed,
      role: 'abc',
      isActive: true
    })
    console.log('✅ ABC user created:', abcUser.email)
  }

  // 2. Deactivate old test ABC user
  const oldAbc = await User.findOne({ email: 'abc@test.com' })
  if (oldAbc) {
    oldAbc.isActive = false
    await oldAbc.save()
    console.log('✅ Old test ABC user deactivated:', oldAbc.email)
  }

  // 3. Create CST Club if not exists
  let cstClub = await Club.findOne({ name: { $regex: /cst/i } })
  if (!cstClub) {
    // Find a faculty to assign as coordinator
    const faculty = await User.findOne({ role: 'faculty', isActive: true })
    cstClub = await Club.create({
      name: 'CST Club',
      description: 'Computer Science & Technology Club',
      facultyCoordinatorId: faculty?._id,
      isActive: true
    })
    console.log('✅ CST Club created')
  } else {
    console.log('✅ CST Club already exists:', cstClub.name)
  }

  console.log('\n🎉 Production setup complete!')
  console.log('ABC Login: abhishekdixit@mitsgwalior.in (via Google)')
  await mongoose.disconnect()
}

setup().catch(err => {
  console.error('Setup failed:', err)
  process.exit(1)
})
