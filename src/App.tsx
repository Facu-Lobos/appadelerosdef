
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastProvider } from './context/ToastContext';
import MainLayout from './components/MainLayout';
import AuthLayout from './components/AuthLayout';
import Login from './pages/Login';

// Placeholder components for now
import PlayerHome from './pages/player/Home';
import PlayerBookings from './pages/player/Bookings';
import PlayerTournaments from './pages/player/Tournaments';
import PlayerCommunity from './pages/player/Community';
import PlayerProfilePage from './pages/player/Profile';
import ClubDetails from './pages/player/ClubDetails';
import ClubDashboard from './pages/club/Dashboard';
import ClubCalendar from './pages/club/Calendar';
import TournamentManager from './pages/club/TournamentManager';
import TournamentDetail from './pages/club/TournamentDetail';
import ClubProfilePage from './pages/club/Profile';
import ClubCommunity from './pages/club/Community';
import ClubRankings from './pages/club/Rankings';
import AdminDashboard from './pages/admin/Dashboard';

import { ProtectedRoute } from './components/ProtectedRoute';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <NotificationProvider>
          <BrowserRouter>
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
                <Route path="community" element={<PlayerCommunity />} />
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

              <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
          </BrowserRouter>
        </NotificationProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
