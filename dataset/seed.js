// Dataset Seeder Script for Annapoorna Bridge
// Can be executed via: npm run seed or node dataset/seed.js

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const seedData = async () => {
  console.log('[Seeder] Starting Annapoorna Bridge database seeding...');

  const donorsPath = path.join(__dirname, 'sample_donors.json');
  const ngosPath = path.join(__dirname, 'sample_ngos.json');
  const listingsPath = path.join(__dirname, 'sample_listings.json');
  const seedMetaPath = path.join(__dirname, 'seed.json');
  const activeDbPath = path.join(__dirname, 'active_db.json');

  const donors = JSON.parse(fs.readFileSync(donorsPath, 'utf8'));
  const ngos = JSON.parse(fs.readFileSync(ngosPath, 'utf8'));
  const sampleListings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));
  const seedMeta = JSON.parse(fs.readFileSync(seedMetaPath, 'utf8'));

  const users = [];

  // 1. Admin
  const adminSalt = await bcrypt.genSalt(10);
  const adminHash = await bcrypt.hash(seedMeta.admin.password, adminSalt);
  users.push({
    _id: 'usr_admin_001',
    ...seedMeta.admin,
    passwordHash: adminHash,
    createdAt: new Date().toISOString()
  });

  // 2. Donors
  for (let i = 0; i < donors.length; i++) {
    const d = donors[i];
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(d.password, salt);
    users.push({
      _id: `usr_donor_${i + 1}`,
      ...d,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    });
  }

  // 3. NGOs
  for (let i = 0; i < ngos.length; i++) {
    const n = ngos[i];
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(n.password, salt);
    users.push({
      _id: `usr_ngo_${i + 1}`,
      ...n,
      passwordHash: hash,
      createdAt: new Date().toISOString()
    });
  }

  // 4. Food Listings with dynamically tuned relative times
  const listings = [];
  const now = Date.now();

  for (let i = 0; i < sampleListings.length; i++) {
    const item = sampleListings[i];
    const donor = users.find(u => u.email === item.donorEmail) || users[1];
    const ngo = item.claimedByNgoEmail ? users.find(u => u.email === item.claimedByNgoEmail) : null;

    const cookedTime = new Date(now - (item.cookedOffsetHours || 1) * 3600 * 1000).toISOString();
    const safeUntil = new Date(new Date(cookedTime).getTime() + 4 * 3600 * 1000).toISOString();

    listings.push({
      _id: `lst_00${i + 1}`,
      listingCode: item.listingCode,
      donorId: donor._id,
      donorName: donor.name,
      donorPhone: donor.phone,
      foodTitle: item.foodTitle,
      foodType: item.foodType,
      dietaryType: item.dietaryType,
      estimatedQuantityKg: item.estimatedQuantityKg,
      estimatedPlates: item.estimatedPlates,
      itemDescription: item.itemDescription,
      cookedTime,
      safeUntil,
      storageCondition: item.storageCondition,
      city: item.city,
      pickupAddress: item.pickupAddress,
      contactPerson: item.contactPerson,
      contactPhone: item.contactPhone,
      status: item.status,
      claimedBy: ngo ? { _id: ngo._id, name: ngo.name, phone: ngo.phone, email: ngo.email, darpanId: ngo.ngoDetails ? ngo.ngoDetails.darpanId : 'Verified' } : null,
      volunteerDetails: item.volunteerDetails || null,
      safetyChecklistAccepted: item.safetyChecklistAccepted !== false,
      pickupOtp: item.pickupOtp || Math.floor(1000 + Math.random() * 9000).toString(),
      imageUrl: item.imageUrl || '',
      statusLogs: [
        {
          status: 'available',
          timestamp: cookedTime,
          updatedBy: donor.name,
          note: 'Listing created with FSSAI hygiene checklist declaration'
        }
      ],
      createdAt: cookedTime,
      updatedAt: new Date().toISOString()
    });
  }

  const logs = [
    {
      _id: 'log_001',
      listingId: listings[0]._id,
      listingCode: listings[0].listingCode,
      action: 'LISTING_POSTED',
      fromStatus: null,
      toStatus: 'available',
      actorRole: 'donor',
      actorName: 'Grand Chola Banquets & Events',
      note: 'Initial surplus listing published with FSSAI checklist'
    }
  ];

  // Write embedded store active_db.json
  const activeDbData = { users, listings, logs, notifications: [] };
  fs.writeFileSync(activeDbPath, JSON.stringify(activeDbData, null, 2), 'utf8');
  console.log(`[Seeder]  Embedded storage written: ${users.length} users, ${listings.length} listings saved to active_db.json.`);

  // Attempt MongoDB seeding if MongoDB server is active
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/annapoorna_bridge';
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('[Seeder] Connected to MongoDB. Syncing collections...');
    const collections = await mongoose.connection.db.collections();
    for (const coll of collections) {
      await coll.deleteMany({});
    }
    await mongoose.connection.collection('users').insertMany(users);
    await mongoose.connection.collection('foodlistings').insertMany(listings);
    await mongoose.connection.collection('logs').insertMany(logs);
    console.log('[Seeder]  MongoDB collections populated successfully!');
    await mongoose.disconnect();
  } catch (err) {
    console.log(`[Seeder] MongoDB server not active (${err.message}). Embedded dataset is active and fully functional!`);
  }

  console.log('[Seeder]  Seeding complete! You can now start the application with "npm start".');
};

seedData().catch(err => {
  console.error('[Seeder Error]', err);
  process.exit(1);
});
