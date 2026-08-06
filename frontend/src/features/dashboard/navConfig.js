import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Target,
  Map,
  GraduationCap,
  Mic,
  Settings,
  Users,
  Sparkles,
  BarChart3,
  UserCog,
} from 'lucide-react';

// One nav list per role — Sidebar just renders whichever list matches
// useOrg().role. Keeping this as data (not JSX) means adding a nav item is a
// one-line change, not a markup change.
export const NAV_BY_ROLE = {
  seeker: [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/resumes', label: 'Resumes', icon: FileText },
    { to: '/app/job-matching', label: 'Job Matching', icon: Briefcase },
    { to: '/app/skill-gap', label: 'Skill Gap', icon: Target },
    { to: '/app/career-roadmap', label: 'Career Roadmap', icon: Map },
    { to: '/app/learning', label: 'Learning', icon: GraduationCap },
    { to: '/app/interview/mock', label: 'Mock Interview', icon: Mic },
    { to: '/app/settings/profile', label: 'Profile', icon: Settings },
  ],
  recruiter: [
    { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/app/jobs', label: 'Jobs', icon: Briefcase },
    { to: '/app/candidates', label: 'Candidates', icon: Users },
    { to: '/app/screening', label: 'AI Screening', icon: Sparkles },
    { to: '/app/interview-generator', label: 'Interview Generator', icon: Mic },
    { to: '/app/analytics', label: 'Hiring Analytics', icon: BarChart3 },
    { to: '/app/team', label: 'Team', icon: UserCog },
    { to: '/app/settings/organization', label: 'Org Settings', icon: Settings },
  ],
};
// hiring_manager and org_admin reuse the recruiter nav — capability
// differences within those pages are enforced by RBAC, not by hiding nav items.
NAV_BY_ROLE.hiring_manager = NAV_BY_ROLE.recruiter;
NAV_BY_ROLE.org_admin = NAV_BY_ROLE.recruiter;
NAV_BY_ROLE.interviewer = NAV_BY_ROLE.recruiter;
