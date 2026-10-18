// Log Model for Audit Trail & Transaction History

const mongoose = require('mongoose');
const { isMongoConnected } = require('../config/db');
const embeddedStore = require('../services/embeddedStore');

const LogSchema = new mongoose.Schema({
  listingId: String,
  listingCode: String,
  action: {
    type: String,
    required: true
  },
  fromStatus: String,
  toStatus: String,
  actorRole: String,
  actorName: String,
  actorId: String,
  note: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const MongoLog = mongoose.model('Log', LogSchema);

const LogModel = {
  find: async (query = {}, options = {}) => {
    if (isMongoConnected()) {
      let q = MongoLog.find(query);
      if (options.sort) q = q.sort(options.sort);
      if (options.limit) q = q.limit(options.limit);
      return await q.exec();
    }
    const results = await embeddedStore.Logs.find(query);
    results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    if (options.limit) return results.slice(0, options.limit);
    return results;
  },
  create: async (doc) => {
    if (isMongoConnected()) {
      return await MongoLog.create(doc);
    }
    return await embeddedStore.Logs.create(doc);
  }
};

module.exports = LogModel;
