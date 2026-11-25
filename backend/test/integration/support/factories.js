// Test data helpers. They write through the native MongoDB driver
// (`Model.collection`), not through Mongoose queries, so seeding and reading
// back never run the tenant plugin. That keeps a failure in a test attributable
// to the code under test and not to the harness (TEN-01 breaks every Mongoose
// query on a tenant-scoped model).
const bcrypt = require('bcryptjs');

const DEFAULT_PASSWORD = 'correct-horse-battery';
// Cost 4 keeps seeding fast. The app's own signup still hashes at its real
// cost (12), so the production path stays exercised by the HTTP tests.
const SEED_BCRYPT_COST = 4;

let counter = 0;
const unique = (prefix) => `${prefix}-${Date.now().toString(36)}-${++counter}`;

async function createUser(mongoose, overrides = {}) {
  const now = new Date();
  const doc = {
    name: overrides.name || 'Test User',
    email: (overrides.email || `${unique('user')}@example.test`).toLowerCase(),
    passwordHash: await bcrypt.hash(overrides.password || DEFAULT_PASSWORD, SEED_BCRYPT_COST),
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await mongoose.connection.collection('users').insertOne(doc);
  return { id: insertedId, email: doc.email, password: overrides.password || DEFAULT_PASSWORD };
}

async function createOrganization(mongoose, overrides = {}) {
  const now = new Date();
  const doc = {
    name: overrides.name || unique('Org'),
    plan: 'free',
    settings: { allowSeekerSelfSignup: true },
    createdAt: now,
    updatedAt: now,
  };
  const { insertedId } = await mongoose.connection.collection('organizations').insertOne(doc);
  return { id: insertedId, name: doc.name };
}

async function createMembership(mongoose, { orgId, userId, role = 'org_admin', status = 'active' }) {
  const now = new Date();
  const doc = { orgId, userId, role, status, invitedBy: null, createdAt: now, updatedAt: now };
  const { insertedId } = await mongoose.connection.collection('memberships').insertOne(doc);
  return { id: insertedId, orgId, userId, role, status };
}

// A user who already belongs to a fresh organization.
async function createUserWithOrg(mongoose, { role = 'org_admin', ...userOverrides } = {}) {
  const user = await createUser(mongoose, userOverrides);
  const organization = await createOrganization(mongoose);
  const membership = await createMembership(mongoose, { orgId: organization.id, userId: user.id, role });
  return { user, organization, membership };
}

// Reads a membership straight from the database (native driver) so a test can
// confirm the data exists independently of the code path being tested.
function findMembershipRaw(mongoose, filter) {
  return mongoose.connection.collection('memberships').findOne(filter);
}

module.exports = {
  DEFAULT_PASSWORD,
  createUser,
  createOrganization,
  createMembership,
  createUserWithOrg,
  findMembershipRaw,
};
