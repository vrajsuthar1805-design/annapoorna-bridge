// Annapoorna Bridge System Constants & SDG Configurations

module.exports = {
  ROLES: {
    DONOR: 'donor',
    NGO: 'ngo',
    ADMIN: 'admin'
  },
  LISTING_STATUS: {
    AVAILABLE: 'available',
    CLAIMED: 'claimed',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    EXPIRED: 'expired'
  },
  DIETARY_TYPES: {
    VEG: 'Veg',
    NON_VEG: 'Non-Veg'
  },
  FOOD_CATEGORIES: [
    'Cooked Rice & Curries',
    'Cooked Rice, Dal & Breads',
    'Packaged Meals & Fruits',
    'Breads & Rotis',
    'Sweets & Desserts',
    'Breakfast Items (Idli/Dosa/Poha)',
    'Snacks & Dry Savories'
  ],
  STORAGE_CONDITIONS: [
    'Insulated Hot Container (>60°C)',
    'Ambient Clean Covered Trays',
    'Chilled Sealed Boxes (≤5°C)',
    'Deep Frozen (≤-18°C)'
  ],
  // Strict 4-Hour Freshness Window: Food must be redistributed within 4 hours of cooking
  DEFAULT_SAFE_HOURS: 4.0,
  MAX_COOKED_AGE_HOURS: 4.0, // Food cooked > 4 hours ago is strictly disallowed
  URGENT_THRESHOLD_HOURS: 1.5, // Food with < 1.5 hours safe window is marked urgent

  // UN SDG Impact Calculations
  IMPACT_METRICS: {
    MEALS_PER_KG: 2,           // Standard simplified ratio: 1 kg food ≈ 2 to 3 meals
    CO2_SAVED_KG_PER_KG: 2.5,  // 1 kg diverted food waste prevents ~2.5 kg CO2e greenhouse emissions
    WATER_SAVED_LITERS_PER_KG: 290 // 1 kg food averts ~290 liters of embodied water loss
  }
};
