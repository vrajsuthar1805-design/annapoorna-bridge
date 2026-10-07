const FoodListing = require('../models/FoodListing');
const User = require('../models/User');

/**
 * @desc    Get platform-wide impact analytics for SDG 2 & SDG 11
 * @route   GET /api/analytics/impact
 * @access  Public
 */
const getImpactMetrics = async (req, res, next) => {
  try {
    const listings = await FoodListing.find({});
    const totalUsers = await User.countDocuments({});
    const verifiedDonors = await User.countDocuments({ role: 'donor', isVerified: true });
    const verifiedNgos = await User.countDocuments({ role: 'ngo', isVerified: true });

    let totalMeals = 0;
    let totalKgRescued = 0;
    let totalCo2Avoided = 0;

    const statusCounts = {
      available: 0,
      claimed: 0,
      in_transit: 0,
      delivered: 0,
      expired: 0,
    };

    const cityStats = {};
    const dietaryStats = {
      veg: { count: 0, meals: 0 },
      'non-veg': { count: 0, meals: 0 },
    };

    listings.forEach((item) => {
      // Status counting
      if (statusCounts[item.status] !== undefined) {
        statusCounts[item.status]++;
      }

      // Compute weight and meal metrics
      let itemPlates = item.quantityValue;
      let itemKg = item.quantityValue;

      if (item.quantityUnit === 'kg') {
        itemPlates = Math.round(item.quantityValue * 2.5); // 2.5 plates per kg
      } else {
        itemKg = +(item.quantityValue * 0.4).toFixed(1); // 400g per plate
      }

      // Count towards rescued if claimed, in_transit, or delivered
      if (['claimed', 'in_transit', 'delivered'].includes(item.status)) {
        totalMeals += itemPlates;
        totalKgRescued += itemKg;
        totalCo2Avoided += +(itemKg * 2.5).toFixed(1); // 1kg food waste ~ 2.5kg CO2e
      }

      // City aggregation
      const city = item.pickupCity ? item.pickupCity.trim() : 'Unknown';
      if (!cityStats[city]) {
        cityStats[city] = { listings: 0, meals: 0, kgRescued: 0 };
      }
      cityStats[city].listings++;
      if (['claimed', 'in_transit', 'delivered'].includes(item.status)) {
        cityStats[city].meals += itemPlates;
        cityStats[city].kgRescued += itemKg;
      }

      // Dietary aggregation
      const diet = item.dietaryType || 'veg';
      if (dietaryStats[diet]) {
        dietaryStats[diet].count++;
        dietaryStats[diet].meals += itemPlates;
      }
    });

    res.json({
      success: true,
      sdgGoals: {
        sdg2: 'UN SDG 2: Zero Hunger - Surplus Food Redistribution',
        sdg11: 'UN SDG 11: Sustainable Cities & Communities - Zero Urban Food Waste',
      },
      summary: {
        totalMealsServed: Math.round(totalMeals),
        totalKgRescued: Math.round(totalKgRescued),
        co2DivertedKg: Math.round(totalCo2Avoided),
        activeAvailableListings: statusCounts.available,
        totalRescuesCompleted: statusCounts.delivered,
        totalUsers,
        verifiedDonors,
        verifiedNgos,
      },
      statusDistribution: statusCounts,
      cityDistribution: cityStats,
      dietaryDistribution: dietaryStats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getImpactMetrics,
};
