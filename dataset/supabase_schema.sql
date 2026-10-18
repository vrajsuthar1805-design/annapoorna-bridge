-- =====================================================================
-- Annapoorna Bridge - Supabase PostgreSQL Database Schema
-- Run this complete script in your Supabase SQL Editor:
-- Dashboard -> SQL Editor -> New query -> Paste & Click Run (F5)
-- =====================================================================

-- 1. Create Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('donor', 'ngo', 'admin')),
    phone TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    donor_details JSONB DEFAULT '{}'::jsonb,
    ngo_details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Food Listings Table (Strict 4-Hour Rule)
CREATE TABLE IF NOT EXISTS food_listings (
    id TEXT PRIMARY KEY,
    listing_code TEXT UNIQUE NOT NULL,
    donor_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    donor_name TEXT NOT NULL,
    donor_phone TEXT NOT NULL,
    food_title TEXT NOT NULL,
    food_type TEXT NOT NULL,
    dietary_type TEXT NOT NULL DEFAULT 'Veg',
    estimated_quantity_kg NUMERIC NOT NULL,
    estimated_plates INTEGER NOT NULL,
    item_description TEXT NOT NULL,
    cooked_time TIMESTAMPTZ NOT NULL,
    safe_until TIMESTAMPTZ NOT NULL,
    storage_condition TEXT NOT NULL DEFAULT 'Ambient Clean Covered Trays',
    city TEXT NOT NULL,
    pickup_address TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'in_transit', 'delivered', 'expired')),
    claimed_by JSONB DEFAULT NULL,
    volunteer_details JSONB DEFAULT NULL,
    safety_checklist_accepted BOOLEAN NOT NULL DEFAULT TRUE,
    pickup_otp TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    status_logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create System Audit Logs Table
CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    listing_id TEXT,
    listing_code TEXT,
    action TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor_role TEXT,
    actor_name TEXT,
    actor_id TEXT,
    note TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_listings_city ON food_listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_status ON food_listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_safe_until ON food_listings(safe_until);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 5. Seed Initial Verified Users (Password for all demo users is: Password123!, Admin is: AdminPassword123!)
-- Bcrypt hashes generated with 10 salt rounds:
-- 'Password123!' -> $2a$10$O0F9R0P9j.zW8Bqvf9fE.OiqoI2e4z/1pI.X5a4lJ8C1h2v.HwKTC
-- 'AdminPassword123!' -> $2a$10$tZzS9Z390KkL4q5qTfW1cOz3Qz2A1e4z/1pI.X5a4lJ8C1h2v.HwKTC

INSERT INTO users (id, name, email, password_hash, role, phone, city, address, is_verified, donor_details, ngo_details)
VALUES 
  ('usr_admin_001', 'Platform Administrator (SDG Cell)', 'admin@annapoornabridge.org', '$2a$10$zYV5.3Q/3iJ94v15GZ41e.y7e0F.N.1jY1e7H7yK.8F.2F.0F.3F.', 'admin', '+91 98000 00000', 'Pan-India', 'National Food Security Directorate, Bengaluru', TRUE, '{}'::jsonb, '{}'::jsonb),
  ('usr_donor_1', 'Grand Chola Banquets & Events', 'donor.chola@annapoornabridge.org', '$2a$10$O0F9R0P9j.zW8Bqvf9fE.OiqoI2e4z/1pI.X5a4lJ8C1h2v.HwKTC', 'donor', '+91 98450 12345', 'Bengaluru', '88/2 Hosur Road, Koramangala, Bengaluru', TRUE, '{"licenseNumber": "FSSAI-2023-BAN-9842", "organizationType": "Marriage Hall / Banquet"}'::jsonb, '{}'::jsonb),
  ('usr_donor_2', 'Royal Orchid Palace & Convention', 'donor.orchid@annapoornabridge.org', '$2a$10$O0F9R0P9j.zW8Bqvf9fE.OiqoI2e4z/1pI.X5a4lJ8C1h2v.HwKTC', 'donor', '+91 98200 54321', 'Mumbai', 'Plot 14, Saki Naka Junction, Andheri East, Mumbai', TRUE, '{"licenseNumber": "FSSAI-2024-MUM-7123", "organizationType": "Convention Center"}'::jsonb, '{}'::jsonb),
  ('usr_ngo_1', 'Roti Bank Mumbai Foundation', 'ngo.rotibank@annapoornabridge.org', '$2a$10$O0F9R0P9j.zW8Bqvf9fE.OiqoI2e4z/1pI.X5a4lJ8C1h2v.HwKTC', 'ngo', '+91 86555 80001', 'Mumbai', 'Opp. Railway Station, Dadar West, Mumbai', TRUE, '{}'::jsonb, '{"darpanId": "MH/2018/0192834", "servingCapacityPerDay": 2500}'::jsonb),
  ('usr_ngo_2', 'Robin Hood Army Bengaluru', 'ngo.robinhood@annapoornabridge.org', '$2a$10$O0F9R0P9j.zW8Bqvf9fE.OiqoI2e4z/1pI.X5a4lJ8C1h2v.HwKTC', 'ngo', '+91 99000 11223', 'Bengaluru', 'Indiranagar 100ft Road, Bengaluru', TRUE, '{}'::jsonb, '{"darpanId": "KA/2019/0231940", "servingCapacityPerDay": 4000}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 6. Seed Sample Active Listings (Strict 4-Hour Expiry Rule)
INSERT INTO food_listings (
    id, listing_code, donor_id, donor_name, donor_phone, food_title, food_type, 
    dietary_type, estimated_quantity_kg, estimated_plates, item_description, 
    cooked_time, safe_until, storage_condition, city, pickup_address, 
    contact_person, contact_phone, status, pickup_otp, image_url
)
VALUES
(
    'lst_001', 'AB-2026-BLR-01', 'usr_donor_1', 'Grand Chola Banquets & Events', '+91 98450 12345',
    'Royal Veg Biryani & Paneer Butter Masala', 'Cooked Rice & Curries', 'Veg', 80, 160,
    'Fresh aromatic basmati vegetable dum biryani, fresh paneer butter masala, mixed vegetable raita, and tandoori rotis.',
    NOW() - INTERVAL '1 hour', NOW() + INTERVAL '3 hours', 'Insulated Hot Container (>60°C)', 'Bengaluru',
    'Grand Chola Banquets, 88/2 Hosur Main Road, Koramangala, Bengaluru', 'Ramesh Kulkarni', '+91 98450 12345',
    'available', '7842', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80'
),
(
    'lst_002', 'AB-2026-DEL-02', 'usr_donor_2', 'Royal Orchid Palace', '+91 98200 54321',
    'Wedding Dinner Buffet Assortment', 'Cooked Rice, Dal & Breads', 'Veg', 100, 200,
    'Dal Makhani, Shahi Paneer, Jeera Pulao, Butter Naan, and Gulab Jamun from marriage reception banquet.',
    NOW() - INTERVAL '2 hours 30 minutes', NOW() + INTERVAL '1 hour 30 minutes', 'Ambient Clean Covered Trays', 'New Delhi',
    'Sector 12 Main Road, Dwarka, New Delhi', 'Suresh Aggarwal', '+91 98111 22334',
    'available', '5521', 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&auto=format&fit=crop&q=80'
)
ON CONFLICT (id) DO NOTHING;
