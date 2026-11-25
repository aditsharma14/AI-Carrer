// The integration harness empties every collection in the database it is
// pointed at before each test. That is only acceptable on a database created for
// the purpose, so it refuses to run against anything else.

const REQUIRED_SUFFIX = '_integration';

function databaseNameFromUri(uri) {
  // mongodb://host:port/dbname?options  or  mongodb+srv://user:pw@host/dbname?options
  const match = /^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]*)/.exec(uri || '');
  return match ? decodeURIComponent(match[1]) : '';
}

function assertSafeIntegrationUri(uri) {
  if (!uri) {
    throw new Error(
      'INTEGRATION_MONGODB_URI is not set. Integration tests need a real MongoDB; see docs/INTEGRATION_TESTING.md. ' +
        `Example: mongodb://localhost:27017/ai_career${REQUIRED_SUFFIX}?directConnection=true`
    );
  }
  const name = databaseNameFromUri(uri);
  if (!name.endsWith(REQUIRED_SUFFIX)) {
    throw new Error(
      `Refusing to run integration tests: the database name "${name}" must end with "${REQUIRED_SUFFIX}" ` +
        'because the harness deletes all data in it.'
    );
  }
  return name;
}

module.exports = { assertSafeIntegrationUri, databaseNameFromUri, REQUIRED_SUFFIX };
