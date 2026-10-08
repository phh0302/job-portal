import { Navigate, createBrowserRouter } from 'react-router-dom';
import RequireAuth from './auth/RequireAuth';
import AdminLayout from './layouts/AdminLayout';
import CandidateLayout from './layouts/CandidateLayout';
import AdminAuditPage from './pages/admin/AuditPage';
import AdminCatalogPage from './pages/admin/CatalogPage';
import AdminCompaniesPage from './pages/admin/CompaniesPage';
import AdminContentPage from './pages/admin/ContentPage';
import AdminDashboardPage from './pages/admin/DashboardPage';
import AdminEmailsPage from './pages/admin/EmailsPage';
import AdminJobsPage from './pages/admin/JobsModerationPage';
import AdminReportsPage from './pages/admin/ReportsPage';
import AdminReviewsPage from './pages/admin/ReviewsPage';
import AdminBillingPage from './pages/admin/BillingPage';
import EmployerBillingPage from './pages/employer/BillingPage';
import CandidateReviewsPage from './pages/candidate/ReviewsPage';
import CvBuilderPage from './pages/candidate/CvBuilderPage';
import EmployerReviewsPage from './pages/employer/ReviewsPage';
import AdminUsersPage from './pages/admin/UsersPage';
import JoinCompanyPage from './pages/JoinCompanyPage';
import MessagesPage from './pages/messages/MessagesPage';
import StaticPage from './pages/StaticPage';
import EmployerTeamPage from './pages/employer/TeamPage';
import EmployerLayout from './layouts/EmployerLayout';
import EmployerAccountPage from './pages/employer/AccountPage';
import EmployerApplicationDetailPage from './pages/employer/ApplicationDetailPage';
import EmployerApplicationsPage from './pages/employer/ApplicationsPage';
import { CandidateDetailPage, CandidatesSearchPage } from './pages/employer/CandidatesSearchPage';
import EmployerCompanyPage from './pages/employer/CompanyPage';
import EmployerDashboardPage from './pages/employer/DashboardPage';
import EmployerJobFormPage from './pages/employer/JobFormPage';
import EmployerJobsPage from './pages/employer/JobsPage';
import PublicLayout from './layouts/PublicLayout';
import ApplicationsPage from './pages/candidate/ApplicationsPage';
import FollowedCompaniesPage from './pages/candidate/FollowedCompaniesPage';
import JobAlertsPage from './pages/candidate/JobAlertsPage';
import SavedJobsPage from './pages/candidate/SavedJobsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/candidate/ProfilePage';
import RecommendationsPage from './pages/candidate/RecommendationsPage';
import ResumesPage from './pages/candidate/ResumesPage';
import CompanyDetailPage from './pages/companies/CompanyDetailPage';
import CompanyListPage from './pages/companies/CompanyListPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import JobListPage from './pages/jobs/JobListPage';
import ForbiddenPage from './pages/ForbiddenPage';
import HomePage from './pages/HomePage';
import NotFoundPage from './pages/NotFoundPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import VerifyEmailPage from './pages/auth/VerifyEmailPage';

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/jobs', element: <JobListPage /> },
      { path: '/jobs/:slug', element: <JobDetailPage /> },
      { path: '/companies', element: <CompanyListPage /> },
      { path: '/companies/:slug', element: <CompanyDetailPage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
      { path: '/verify-email', element: <VerifyEmailPage /> },
      { path: '/403', element: <ForbiddenPage /> },
      { path: '/pages/:slug', element: <StaticPage /> },
      { path: '/join-company', element: <JoinCompanyPage /> },

      // Cần đăng nhập (mọi vai trò)
      {
        element: <RequireAuth />,
        children: [
          { path: '/account/change-password', element: <ChangePasswordPage /> },
          { path: '/notifications', element: <NotificationsPage /> },
        ],
      },
      // Theo vai trò
      {
        element: <RequireAuth roles={['CANDIDATE']} />,
        children: [
          {
            path: '/candidate',
            element: <CandidateLayout />,
            children: [
              { index: true, element: <Navigate to="profile" replace /> },
              { path: 'recommendations', element: <RecommendationsPage /> },
              { path: 'profile', element: <ProfilePage /> },
              { path: 'resumes', element: <ResumesPage /> },
              { path: 'applications', element: <ApplicationsPage /> },
              { path: 'messages', element: <MessagesPage side="candidate" /> },
              { path: 'messages/:id', element: <MessagesPage side="candidate" /> },
              { path: 'saved-jobs', element: <SavedJobsPage /> },
              { path: 'followed-companies', element: <FollowedCompaniesPage /> },
              { path: 'job-alerts', element: <JobAlertsPage /> },
              { path: 'reviews', element: <CandidateReviewsPage /> },
              { path: 'cv-builder', element: <CvBuilderPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth roles={['EMPLOYER']} />,
        children: [
          {
            path: '/employer',
            element: <EmployerLayout />,
            children: [
              { index: true, element: <EmployerDashboardPage /> },
              { path: 'jobs', element: <EmployerJobsPage /> },
              { path: 'jobs/new', element: <EmployerJobFormPage /> },
              { path: 'jobs/:id/edit', element: <EmployerJobFormPage /> },
              { path: 'applications', element: <EmployerApplicationsPage /> },
              { path: 'messages', element: <MessagesPage side="employer" /> },
              { path: 'messages/:id', element: <MessagesPage side="employer" /> },
              { path: 'applications/:id', element: <EmployerApplicationDetailPage /> },
              { path: 'candidates', element: <CandidatesSearchPage /> },
              { path: 'candidates/:id', element: <CandidateDetailPage /> },
              { path: 'company', element: <EmployerCompanyPage /> },
              { path: 'team', element: <EmployerTeamPage /> },
              { path: 'reviews', element: <EmployerReviewsPage /> },
              { path: 'billing', element: <EmployerBillingPage /> },
              { path: 'account', element: <EmployerAccountPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireAuth roles={['ADMIN']} />,
        children: [
          {
            path: '/admin',
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              { path: 'jobs', element: <AdminJobsPage /> },
              { path: 'companies', element: <AdminCompaniesPage /> },
              { path: 'reports', element: <AdminReportsPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'catalog', element: <AdminCatalogPage /> },
              { path: 'content', element: <AdminContentPage /> },
              { path: 'emails', element: <AdminEmailsPage /> },
              { path: 'reviews', element: <AdminReviewsPage /> },
              { path: 'billing', element: <AdminBillingPage /> },
              { path: 'audit', element: <AdminAuditPage /> },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
