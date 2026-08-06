import { AtsScoreWidget } from '../ats-scoring/AtsScoreWidget';
import { SkillGapWidget } from '../coaching/SkillGapWidget';
import { LearningRecsWidget } from '../learning/LearningRecsWidget';
import { RecruiterOverviewWidget } from '../analytics/RecruiterOverviewWidget';

// Data, not JSX — Dashboard.jsx just maps over whichever list matches the
// active role. Each widget fetches its own data independently (see
// docs/ARCHITECTURE.md §2.3), so adding/reordering a widget here never
// touches a shared "dashboard data" object.
export const WIDGETS_BY_ROLE = {
  seeker: [AtsScoreWidget, SkillGapWidget, LearningRecsWidget],
  recruiter: [RecruiterOverviewWidget],
};
WIDGETS_BY_ROLE.hiring_manager = WIDGETS_BY_ROLE.recruiter;
WIDGETS_BY_ROLE.org_admin = WIDGETS_BY_ROLE.recruiter;
WIDGETS_BY_ROLE.interviewer = WIDGETS_BY_ROLE.recruiter;
