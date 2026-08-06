// Cursor pagination over (createdAt, _id) instead of skip/limit.
//
// Why this matters: `Model.find().skip(10000).limit(20)` makes MongoDB walk
// past 10,000 documents before it can return the next 20 — that walk gets
// slower the deeper a tenant scrolls. A cursor encodes "the last document you
// saw" and the next query is `WHERE createdAt < lastSeen.createdAt`, which an
// index on createdAt serves directly, no walking required, regardless of depth.

function encodeCursor(doc) {
  if (!doc) return null;
  const payload = JSON.stringify({ createdAt: doc.createdAt, id: String(doc._id) });
  return Buffer.from(payload, 'utf8').toString('base64url');
}

function decodeCursor(cursor) {
  if (!cursor) return null;
  const payload = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  return { createdAt: new Date(payload.createdAt), id: payload.id };
}

// Build the Mongo filter for "give me the page after this cursor."
// Tie-broken by _id in case two documents share the same createdAt millisecond.
function cursorFilter(cursor) {
  const decoded = decodeCursor(cursor);
  if (!decoded) return {};
  return {
    $or: [
      { createdAt: { $lt: decoded.createdAt } },
      { createdAt: decoded.createdAt, _id: { $lt: decoded.id } },
    ],
  };
}

// Repositories fetch `limit + 1` documents; this turns that into a page plus
// "is there more." Fetching one extra row is cheaper than a separate COUNT query.
function buildPage(docs, limit) {
  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  return {
    items: page,
    nextCursor: hasMore ? encodeCursor(page[page.length - 1]) : null,
  };
}

module.exports = { encodeCursor, decodeCursor, cursorFilter, buildPage };
