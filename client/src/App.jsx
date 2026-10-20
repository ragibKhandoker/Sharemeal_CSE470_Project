import React from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DisplayModeProvider } from './context/DisplayModeContext';
import Navbar from './components/common/Navbar';
import ScrollToTop from './components/common/ScrollToTop';
import AppRoutes from './routes/AppRoutes';

const AppLayout = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/ngo/login', '/ngo-portal', '/request-password-reset', '/reset-message', '/set-new-password'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname.startsWith('/super-admin');
  const isDashboardPage = location.pathname.startsWith('/donor') || location.pathname.startsWith('/ngo') || location.pathname.startsWith('/receiver');
  const isHomePage = location.pathname === '/';
  const isStoriesPage = location.pathname === '/stories' || location.pathname.startsWith('/stories/') || location.pathname.startsWith('/story');
  const isPublicPageWithOwnNavbar = ['/find-food', '/donate'].includes(location.pathname);
  const isStaticSupportPage = ['/help', '/help-centre', '/safety', '/safety-protocols', '/privacy', '/privacy-policy', '/terms', '/terms-of-service'].includes(location.pathname);

  if (isAuthPage || isAdminPage || isDashboardPage || isHomePage || isStoriesPage || isPublicPageWithOwnNavbar || isStaticSupportPage) {
    return <AppRoutes />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1">
        <AppRoutes />
      </main>
      <footer style={{ background: '#ffffff', color: '#8c7e77', padding: '24px 20px', textAlign: 'center', fontSize: '13px', borderTop: '1px solid #eee5e0' }}>
        &copy; {new Date().getFullYear()} ShareMeal Food Donation Platform. All rights reserved.
      </footer>
    </div>
  );
};

export const App = () => {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <DisplayModeProvider>
          <AppLayout />
        </DisplayModeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
