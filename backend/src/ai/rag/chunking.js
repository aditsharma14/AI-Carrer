// Chunk along EXISTING structure, not fixed-size token windows — a resume
// already has natural boundaries (one chunk per experience entry, one for
// skills) and arbitrary 500-token chunking would split a single job's
// bullet points mid-thought for no benefit. See docs/ARCHITECTURE.md §6.2.

function chunkResume(structuredData) {
  const chunks = [];

  if (structuredData.summary) {
    chunks.push({ type: 'summary', text: structuredData.summary });
  }
  if (structuredData.skills?.length) {
    chunks.push({ type: 'skills', text: `Skills: ${structuredData.skills.join(', ')}` });
  }
  for (const exp of structuredData.experience || []) {
    chunks.push({
      type: 'experience',
      text: `${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'}): ${exp.description || ''}`,
    });
  }
  for (const edu of structuredData.education || []) {
    chunks.push({ type: 'education', text: `${edu.degree}, ${edu.school} (${edu.year || ''})` });
  }

  return chunks;
}

// Groups a flat message list into user+assistant turn-pairs — the natural
// unit of "one exchange" in a coaching conversation, each becoming one
// retrievable chunk with its own timestamp for recency reranking later.
function chunkConversation(messages) {
  const chunks = [];
  for (let i = 0; i < messages.length; i += 2) {
    const pair = messages.slice(i, i + 2);
    chunks.push({
      type: 'conversation_turn',
      text: pair.map((m) => `${m.role}: ${m.text}`).join('\n'),
      createdAt: pair[0]?.createdAt,
    });
  }
  return chunks;
}

module.exports = { chunkResume, chunkConversation };
