// Comprehensive API Verification Test Suite for Annapoorna Bridge

const http = require('http');

const PORT = 5000;
const HOST = 'localhost';

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- Starting Annapoorna Bridge API Verification ---');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Health check
    const health = await request('/api/health');
    assert(health.status === 200 && health.body.status === 'online', '1. Server Health Check');

    // 2. Metrics
    const metrics = await request('/api/metrics/impact');
    assert(metrics.status === 200 && metrics.body.metrics.totalKgRescued !== undefined, '2. SDG Impact Metrics');

    // 3. FSSAI Guidelines
    const fssai = await request('/api/metrics/fssai-guidelines');
    assert(fssai.status === 200 && fssai.body.guidelines.temperature_rules.length > 0, '3. FSSAI Guidelines');

    // 4. Donor Login
    const donorLogin = await request('/api/auth/login', 'POST', {
      email: 'donor.chola@annapoornabridge.org',
      password: 'Password123!'
    });
    assert(donorLogin.status === 200 && donorLogin.body.token, '4. Donor Authentication');
    const donorToken = donorLogin.body.token;

    // 5. NGO Login
    const ngoLogin = await request('/api/auth/login', 'POST', {
      email: 'ngo.robinhood@annapoornabridge.org',
      password: 'Password123!'
    });
    assert(ngoLogin.status === 200 && ngoLogin.body.token, '5. NGO Authentication');
    const ngoToken = ngoLogin.body.token;

    // 6. Admin Login
    const adminLogin = await request('/api/auth/login', 'POST', {
      email: 'admin@annapoornabridge.org',
      password: 'AdminPassword123!'
    });
    assert(adminLogin.status === 200 && adminLogin.body.token, '6. Admin Authentication');
    const adminToken = adminLogin.body.token;

    // 7. Get Available Listings
    const listings = await request('/api/listings?status=available');
    assert(listings.status === 200 && Array.isArray(listings.body.listings), '7. Fetch Available Surplus Feed');

    // 8. Attempt to create listing with food cooked 5 hours ago (MUST BE REJECTED)
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600 * 1000).toISOString();
    const rejectedListingRes = await request('/api/listings', 'POST', {
      foodTitle: 'Old Food - Cooked 5 Hours Ago',
      foodType: 'Cooked Rice & Curries',
      dietaryType: 'Veg',
      estimatedQuantityKg: 20,
      estimatedPlates: 40,
      cookedTime: fiveHoursAgo,
      storageCondition: 'Ambient Clean Covered Trays',
      itemDescription: 'Cooked 5 hours ago, should be blocked by 4-hour rule.',
      pickupAddress: '88/2 Hosur Road, Koramangala, Bengaluru',
      contactPerson: 'Catering In-Charge',
      contactPhone: '+91 98450 12345',
      city: 'Bengaluru',
      safetyChecklistAccepted: true
    }, donorToken);
    assert(rejectedListingRes.status === 400, '8. Strict 4-Hour Rule: Reject Donor Food Cooked > 4 Hours Ago');

    // 9. Create a valid listing as Donor (Cooked 1 hour ago, within 4h window)
    const oneHourAgo = new Date(Date.now() - 3600 * 1000).toISOString();
    const newListingRes = await request('/api/listings', 'POST', {
      foodTitle: 'Automated Test Surplus - Mysore Pak & Poha',
      foodType: 'Breakfast Items (Idli/Dosa/Poha)',
      dietaryType: 'Veg',
      estimatedQuantityKg: 40,
      estimatedPlates: 80,
      cookedTime: oneHourAgo,
      storageCondition: 'Insulated Hot Container (>60°C)',
      itemDescription: 'Hygienic breakfast boxes prepared for corporate launch.',
      pickupAddress: '88/2 Hosur Road, Koramangala, Bengaluru',
      contactPerson: 'Catering In-Charge',
      contactPhone: '+91 98450 12345',
      city: 'Bengaluru',
      safetyChecklistAccepted: true
    }, donorToken);
    assert(newListingRes.status === 201 && newListingRes.body.listing._id, '9. Post Valid Surplus Food Listing (Within 4-Hour Window)');
    const createdId = newListingRes.body.listing._id;

    // 10. Atomic Claim as NGO
    const claimRes = await request(`/api/ngo/claim/${createdId}`, 'POST', {
      volunteerName: 'Suresh Kumar',
      volunteerPhone: '+91 99887 66554',
      vehicleNumber: 'KA-01-EL-8890',
      estimatedPickupTime: 'Within 20 minutes'
    }, ngoToken);
    assert(claimRes.status === 200 && claimRes.body.listing.status === 'claimed', '10. Atomic Claim by NGO');

    // 11. Attempt concurrent claim on same batch (Should fail with 409 Conflict)
    const duplicateClaim = await request(`/api/ngo/claim/${createdId}`, 'POST', {
      volunteerName: 'Rival NGO',
      volunteerPhone: '+91 99999 99999',
      vehicleNumber: 'KA-02-ZZ-0000',
      estimatedPickupTime: 'Now'
    }, ngoToken);
    assert(duplicateClaim.status === 409, '11. Race-Condition Protection (Prevent Duplicate Claims)');

    // 11. Update Transit to in_transit
    const inTransitRes = await request(`/api/ngo/status/${createdId}`, 'PUT', {
      status: 'in_transit',
      note: 'Volunteer Suresh picked up containers from venue.'
    }, ngoToken);
    assert(inTransitRes.status === 200 && inTransitRes.body.listing.status === 'in_transit', '11. Transition Status to in_transit');

    // 12. Update Transit to delivered
    const deliveredRes = await request(`/api/ngo/status/${createdId}`, 'PUT', {
      status: 'delivered',
      note: 'Delivered to shelter home beneficiaries.'
    }, ngoToken);
    assert(deliveredRes.status === 200 && deliveredRes.body.listing.status === 'delivered', '12. Transition Status to delivered');

    // 13. Digital Pickup Dispatch Slip
    const slipRes = await request(`/api/ngo/dispatch-slip/${createdId}`, 'GET', null, ngoToken);
    assert(slipRes.status === 200 && slipRes.body.dispatchSlip.slipNumber, '13. Generate Digital Pickup Dispatch Slip');

    // 14. Admin User Verification
    const usersRes = await request('/api/admin/users', 'GET', null, adminToken);
    assert(usersRes.status === 200 && usersRes.body.users.length > 0, '14. Admin Fetch Users');

    const firstUser = usersRes.body.users[0];
    const verifyRes = await request(`/api/admin/users/${firstUser._id}/verify`, 'PUT', { isVerified: true }, adminToken);
    assert(verifyRes.status === 200 && verifyRes.body.user.isVerified === true, '15. Admin Verify Organization');

    // 15. Audit Logs
    const logsRes = await request('/api/admin/logs', 'GET', null, adminToken);
    assert(logsRes.status === 200 && logsRes.body.logs.length > 0, '16. Platform System Audit Logs');

    console.log(`\n========================================`);
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================\n`);

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test Execution Error:', err);
    process.exit(1);
  }
}

runTests();
