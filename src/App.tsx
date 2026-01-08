
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './components/MainLayout';
import AuthLayout from './components/AuthLayout';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { InstallPWA } from './components/InstallPWA';

// Lazy Load Pages
const PlayerHome = React.lazy(() => import('./pages/player/Home'));
const PlayerBookings = React.lazy(() => import('./pages/player/Bookings'));
const PlayerTournaments = React.lazy(() => import('./pages/player/Tournaments'));
const TournamentResults = React.lazy(() => import('./pages/player/TournamentResults'));
const MatchSharePage = React.lazy(() => import('./pages/player/MatchSharePage'));
const PlayerCommunity = React.lazy(() => import('./pages/player/Community'));
const PlayerProfilePage = React.lazy(() => import('./pages/player/Profile'));
const ClubDetails = React.lazy(() => import('./pages/player/ClubDetails'));
const ClubDashboard = React.lazy(() => import('./pages/club/Dashboard'));
const ClubCalendar = React.lazy(() => import('./pages/club/Calendar'));
const TournamentManager = React.lazy(() => import('./pages/club/TournamentManager'));
const TournamentDetail = React.lazy(() => import('./pages/club/TournamentDetail'));
const ClubProfilePage = React.lazy(() => import('./pages/club/Profile'));
const ClubCommunity = React.lazy(() => import('./pages/club/Community'));
const ClubRankings = React.lazy(() => import('./pages/club/Rankings'));
const AdminDashboard = React.lazy(() => import('./pages/admin/Dashboard'));

const PageLoader = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <InstallPWA />
        <NotificationProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Navigate to="/auth/login" replace />} />

                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={<Login />} />
                </Route>

                <Route path="/player" element={
                  <ProtectedRoute allowedRole="player">
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<PlayerHome />} />
                  <Route path="bookings" element={<PlayerBookings />} />
                  <Route path="tournaments" element={<PlayerTournaments />} />
                  <Route path="tournaments/:id" element={<TournamentResults />} />
                  <Route path="tournament/match/:id" element={<MatchSharePage />} />
                  <Route path="community" element={<PlayerCommunity />} />
                  <Route path="profile" element={<PlayerProfilePage />} />
                  <Route path="club/:id" element={<ClubDetails />} />
                </Route>

                <Route path="/club" element={
                  <ProtectedRoute allowedRole="club">
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<ClubDashboard />} />
                  <Route path="calendar" element={<ClubCalendar />} />
                  <Route path="tournaments" element={<TournamentManager />} />
                  <Route path="tournaments/:id" element={<TournamentDetail />} />
                  <Route path="community" element={<ClubCommunity />} />
                  <Route path="rankings" element={<ClubRankings />} />
                  <Route path="profile" element={<ClubProfilePage />} />
                </Route>

                <Route element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
