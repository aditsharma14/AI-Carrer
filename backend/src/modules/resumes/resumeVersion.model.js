const { Schema, model } = require('mongoose');
const tenantScopePlugin = require('../../plugins/tenantScope.plugin');

// Append-only — a resume edit or re-parse creates a NEW version document, it
// never mutates an old one. Kept separate from Resume itself because version
// history can grow large (rawText especially) and most reads (the resume
// list page) only need Resume's small summary fields, not this content.
const resumeVersionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    resumeId: { type: Schema.Types.ObjectId, ref: 'Resume', required: true, index: true },
    rawText: { type: String, default: null }, // only populated for uploaded files
    structuredData: {
      summary: { type: String, default: '' },
      skills: { type: [String], default: [] },
      experience: [
        {
          title: String,
          company: String,
          startDate: String,
          endDate: String,
          description: String,
        },
      ],
      education: [
        {
          school: String,
          degree: String,
          year: String,
        },
      ],
    },
    // What the parse-time defenses found (ai/services/resumeParser.service.js).
    // `suspicious` means text that read as an instruction to an AI was removed
    // before parsing; recruiters should treat such a resume with care. Defaults
    // to clean so versions created before this field existed read as unflagged.
    security: {
      suspicious: { type: Boolean, default: false },
      rules: { type: [String], default: [] },
      redactions: { type: Number, default: 0 },
      droppedSkills: { type: [String], default: [] },
    },
    // Denormalized cache of the most recent ATS score for this version, kept
    // here (instead of a separate AtsScore collection, which isn't part of
    // this project's existing file scaffold) so the dashboard widget and
    // resume detail page can read it with zero extra queries. The full
    // history of every scoring run still exists — as AiJob documents with
    // type: 'ats-score' — this is only a "latest" cache, not the source of truth.
    latestAtsScore: {
      score: Number,
      breakdown: [{ label: String, value: Number }],
      missingKeywords: [String],
      targetJobId: { type: Schema.Types.ObjectId, ref: 'Job', default: null },
      computedAt: Date,
    },
  },
  { timestamps: true }
);

resumeVersionSchema.index({ orgId: 1, resumeId: 1, createdAt: -1 });

resumeVersionSchema.plugin(tenantScopePlugin);

module.exports = model('ResumeVersion', resumeVersionSchema);
