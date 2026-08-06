import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RootLayout } from './RootLayout';
import { DashboardLayout } from './DashboardLayout';
import { RequireAuth } from './guards/RequireAuth';
import { RequireOrgContext } from './guards/RequireOrgContext';
import { RequireRole } from './guards/RequireRole';
import { PageLoader } from '../shared/components/PageLoader';

// Every page is its own chunk instead of one ~1MB bundle — a seeker only
// ever downloads seeker pages, a recruiter only recruiter pages, and nobody
// downloads all ~30 pages just to see the login screen. Layouts/guards stay
// eager (tiny, needed immediately); only route content is lazy.
const LandingPage = lazy(() => import('../features/public/LandingPage').then((m) => ({ default: m.LandingPage })));
const FeaturesPage = lazy(() => import('../features/public/FeaturesPage').then((m) => ({ default: m.FeaturesPage })));
const PricingPage = lazy(() => import('../features/public/PricingPage').then((m) => ({ default: m.PricingPage })));
const AboutPage = lazy(() => import('../features/public/AboutPage').then((m) => ({ default: m.AboutPage })));
const LoginPage = lazy(() => import('../features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('../features/auth/SignupPage').then((m) => ({ default: m.SignupPage })));

const Dashboard = lazy(() => import('../features/dashboard/Dashboard').then((m) => ({ default: m.Dashboard })));

const ResumeListPage = lazy(() => import('../features/resumes/ResumeListPage').then((m) => ({ default: m.ResumeListPage })));
const ResumeBuilderPage = lazy(() => import('../features/resumes/ResumeBuilderPage').then((m) => ({ default: m.ResumeBuilderPage })));
const ResumeDetailPage = lazy(() => import('../features/resumes/ResumeDetailPage').then((m) => ({ default: m.ResumeDetailPage })));
const JobListPage = lazy(() => import('../features/job-matching/JobListPage').then((m) => ({ default: m.JobListPage })));
const JobDetailPage = lazy(() => import('../features/job-matching/JobDetailPage').then((m) => ({ default: m.JobDetailPage })));
const SkillGapPage = lazy(() => import('../features/skill-gap/SkillGapPage').then((m) => ({ default: m.SkillGapPage })));
const CareerRoadmapPage = lazy(() => import('../features/career-roadmap/CareerRoadmapPage').then((m) => ({ default: m.CareerRoadmapPage })));
const LearningRecommendationsPage = lazy(() => import('../features/learning/LearningRecommendationsPage').then((m) => ({ default: m.LearningRecommendationsPage })));
const MockInterviewPage = lazy(() => import('../features/interview/MockInterviewPage').then((m) => ({ default: m.MockInterviewPage })));
const MockInterviewSessionPage = lazy(() => import('../features/interview/MockInterviewSessionPage').then((m) => ({ default: m.MockInterviewSessionPage })));
const InterviewFeedbackPage = lazy(() => import('../features/interview/InterviewFeedbackPage').then((m) => ({ default: m.InterviewFeedbackPage })));
const ProfileSettingsPage = lazy(() => import('../features/profile/ProfileSettingsPage').then((m) => ({ default: m.ProfileSettingsPage })));

const JobsListPage = lazy(() => import('../features/jobs/JobsListPage').then((m) => ({ default: m.JobsListPage })));
const JobFormPage = lazy(() => import('../features/jobs/JobFormPage').then((m) => ({ default: m.JobFormPage })));
const JobPostingDetailPage = lazy(() => import('../features/jobs/JobPostingDetailPage').then((m) => ({ default: m.JobPostingDetailPage })));
const CandidateRankingPage = lazy(() => import('../features/candidate-ranking/CandidateRankingPage').then((m) => ({ default: m.CandidateRankingPage })));
const CandidateComparisonPage = lazy(() => import('../features/candidate-ranking/CandidateComparisonPage').then((m) => ({ default: m.CandidateComparisonPage })));
const CandidateDetailsPage = lazy(() => import('../features/candidate-ranking/CandidateDetailsPage').then((m) => ({ default: m.CandidateDetailsPage })));
const AiScreeningPage = lazy(() => import('../features/screening/AiScreeningPage').then((m) => ({ default: m.AiScreeningPage })));
const InterviewGeneratorPage = lazy(() => import('../features/interview/InterviewGeneratorPage').then((m) => ({ default: m.InterviewGeneratorPage })));
const HiringAnalyticsPage = lazy(() => import('../features/analytics/HiringAnalyticsPage').then((m) => ({ default: m.HiringAnalyticsPage })));
const TeamManagementPage = lazy(() => import('../features/team/TeamManagementPage').then((m) => ({ default: m.TeamManagementPage })));
const OrgSettingsPage = lazy(() => import('../features/organizations/OrgSettingsPage').then((m) => ({ default: m.OrgSettingsPage })));

const RECRUITER_ROLES = ['recruiter', 'hiring_manager', 'org_admin', 'interviewer'];

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Authenticated app */}
          <Route element={<RequireAuth />}>
            <Route element={<RequireOrgContext />}>
              <Route path="/app" element={<DashboardLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Job seeker */}
                <Route path="resumes" element={<ResumeListPage />} />
                <Route path="resumes/new" element={<ResumeBuilderPage />} />
                <Route path="resumes/:resumeId" element={<ResumeDetailPage />} />
                <Route path="job-matching" element={<JobListPage />} />
                <Route path="job-matching/:jobId" element={<JobDetailPage />} />
                <Route path="skill-gap" element={<SkillGapPage />} />
                <Route path="career-roadmap" element={<CareerRoadmapPage />} />
                <Route path="learning" element={<LearningRecommendationsPage />} />
                <Route path="interview/mock" element={<MockInterviewPage />} />
                <Route path="interview/mock/:sessionId" element={<MockInterviewSessionPage />} />
                <Route path="interview/feedback/:sessionId" element={<InterviewFeedbackPage />} />
                <Route path="settings/profile" element={<ProfileSettingsPage />} />

                {/* Recruiter / hiring side */}
                <Route element={<RequireRole roles={RECRUITER_ROLES} />}>
                  <Route path="jobs" element={<JobsListPage />} />
                  <Route path="jobs/new" element={<JobFormPage />} />
                  <Route path="jobs/:jobId" element={<JobPostingDetailPage />} />
                  <Route path="candidates" element={<CandidateRankingPage />} />
                  <Route path="candidates/compare" element={<CandidateComparisonPage />} />
                  <Route path="candidates/:candidateId" element={<CandidateDetailsPage />} />
                  <Route path="screening" element={<AiScreeningPage />} />
                  <Route path="interview-generator" element={<InterviewGeneratorPage />} />
                  <Route path="analytics" element={<HiringAnalyticsPage />} />
                  <Route path="team" element={<TeamManagementPage />} />
                  <Route path="settings/organization" element={<OrgSettingsPage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
