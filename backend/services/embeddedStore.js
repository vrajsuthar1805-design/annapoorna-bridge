// Annapoorna Bridge High-Speed Embedded Store with Atomic Lock Protection
// Used seamlessly if MongoDB server is not running locally or in development mode

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, '../../dataset/active_db.json');

class EmbeddedStore {
  constructor() {
    this.data = {
      users: [],
      listings: [],
      logs: [],
      notifications: []
    };
    this.lock = false;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        console.log(`[EmbeddedStore] Loaded existing database with ${this.data.users.length} users and ${this.data.listings.length} listings.`);
        this.initialized = true;
        return;
      } catch (err) {
        console.warn('[EmbeddedStore] Corrupt active_db.json, re-seeding from datasets...');
      }
    }

    // Seed defaults
    await this.seedDefaults();
    this.save();
    this.initialized = true;
  }

  async seedDefaults() {
    console.log('[EmbeddedStore] Seeding default dataset for out-of-the-box local testing...');
    const seedMetaPath = path.join(__dirname, '../../dataset/seed.json');
    const donorsPath = path.join(__dirname, '../../dataset/sample_donors.json');
    const ngosPath = path.join(__dirname, '../../dataset/sample_ngos.json');
    const listingsPath = path.join(__dirname, '../../dataset/sample_listings.json');

    const seedMeta = fs.existsSync(seedMetaPath) ? JSON.parse(fs.readFileSync(seedMetaPath, 'utf8')) : {};
    const donors = fs.existsSync(donorsPath) ? JSON.parse(fs.readFileSync(donorsPath, 'utf8')) : [];
    const ngos = fs.existsSync(ngosPath) ? JSON.parse(fs.readFileSync(ngosPath, 'utf8')) : [];
    const sampleListings = fs.existsSync(listingsPath) ? JSON.parse(fs.readFileSync(listingsPath, 'utf8')) : [];

    const users = [];

    // Admin
    if (seedMeta.admin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(seedMeta.admin.password, salt);
      users.push({
        _id: 'usr_admin_001',
        ...seedMeta.admin,
        passwordHash: hash,
        createdAt: new Date().toISOString()
      });
    }

    // Donors
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

    // NGOs
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

    this.data.users = users;

    // Build listings with dynamic relative timestamps so timers tick accurately
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
        claimedBy: ngo ? { _id: ngo._id, name: ngo.name, phone: ngo.phone, email: ngo.email } : null,
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

    this.data.listings = listings;
    this.data.logs = [
      {
        _id: 'log_001',
        listingId: listings[0]._id,
        action: 'LISTING_POSTED',
        fromStatus: null,
        toStatus: 'available',
        actorRole: 'donor',
        actorName: 'Grand Chola Banquets & Events',
        timestamp: new Date().toISOString(),
        note: 'Initial surplus listing published'
      }
    ];

    console.log(`[EmbeddedStore] Seeded ${users.length} users and ${listings.length} live listings.`);
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[EmbeddedStore] Error persisting database to disk:', err.message);
    }
  }

  // --- User Collection Operations ---
  get Users() {
    return {
      find: async (query = {}) => {
        await this.init();
        return this.filterItems(this.data.users, query);
      },
      findOne: async (query) => {
        await this.init();
        const results = this.filterItems(this.data.users, query);
        return results[0] || null;
      },
      findById: async (id) => {
        await this.init();
        return this.data.users.find(u => u._id === id || u.id === id) || null;
      },
      create: async (doc) => {
        await this.init();
        const newDoc = {
          _id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          ...doc,
          createdAt: new Date().toISOString()
        };
        this.data.users.push(newDoc);
        this.save();
        return newDoc;
      },
      findByIdAndUpdate: async (id, update) => {
        await this.init();
        const user = this.data.users.find(u => u._id === id || u.id === id);
        if (!user) return null;
        Object.assign(user, update);
        this.save();
        return user;
      },
      countDocuments: async (query = {}) => {
        await this.init();
        return this.filterItems(this.data.users, query).length;
      }
    };
  }

  // --- Food Listing Collection Operations with ATOMIC MUTEX for Race-Free Claims ---
  get Listings() {
    return {
      find: async (query = {}) => {
        await this.init();
        return this.filterItems(this.data.listings, query);
      },
      findOne: async (query) => {
        await this.init();
        const results = this.filterItems(this.data.listings, query);
        return results[0] || null;
      },
      findById: async (id) => {
        await this.init();
        return this.data.listings.find(l => l._id === id || l.id === id) || null;
      },
      create: async (doc) => {
        await this.init();
        const count = this.data.listings.length + 1;
        const code = `AB-${new Date().getFullYear()}-${doc.city ? doc.city.substring(0, 3).toUpperCase() : 'IND'}-${String(count).padStart(2, '0')}`;
        const newDoc = {
          _id: `lst_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          listingCode: code,
          status: 'available',
          claimedBy: null,
          volunteerDetails: null,
          pickupOtp: Math.floor(1000 + Math.random() * 9000).toString(),
          statusLogs: [
            {
              status: 'available',
              timestamp: new Date().toISOString(),
              updatedBy: doc.donorName || 'Donor',
              note: 'Surplus food listing published to network'
            }
          ],
          ...doc,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        this.data.listings.unshift(newDoc);
        this.save();
        return newDoc;
      },
      // Atomic compare-and-swap update to guarantee zero race conditions
      atomicClaim: async (listingId, ngoUser, volunteerDetails) => {
        await this.init();
        while (this.lock) {
          await new Promise(r => setTimeout(r, 10));
        }
        this.lock = true;
        try {
          const listing = this.data.listings.find(l => l._id === listingId);
          if (!listing) {
            return { success: false, code: 404, message: 'Listing not found' };
          }

          const now = Date.now();
          const cookedTime = new Date(listing.cookedTime).getTime();
          const ageHours = (now - cookedTime) / (3600 * 1000);
          const safeTime = new Date(listing.safeUntil).getTime();

          // STRICT 4-HOUR RULE: NGO cannot accept food if older than 4 hours or expired
          if (ageHours > 4.0 || now >= safeTime) {
            listing.status = 'expired';
            this.save();
            return {
              success: false,
              code: 400,
              message: 'This food request cannot be accepted. The food was cooked more than 4 hours ago and has expired under the 4-hour freshness rule.'
            };
          }

          if (listing.status !== 'available') {
            return {
              success: false,
              code: 409,
              message: `Listing is already ${listing.status.toUpperCase()} and cannot be claimed.`
            };
          }

          listing.status = 'claimed';
          listing.claimedBy = {
            _id: ngoUser._id,
            name: ngoUser.name,
            phone: ngoUser.phone,
            email: ngoUser.email,
            darpanId: ngoUser.ngoDetails ? ngoUser.ngoDetails.darpanId : 'Verified'
          };
          listing.volunteerDetails = volunteerDetails;
          listing.updatedAt = new Date().toISOString();
          listing.statusLogs.push({
            status: 'claimed',
            timestamp: new Date().toISOString(),
            updatedBy: ngoUser.name,
            note: `Claimed by ${ngoUser.name}. Volunteer ${volunteerDetails.volunteerName} assigned.`
          });

          this.save();
          return { success: true, listing };
        } finally {
          this.lock = false;
        }
      },
      findByIdAndUpdate: async (id, update) => {
        await this.init();
        const listing = this.data.listings.find(l => l._id === id || l.id === id);
        if (!listing) return null;
        Object.assign(listing, update, { updatedAt: new Date().toISOString() });
        this.save();
        return listing;
      },
      countDocuments: async (query = {}) => {
        await this.init();
        return this.filterItems(this.data.listings, query).length;
      }
    };
  }

  // --- Logs Collection Operations ---
  get Logs() {
    return {
      find: async (query = {}) => {
        await this.init();
        return this.filterItems(this.data.logs, query);
      },
      create: async (doc) => {
        await this.init();
        const newLog = {
          _id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
          timestamp: new Date().toISOString(),
          ...doc
        };
        this.data.logs.unshift(newLog);
        this.save();
        return newLog;
      }
    };
  }

  filterItems(items, query) {
    return items.filter(item => {
      for (const key of Object.keys(query)) {
        const val = query[key];
        if (val && typeof val === 'object' && val.$in) {
          if (!val.$in.includes(item[key])) return false;
        } else if (val && typeof val === 'object' && val.$ne) {
          if (item[key] === val.$ne) return false;
        } else if (item[key] !== val) {
          return false;
        }
      }
      return true;
    });
  }
}

const store = new EmbeddedStore();
module.exports = store;
