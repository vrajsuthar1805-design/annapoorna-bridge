// Metrics & SDG Impact Controller (Zero Hunger & Sustainable Cities Analytics)

const path = require('path');
const fs = require('fs');
const FoodListingModel = require('../models/FoodListing');
const UserModel = require('../models/User');
const { IMPACT_METRICS } = require('../config/constants');

// @desc    Get aggregate SDG Impact Metrics & Analytics
// @route   GET /api/metrics/impact
// @access  Public
const getImpactMetrics = async (req, res, next) => {
  try {
    const listings = await FoodListingModel.find({});
    const users = await UserModel.find({});

    let totalKgDelivered = 0;
    let totalPlatesDelivered = 0;
    let totalKgInPipeline = 0;

    const cityStats = {};
    const statusCounts = {
      available: 0,
      claimed: 0,
      in_transit: 0,
      delivered: 0,
      expired: 0
    };

    for (const item of listings) {
      const kg = Number(item.estimatedQuantityKg) || 0;
      const plates = Number(item.estimatedPlates) || 0;

      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }

      if (item.status === 'delivered') {
        totalKgDelivered += kg;
        totalPlatesDelivered += plates;
      } else if (item.status === 'claimed' || item.status === 'in_transit') {
        totalKgInPipeline += kg;
      }

      // City breakdown
      const city = item.city || 'Other';
      if (!cityStats[city]) {
        cityStats[city] = { listingsCount: 0, kgRescued: 0, platesServed: 0 };
      }
      cityStats[city].listingsCount++;
      if (item.status === 'delivered') {
        cityStats[city].kgRescued += kg;
        cityStats[city].platesServed += plates;
      }
    }

    const donorsCount = users.filter(u => u.role === 'donor').length;
    const ngosCount = users.filter(u => u.role === 'ngo').length;
    const verifiedNgosCount = users.filter(u => u.role === 'ngo' && u.isVerified).length;

    // Environmental & SDG Math
    const mealsServed = totalPlatesDelivered > 0 ? totalPlatesDelivered : Math.round(totalKgDelivered * IMPACT_METRICS.MEALS_PER_KG);
    const co2DivertedKg = Math.round(totalKgDelivered * IMPACT_METRICS.CO2_SAVED_KG_PER_KG);
    const waterSavedLiters = Math.round(totalKgDelivered * IMPACT_METRICS.WATER_SAVED_LITERS_PER_KG);

    // Recent Rescues ticker
    const recentRescues = listings
      .filter(l => l.status === 'delivered' || l.status === 'in_transit')
      .slice(0, 8)
      .map(l => ({
        code: l.listingCode,
        title: l.foodTitle,
        city: l.city,
        kg: l.estimatedQuantityKg,
        plates: l.estimatedPlates,
        status: l.status,
        claimedBy: l.claimedBy ? l.claimedBy.name : 'Verified NGO'
      }));

    res.status(200).json({
      success: true,
      sdgGoals: ['UN SDG 2: Zero Hunger', 'UN SDG 11: Sustainable Cities & Communities'],
      metrics: {
        totalKgRescued: totalKgDelivered,
        totalKgInPipeline,
        mealsServed,
        co2DivertedKg,
        co2DivertedTons: (co2DivertedKg / 1000).toFixed(2),
        waterSavedLiters,
        activeDonors: donorsCount,
        verifiedNgos: verifiedNgosCount,
        totalNgos: ngosCount,
        statusCounts,
        cityStats,
        recentRescues
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get FSSAI guidelines & safety standard checklist
// @route   GET /api/metrics/fssai-guidelines
// @access  Public
const getFssaiGuidelines = async (req, res, next) => {
  try {
    const fssaiPath = path.join(__dirname, '../../dataset/fssai_guidelines.json');
    if (fs.existsSync(fssaiPath)) {
      const data = JSON.parse(fs.readFileSync(fssaiPath, 'utf8'));
      return res.status(200).json({ success: true, guidelines: data });
    }
    res.status(200).json({
      success: true,
      guidelines: {
        authority: 'Food Safety and Standards Authority of India (FSSAI)',
        regulations: 'Surplus Food Regulations 2019'
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getImpactMetrics,
  getFssaiGuidelines
};
