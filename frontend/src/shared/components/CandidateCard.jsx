import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './Card';
import { Badge } from './Badge';

function scoreVariant(score) {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

// Used in the Candidates grid view and Candidate Comparison page — anywhere
// a candidate needs to be scanned visually rather than read row-by-row in a table.
// memo()'d for the same reason as JobCard: renders in a scrollable grid where
// unrelated parent state (sort filter, selection count) shouldn't re-render
// every card, only the one(s) whose props actually changed.
export const CandidateCard = memo(function CandidateCard({ candidate, selected, onToggleSelect }) {
  return (
    <Card variant="interactive" className="relative">
      {onToggleSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(candidate.id)}
          className="absolute right-4 top-4 h-4 w-4 rounded border-slate-300"
        />
      )}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
          {candidate.name[0]?.toUpperCase()}
        </div>
        <div>
          <Link to={`/app/candidates/${candidate.id}`} className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
            {candidate.name}
          </Link>
          <p className="text-xs text-slate-500">{candidate.headline}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <Badge variant={scoreVariant(candidate.score)}>{candidate.score}% match</Badge>
        {candidate.rank && <span className="text-xs text-slate-400">Rank #{candidate.rank}</span>}
      </div>

      {candidate.topSkills?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.topSkills.slice(0, 4).map((skill) => (
            <Badge key={skill} variant="neutral">{skill}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
});
