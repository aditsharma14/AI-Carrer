import { ResponsiveContainer } from 'recharts';
import { Card, CardHeader } from './Card';

// Wraps any recharts chart in the standard card shell (title + description)
// so analytics pages never hand-roll chart card markup. Composes the real
// Card instead of a second hardcoded copy of its shell (see AnalyticsCard.jsx).
export function ChartCard({ title, description, height = 260, children }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
