const User = require('./models/User');
const FoodListing = require('./models/FoodListing');
const AuditLog = require('./models/AuditLog');
const { connectDB, closeDB } = require('./config/db');

async function seedData() {
  try {
    console.log('[Seed] Clearing existing collections...');
    await User.deleteMany({});
    await FoodListing.deleteMany({});
    await AuditLog.deleteMany({});

    console.log('[Seed] Creating demo users (Admin, Donors, NGOs)...');

    // Admin
    const admin = await User.create({
      name: 'Sunita Deshmukh',
      email: 'admin@annapoorna.org',
      passwordHash: 'Admin@123',
      role: 'admin',
      phone: '+91 98111 00001',
      city: 'New Delhi',
      address: 'Central Secretariat, UN SDG Hub, New Delhi',
      orgName: 'Annapoorna Bridge National Oversight Board',
      organizationType: 'Other',
      licenseOrDarpanId: 'GOV-IN-SDG-2026',
      isVerified: true,
      verifiedAt: new Date(),
      verificationNotes: 'System Administrator',
    });

    // Donors
    const donor1 = await User.create({
      name: 'Rajesh Kannan',
      email: 'donor@grandchola.com',
      passwordHash: 'Donor@123',
      role: 'donor',
      phone: '+91 94440 12345',
      city: 'Chennai',
      address: 'ITC Grand Chola, 63 Mount Road, Guindy, Chennai',
      orgName: 'ITC Grand Chola Banquets',
      organizationType: 'Marriage Hall',
      licenseOrDarpanId: 'FSSAI-12420002000341',
      isVerified: true,
      verifiedAt: new Date(),
    });

    const donor2 = await User.create({
      name: 'Vikram Malhotra',
      email: 'donor@tajmumbai.com',
      passwordHash: 'Donor@123',
      role: 'donor',
      phone: '+91 98200 45678',
      city: 'Mumbai',
      address: 'Taj Lands End Convention, Bandra West, Mumbai',
      orgName: 'Taj Lands End Conventions',
      organizationType: 'Marriage Hall',
      licenseOrDarpanId: 'FSSAI-11518001000889',
      isVerified: true,
      verifiedAt: new Date(),
    });

    const donor3 = await User.create({
      name: 'Dr. Alok Verma',
      email: 'donor@iitdhostel.ac.in',
      passwordHash: 'Donor@123',
      role: 'donor',
      phone: '+91 98100 88776',
      city: 'New Delhi',
      address: 'Kumaon Hostel, IIT Delhi Campus, Hauz Khas, New Delhi',
      orgName: 'IIT Delhi Kumaon Central Mess',
      organizationType: 'Hostel / Educational Institution',
      licenseOrDarpanId: 'FSSAI-13319005000120',
      isVerified: true,
      verifiedAt: new Date(),
    });

    const donor4 = await User.create({
      name: 'Mahendra Singh',
      email: 'donor@royalheritage.org',
      passwordHash: 'Donor@123',
      role: 'donor',
      phone: '+91 94140 33221',
      city: 'Jaipur',
      address: 'Royal Heritage Palace, Amer Road, Jaipur',
      orgName: 'Royal Heritage Palace Banquets',
      organizationType: 'Marriage Hall',
      licenseOrDarpanId: 'FSSAI-12217004000542',
      isVerified: true,
      verifiedAt: new Date(),
    });

    // Unverified Donor (to demonstrate Admin verification workflow!)
    const unverifiedDonor = await User.create({
      name: 'Kunal Mehra',
      email: 'donor@silveroak.com',
      passwordHash: 'Donor@123',
      role: 'donor',
      phone: '+91 98450 77112',
      city: 'Bengaluru',
      address: 'Silver Oak Caterers, Koramangala 4th Block, Bengaluru',
      orgName: 'Silver Oak Luxury Catering',
      organizationType: 'Event / Catering Service',
      licenseOrDarpanId: 'FSSAI-21221008000912-PENDING',
      isVerified: false,
      verificationNotes: 'Pending review of FSSAI certificate upload',
    });

    // NGOs
    const ngo1 = await User.create({
      name: 'Sudhir Sawant',
      email: 'ngo@rotibank.org',
      passwordHash: 'Ngo@123',
      role: 'ngo',
      phone: '+91 98201 99887',
      city: 'Mumbai',
      address: 'Mumbai Roti Bank Headquarters, Dadar West, Mumbai',
      orgName: 'Mumbai Roti Bank Trust',
      organizationType: 'Food Relief NGO',
      licenseOrDarpanId: 'DARPAN-MH/2018/0194420',
      isVerified: true,
      verifiedAt: new Date(),
    });

    const ngo2 = await User.create({
      name: 'Ananya Sengupta',
      email: 'ngo@feedingindia.org',
      passwordHash: 'Ngo@123',
      role: 'ngo',
      phone: '+91 98118 77665',
      city: 'New Delhi',
      address: 'Feeding India Hub, Okhla Phase 3, New Delhi',
      orgName: 'Feeding India Relief Network',
      organizationType: 'Food Relief NGO',
      licenseOrDarpanId: 'DARPAN-DL/2017/0182390',
      isVerified: true,
      verifiedAt: new Date(),
    });

    const ngo3 = await User.create({
      name: 'Karthik Raghavan',
      email: 'ngo@robinhoodarmy.com',
      passwordHash: 'Ngo@123',
      role: 'ngo',
      phone: '+91 99000 44332',
      city: 'Bengaluru',
      address: 'Robin Hood Army Base, Indiranagar, Bengaluru',
      orgName: 'Robin Hood Army Bengaluru',
      organizationType: 'Food Relief NGO',
      licenseOrDarpanId: 'DARPAN-KA/2019/0213890',
      isVerified: true,
      verifiedAt: new Date(),
    });

    // Unverified NGO (for admin testing)
    const unverifiedNgo = await User.create({
      name: 'Ramesh Pawar',
      email: 'ngo@hopekitchen.org',
      passwordHash: 'Ngo@123',
      role: 'ngo',
      phone: '+91 98220 11990',
      city: 'Pune',
      address: 'Hope Kitchen, Swargate, Pune',
      orgName: 'Hope Kitchen Foundation',
      organizationType: 'Community Kitchen',
      licenseOrDarpanId: 'DARPAN-MH/2024/PENDING-91',
      isVerified: false,
      verificationNotes: 'Pending 80G tax exemption and Darpan portal verification',
    });

    console.log('[Seed] Users seeded successfully.');
    console.log('[Seed] Creating sample food listings with realistic countdowns...');

    const now = new Date();

    // Listing 1: URGENT (Expires in 55 mins)
    const urgentExpiry = new Date(now.getTime() + 55 * 60 * 1000); // 55 mins from now
    const cooked3hAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    const listing1 = await FoodListing.create({
      donorId: donor1._id,
      foodTitle: 'Royal Saffron Biryani & Dal Makhani (Dinner Banquet Surplus)',
      foodType: 'Cooked Rice & Curry',
      dietaryType: 'veg',
      quantityValue: 180,
      quantityUnit: 'plates',
      cookedTime: cooked3hAgo,
      safeUntil: urgentExpiry,
      storageCondition: 'Insulated / Hot Container (> 60°C)',
      pickupAddress: donor1.address,
      pickupCity: 'Chennai',
      pickupLandmark: 'Behind Main Ball Room Service Entrance, Gate 3',
      pickupPincode: '600032',
      contactPerson: donor1.name,
      contactPhone: donor1.phone,
      specialInstructions: 'Food is packed in 4 heavy-duty commercial thermal food warmers. Please bring clean stainless vessels.',
      photoUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'available',
      auditLogs: [
        {
          status: 'available',
          timestamp: cooked3hAgo,
          updatedBy: donor1._id,
          updaterRole: 'donor',
          updaterName: donor1.name,
          notes: 'Listing created following FSSAI temperature threshold guidelines.',
        },
      ],
    });

    // Listing 2: Standard available (Safe for 4.5 hours)
    const expiry4h = new Date(now.getTime() + 4.5 * 60 * 60 * 1000);
    const cooked1hAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);

    const listing2 = await FoodListing.create({
      donorId: donor3._id,
      foodTitle: 'Fresh Whole Wheat Chapatis & Shahi Paneer (Hostel Lunch Surplus)',
      foodType: 'Breads & Rotis',
      dietaryType: 'veg',
      quantityValue: 260,
      quantityUnit: 'plates',
      cookedTime: cooked1hAgo,
      safeUntil: expiry4h,
      storageCondition: 'Ambient / Room Temperature',
      pickupAddress: donor3.address,
      pickupCity: 'New Delhi',
      pickupLandmark: 'Opposite Student Activity Centre (SAC)',
      pickupPincode: '110016',
      contactPerson: donor3.name,
      contactPhone: donor3.phone,
      specialInstructions: 'Rotis wrapped in food-grade silver foil stacks of 50 each. Curries in covered cauldrons.',
      photoUrl: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'available',
      auditLogs: [
        {
          status: 'available',
          timestamp: cooked1hAgo,
          updatedBy: donor3._id,
          updaterRole: 'donor',
          updaterName: donor3.name,
          notes: 'Verified safe handling checklist.',
        },
      ],
    });

    // Listing 3: Desserts / Sweets (Safe for 3.5 hours)
    const expiry3h = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);

    const listing3 = await FoodListing.create({
      donorId: donor4._id,
      foodTitle: 'Traditional Rajasthani Gulab Jamun & Moong Dal Halwa',
      foodType: 'Sweets & Desserts',
      dietaryType: 'veg',
      quantityValue: 75,
      quantityUnit: 'kg',
      cookedTime: cooked1hAgo,
      safeUntil: expiry3h,
      storageCondition: 'Ambient / Room Temperature',
      pickupAddress: donor4.address,
      pickupCity: 'Jaipur',
      pickupLandmark: 'Amer Road heritage courtyard, Kitchen Wing B',
      pickupPincode: '302002',
      contactPerson: donor4.name,
      contactPhone: donor4.phone,
      specialInstructions: 'Freshly prepared pure ghee sweets in food-grade steel trays.',
      photoUrl: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'available',
      auditLogs: [
        {
          status: 'available',
          timestamp: cooked1hAgo,
          updatedBy: donor4._id,
          updaterRole: 'donor',
          updaterName: donor4.name,
          notes: 'Standard sweet preservation protocols followed.',
        },
      ],
    });

    // Listing 4: CLAIMED by Mumbai Roti Bank (Volunteer Assigned)
    const claimedListing = await FoodListing.create({
      donorId: donor2._id,
      foodTitle: 'Grand Wedding Buffet: Jeera Rice, Paneer Butter Masala & Naans',
      foodType: 'Mixed Indian Buffet',
      dietaryType: 'veg',
      quantityValue: 310,
      quantityUnit: 'plates',
      cookedTime: cooked3hAgo,
      safeUntil: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      storageCondition: 'Insulated / Hot Container (> 60°C)',
      pickupAddress: donor2.address,
      pickupCity: 'Mumbai',
      pickupLandmark: 'Convention Loading Dock #4',
      pickupPincode: '400050',
      contactPerson: donor2.name,
      contactPhone: donor2.phone,
      specialInstructions: 'Security pass arranged at Gate 1 for NGO vehicle.',
      photoUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'claimed',
      claimedBy: ngo1._id,
      claimedAt: new Date(now.getTime() - 25 * 60 * 1000),
      pickupVerificationCode: 'AB-8419',
      volunteerDetails: {
        name: 'Rahul Shinde',
        phone: '+91 98205 66778',
        vehicleNumber: 'MH-02-CB-4491 (Insulated Tata Ace)',
        etaMinutes: 20,
        assignedAt: new Date(now.getTime() - 20 * 60 * 1000),
      },
      auditLogs: [
        {
          status: 'available',
          timestamp: cooked3hAgo,
          updatedBy: donor2._id,
          updaterRole: 'donor',
          updaterName: donor2.name,
          notes: 'Listing created.',
        },
        {
          status: 'claimed',
          timestamp: new Date(now.getTime() - 25 * 60 * 1000),
          updatedBy: ngo1._id,
          updaterRole: 'ngo',
          updaterName: ngo1.name,
          notes: 'Claimed by Mumbai Roti Bank. Volunteer Rahul dispatched.',
        },
      ],
    });

    // Listing 5: IN TRANSIT
    const inTransitListing = await FoodListing.create({
      donorId: donor2._id,
      foodTitle: 'Awadhi Chicken Dum Biryani & Mirchi Ka Salan (Reception Surplus)',
      foodType: 'Cooked Rice & Curry',
      dietaryType: 'non-veg',
      quantityValue: 140,
      quantityUnit: 'plates',
      cookedTime: cooked3hAgo,
      safeUntil: new Date(now.getTime() + 1.5 * 60 * 60 * 1000),
      storageCondition: 'Insulated / Hot Container (> 60°C)',
      pickupAddress: donor2.address,
      pickupCity: 'Mumbai',
      pickupLandmark: 'Convention Loading Dock #4',
      pickupPincode: '400050',
      contactPerson: donor2.name,
      contactPhone: donor2.phone,
      specialInstructions: 'Separated non-veg containers clearly labeled.',
      photoUrl: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'in_transit',
      claimedBy: ngo1._id,
      claimedAt: new Date(now.getTime() - 50 * 60 * 1000),
      pickupVerificationCode: 'AB-3291',
      volunteerDetails: {
        name: 'Suresh More',
        phone: '+91 98203 11223',
        vehicleNumber: 'MH-03-AX-8920 (Van)',
        etaMinutes: 10,
        assignedAt: new Date(now.getTime() - 45 * 60 * 1000),
      },
      auditLogs: [
        {
          status: 'available',
          timestamp: cooked3hAgo,
          updatedBy: donor2._id,
          updaterRole: 'donor',
          updaterName: donor2.name,
          notes: 'Listing created.',
        },
        {
          status: 'claimed',
          timestamp: new Date(now.getTime() - 50 * 60 * 1000),
          updatedBy: ngo1._id,
          updaterRole: 'ngo',
          updaterName: ngo1.name,
          notes: 'Claimed by Mumbai Roti Bank.',
        },
        {
          status: 'in_transit',
          timestamp: new Date(now.getTime() - 15 * 60 * 1000),
          updatedBy: ngo1._id,
          updaterRole: 'ngo',
          updaterName: ngo1.name,
          notes: 'Food verified at venue and loaded into transport van.',
        },
      ],
    });

    // Listing 6: DELIVERED (Success story)
    const deliveredListing = await FoodListing.create({
      donorId: donor1._id,
      foodTitle: 'Traditional South Indian Festive Lunch: Sambhar Rice, Poriyal, Curd Rice & Vada',
      foodType: 'Cooked Rice & Curry',
      dietaryType: 'veg',
      quantityValue: 240,
      quantityUnit: 'plates',
      cookedTime: new Date(now.getTime() - 7 * 60 * 60 * 1000),
      safeUntil: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      storageCondition: 'Insulated / Hot Container (> 60°C)',
      pickupAddress: donor1.address,
      pickupCity: 'Chennai',
      pickupLandmark: 'Service Gate #2',
      pickupPincode: '600032',
      contactPerson: donor1.name,
      contactPhone: donor1.phone,
      photoUrl: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?w=800&auto=format&fit=crop&q=80',
      safetyChecklistAccepted: true,
      status: 'delivered',
      claimedBy: ngo2._id,
      claimedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      pickupVerificationCode: 'AB-1903',
      volunteerDetails: {
        name: 'M. Selvam',
        phone: '+91 94441 55667',
        vehicleNumber: 'TN-09-BK-6672',
        etaMinutes: 0,
        assignedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      },
      deliveryNotes: 'Successfully served 240 portions to families at Perungudi Community Shelter. Food temperature tested 63.5°C.',
      auditLogs: [
        {
          status: 'available',
          timestamp: new Date(now.getTime() - 7 * 60 * 60 * 1000),
          updatedBy: donor1._id,
          updaterRole: 'donor',
          updaterName: donor1.name,
          notes: 'Listing created.',
        },
        {
          status: 'claimed',
          timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000),
          updatedBy: ngo2._id,
          updaterRole: 'ngo',
          updaterName: ngo2.name,
          notes: 'Claimed by Feeding India.',
        },
        {
          status: 'in_transit',
          timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
          updatedBy: ngo2._id,
          updaterRole: 'ngo',
          updaterName: ngo2.name,
          notes: 'En route to shelter.',
        },
        {
          status: 'delivered',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
          updatedBy: ngo2._id,
          updaterRole: 'ngo',
          updaterName: ngo2.name,
          notes: 'Delivered and served with verification confirmation.',
        },
      ],
    });

    // Create Initial System Audit Trail Logs
    await AuditLog.create([
      {
        action: 'USER_REGISTERED',
        userId: admin._id,
        userName: admin.name,
        userRole: admin.role,
        details: { orgName: admin.orgName },
      },
      {
        action: 'LISTING_CREATED',
        listingId: listing1._id,
        userId: donor1._id,
        userName: donor1.name,
        userRole: donor1.role,
        details: { foodTitle: listing1.foodTitle, quantity: '180 plates', city: 'Chennai' },
      },
      {
        action: 'LISTING_CLAIMED',
        listingId: claimedListing._id,
        userId: ngo1._id,
        userName: ngo1.name,
        userRole: ngo1.role,
        details: { ngoName: ngo1.orgName, verificationCode: claimedListing.pickupVerificationCode },
      },
      {
        action: 'STATUS_UPDATED',
        listingId: inTransitListing._id,
        userId: ngo1._id,
        userName: ngo1.name,
        userRole: ngo1.role,
        details: { newStatus: 'in_transit' },
      },
      {
        action: 'STATUS_UPDATED',
        listingId: deliveredListing._id,
        userId: ngo2._id,
        userName: ngo2.name,
        userRole: ngo2.role,
        details: { newStatus: 'delivered', notes: deliveredListing.deliveryNotes },
      },
    ]);

    console.log('[Seed] Database seeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('🔑 TEST CREDENTIALS:');
    console.log('1. Admin:       admin@annapoorna.org     / Admin@123');
    console.log('2. Donor (Chola): donor@grandchola.com    / Donor@123');
    console.log('3. Donor (IIT D): donor@iitdhostel.ac.in  / Donor@123');
    console.log('4. NGO (Roti Bank): ngo@rotibank.org     / Ngo@123');
    console.log('5. NGO (Feeding IN): ngo@feedingindia.org / Ngo@123');
    console.log('6. Pending Donor: donor@silveroak.com    / Donor@123 (to test Admin verification)');
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('[Seed] Error during seeding:', error);
    throw error;
  }
}

// If run directly from command line (e.g. node server/seed.js)
if (require.main === module) {
  (async () => {
    try {
      require('dotenv').config();
      await connectDB();
      await seedData();
      await closeDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { seedData };
