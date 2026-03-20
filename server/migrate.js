/**
 * Migration Script: Local MongoDB → MongoDB Atlas
 * Run with: node server/migrate.js
 */

require('dotenv').config()
const { MongoClient } = require('mongodb')

const LOCAL_URI = 'mongodb://localhost:27017/college-cms'
const ATLAS_URI = process.env.MONGODB_ATLAS_URI

if (!ATLAS_URI) {
  console.error('❌ MONGODB_ATLAS_URI not set in .env file')
  process.exit(1)
}

async function migrate() {
  let localClient, atlasClient

  try {
    // ── Step 1: Connect to both databases ──────────────────────────────
    console.log('\n🔌 Connecting to Local MongoDB...')
    localClient = new MongoClient(LOCAL_URI)
    await localClient.connect()
    console.log('✅ Local MongoDB connected')

    console.log('🔌 Connecting to MongoDB Atlas...')
    atlasClient = new MongoClient(ATLAS_URI)
    await atlasClient.connect()
    console.log('✅ MongoDB Atlas connected')

    const localDb = localClient.db('college-cms')
    const atlasDb = atlasClient.db('college-cms')

    // ── Step 2: Get all collections from local ─────────────────────────
    const collections = await localDb.listCollections().toArray()
    console.log(`\n📦 Found ${collections.length} collections: ${collections.map(c => c.name).join(', ')}`)

    if (collections.length === 0) {
      console.log('⚠️  No collections found in local database. Nothing to migrate.')
      return
    }

    // ── Step 3: Migrate each collection ───────────────────────────────
    let totalMigrated = 0

    for (const col of collections) {
      const name = col.name

      // Skip system collections
      if (name.startsWith('system.')) continue

      console.log(`\n📂 Migrating collection: ${name}`)

      const localCol = localDb.collection(name)
      const atlasCol = atlasDb.collection(name)

      // Fetch all documents from local
      const docs = await localCol.find({}).toArray()
      console.log(`   📄 Found ${docs.length} documents`)

      if (docs.length === 0) {
        console.log(`   ⏭️  Skipping empty collection`)
        continue
      }

      // Delete existing data in Atlas for this collection
      const deleteResult = await atlasCol.deleteMany({})
      console.log(`   🗑️  Deleted ${deleteResult.deletedCount} existing documents from Atlas`)

      // Insert all documents into Atlas
      const insertResult = await atlasCol.insertMany(docs, { ordered: false })
      console.log(`   ✅ Inserted ${insertResult.insertedCount} documents into Atlas`)

      totalMigrated += insertResult.insertedCount
    }

    // ── Step 4: Summary ───────────────────────────────────────────────
    console.log('\n' + '='.repeat(50))
    console.log(`🎉 Migration Complete!`)
    console.log(`   Collections migrated: ${collections.length}`)
    console.log(`   Total documents migrated: ${totalMigrated}`)
    console.log('='.repeat(50) + '\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('   → Local MongoDB is not running. Start it with: mongod')
    }
    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('   → Atlas password is wrong. Check MONGODB_ATLAS_URI in .env')
    }
    process.exit(1)
  } finally {
    if (localClient) await localClient.close()
    if (atlasClient) await atlasClient.close()
    console.log('🔌 Connections closed')
  }
}

migrate()
