const mongoose = require('mongoose');
const env = require('./env');
const logger = require('./logger');

async function connectDb() {
  // strictQuery: querying a field that isn't in the schema throws instead of
  // silently returning nothing — catches typos in repository queries at dev
  // time instead of "why is this list always empty in production."
  mongoose.set('strictQuery', true);

  await mongoose.connect(env.mongoUri);

  // Mask credentials before logging — "mongodb://user:pass@host" must never
  // end up in a log aggregator in plain text.
  const safeUri = env.mongoUri.replace(/\/\/[^@]*@/, '//***@');
  logger.info('mongodb connected', { uri: safeUri });

  return mongoose.connection;
}

async function disconnectDb() {
  await mongoose.disconnect();
}

module.exports = { connectDb, disconnectDb, mongoose };
