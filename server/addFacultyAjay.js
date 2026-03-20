/**
 * Add Faculty Ajay Meena and link to CST Club
 * Run: node server/addFacultyAjay.js
 */
require('dotenv').config()
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const User = require('./models/User')
const Club = require('./models/Club')

async function run() {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB Atlas')

  // 1. Find or create Ajay Meena
  let ajay = await User.findOne({ email: '25tc1aj7@mitsgwl.ac.in' })
  if (ajay) {
    console.log('✅ Ajay Meena already exists:', ajay.name, '| role:', ajay.role, '| active:', ajay.isActive)
    // Make sure he's active and faculty
    ajay.isActive = true
    ajay.role = 'faculty'
    if (!ajay.department) ajay.department = 'Computer Science & Technology'
    await ajay.save()
    console.log('✅ Updated Ajay Meena to active faculty')
  } else {
    const hashed = await bcrypt.hash('password123', 10)
    ajay = await User.create({
      name: 'Ajay Meena',
      email: '25tc1aj7@mitsgwl.ac.in',
      password: hashed,
      role: 'faculty',
      department: 'Computer Science & Technology',
      isActive: true
    })
    console.log('✅ Created Ajay Meena as faculty')
  }

  // 2. Find CST Club
  let cstClub = await Club.findOne({ name: { $regex: /cst/i } })
  if (!cstClub) {
    cstClub = await Club.create({
      name: 'CST Club',
      description: 'Computer Science & Technology Club',
      isActive: true,
      createdBy: ajay._id
    })
    console.log('✅ CST Club created')
  } else {
    console.log('✅ CST Club found:', cstClub.name)
  }

  // 3. Link Ajay to CST Club
  ajay.clubId = cstClub._id
  await ajay.save()
  console.log('✅ Ajay Meena linked to CST Club')

  // 4. Add Ajay as coordinator in club if not already
  const alreadyCoord = cstClub.coordinators?.some(c => c.email === ajay.email)
  if (!alreadyCoord) {
    cstClub.coordinators = cstClub.coordinators || []
    cstClub.coordinators.push({
      name: ajay.name,
      email: ajay.email,
      mobile: '0000000000'
    })
    await cstClub.save()
    console.log('✅ Ajay added as CST Club coordinator')
  } else {
    console.log('✅ Ajay already a coordinator')
  }

  // 5. Show all faculty
  const allFaculty = await User.find({ role: 'faculty' }, 'name email isActive clubId')
  console.log('\n--- All Faculty ---')
  allFaculty.forEach(f => console.log(`${f.name} | ${f.email} | active: ${f.isActive} | clubId: ${f.clubId}`))

  // 6. Show ABC user
  const abc = await User.findOne({ email: 'abhishekdixit@mitsgwalior.in' })
  console.log('\n--- ABC User ---')
  console.log(abc ? `${abc.name} | ${abc.email} | role: ${abc.role} | active: ${abc.isActive}` : 'NOT FOUND')

  await mongoose.disconnect()
  console.log('\n🎉 Done!')
}

run().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
