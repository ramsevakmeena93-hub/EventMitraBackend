require('dotenv').config()
const mongoose = require('mongoose')
const User = require('./models/User')
const Club = require('./models/Club')

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  // Check specific faculty
  const faculty = await User.findOne({ email: '25tc1aj7@mitsgwl.ac.in' })
  console.log('\n--- Faculty 25tc1aj7@mitsgwl.ac.in ---')
  console.log(faculty ? `Name: ${faculty.name}, Role: ${faculty.role}, Active: ${faculty.isActive}` : 'NOT FOUND IN DATABASE')

  // Check CST club
  const cst = await Club.findOne({ name: /cst/i })
  console.log('\n--- CST Club ---')
  console.log(cst ? `Name: ${cst.name}, Coordinators: ${JSON.stringify(cst.coordinators)}` : 'NOT FOUND')

  // All faculty
  const allFaculty = await User.find({ role: 'faculty' }, 'name email isActive')
  console.log('\n--- All Faculty ---')
  allFaculty.forEach(f => console.log(`${f.name} | ${f.email} | active: ${f.isActive}`))

  await mongoose.disconnect()
  process.exit(0)
})
