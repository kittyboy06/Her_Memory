import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Timeline from './pages/Timeline';
import Diary from './pages/Diary';
import Gallery from './pages/Gallery';
import MoodTracker from './pages/MoodTracker';
import Chat from './pages/Chat';
import Favorites from './pages/Favorites';
import Poems from './pages/Poems';
import Settings from './pages/Settings';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="login-page"><div className="login-card"><div className="login-heart">🔒</div><p>Loading...</p></div></div>;
  return user ? children : <Navigate to="/login" />;
}

function OwnerOnlyRoute({ children }) {
  const { isOwner } = useAuth();
  return isOwner ? children : <Navigate to="/" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/mood" element={<MoodTracker />} />
              <Route path="/chat" element={<OwnerOnlyRoute><Chat /></OwnerOnlyRoute>} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/poems" element={<Poems />} />
              <Route path="/settings" element={<OwnerOnlyRoute><Settings /></OwnerOnlyRoute>} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  );
}
