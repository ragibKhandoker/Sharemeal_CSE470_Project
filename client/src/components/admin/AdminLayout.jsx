import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import ShareMealHelpChatbot from '../common/ShareMealHelpChatbot';
import '../../App.css';

// Figma Vector SVG Icons
const Icons = {
  Brand: () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 1.66699V7.50033C2.5 8.41699 3.25 9.16699 4.16667 9.16699H7.5C7.94203 9.16699 8.36595 8.9914 8.67851 8.67884C8.99107 8.36628 9.16667 7.94235 9.16667 7.50033V1.66699" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5.83301 1.66699V18.3337" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.4997 12.5003V1.66699C16.3946 1.66699 15.3348 2.10598 14.5534 2.88738C13.772 3.66878 13.333 4.72859 13.333 5.83366V10.8337C13.333 11.7503 14.083 12.5003 14.9997 12.5003H17.4997ZM17.4997 12.5003V18.3337" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  Home: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Users: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Ngo: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  ),
  Reports: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Analytics: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Alerts: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  Settings: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Logout: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Bell: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b5d56" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
  FoodThread: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <circle cx="12" cy="2" r="1.5" fill={color} />
      <circle cx="12" cy="22" r="1.5" fill={color} />
    </svg>
  )
};

export const AdminLayout = ({ children, title = 'Users & Staff' }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Profile modal & notification panel states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [foodThreads, setFoodThreads] = useState([]);
  const [notifTab, setNotifTab] = useState('all'); // 'all' | 'threads'
  const [loadingData, setLoadingData] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [otpSentMsg, setOtpSentMsg] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [notifRes, threadRes] = await Promise.all([
        fetch(`${API_BASE_URL}/admin/notifications`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/admin/food-threads`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (notifRes.ok) {
        const notifData = await notifRes.json();
        setNotifications(notifData.notifications || []);
      }
      if (threadRes.ok) {
        const threadData = await threadRes.json();
        const sortedThreads = (threadData.threads || []).sort((a, b) => {
          const timeB = new Date(b.post_created_at || b.created_at || 0).getTime() || 0;
          const timeA = new Date(a.post_created_at || a.created_at || 0).getTime() || 0;
          if (timeB !== timeA) return timeB - timeA;
          return Number(b.post_id || b.id || 0) - Number(a.post_id || a.id || 0);
        });
        setFoodThreads(sortedThreads);
      }
    } catch (err) {
      console.error('Error fetching admin realtime notifications:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const handleNotificationClick = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
    );

    if (notif.link) {
      setShowNotificationPanel(false);
      navigate(notif.link);
      return;
    }

    if (notif.type === 'password_reset_request') {
      setShowNotificationPanel(false);
      navigate('/admin/users?tab=password-requests');
      return;
    }

    if (notif.food_post_id) {
      const matchingThread = foodThreads.find((t) => t.post_id === notif.food_post_id) || notif.lifecycle;
      if (matchingThread) {
        setSelectedThread(matchingThread);
        setSelectedNotification(null);
        return;
      }
    }
    setSelectedNotification(notif);
    setSelectedThread(null);
  };

  const handleThreadSelect = (thread) => {
    setSelectedThread(thread);
    setSelectedNotification(null);
    setShowNotificationPanel(false);
  };

  const unreadCount = notifications.filter((n) => n.unread).length;
  const navItems = [
    { label: 'Home', path: '/admin/dashboard', IconComponent: Icons.Home },
    { label: 'Users', path: '/admin/users', IconComponent: Icons.Users },
    { label: 'Food Post Threads', path: '/admin/food-threads', IconComponent: Icons.FoodThread },
    { label: 'NGO Panel', path: '/admin/ngo-queue', IconComponent: Icons.Ngo },
    { label: 'Food Reports', path: '/admin/reports', IconComponent: Icons.Reports },
    { label: 'Analytics', path: '/admin/analytics', IconComponent: Icons.Analytics },
    { label: 'Bot & Fraud Alerts', path: '/admin/bot-alerts', IconComponent: Icons.Alerts },
    { label: 'Settings', path: '/admin/settings', IconComponent: Icons.Settings }
  ];

  const getInitials = (name) => {
    if (!name) return 'HI';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Mobile drawer: close on Esc or when the window grows to desktop width,
  // and stop the page behind it from scrolling while it is open.
  useEffect(() => {
    if (!isMobileOpen) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setIsMobileOpen(false); };
    const desktop = window.matchMedia('(min-width: 769px)');
    const onResize = (event) => { if (event.matches) setIsMobileOpen(false); };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onResize);
    };
  }, [isMobileOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            left: -272px !important;
            visibility: hidden;
            transition: left 0.3s ease-in-out, visibility 0.3s;
            z-index: 2000 !important;
          }
          .admin-main-viewport {
            margin-left: 0 !important;
          }
          .admin-sidebar.open {
            left: 0 !important;
            visibility: visible;
            box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
          }
          .admin-mobile-hamburger {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .admin-mobile-hamburger {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1999
          }}
        />
      )}

      {/* Figma 256px Sidebar */}
      <aside
        className={`admin-sidebar ${isMobileOpen ? 'open' : ''}`}
        style={{
          width: '256px',
          background: 'linear-gradient(180deg, #172a49 0%, #1c3151 100%)',
          borderRight: '1px solid rgba(10, 22, 40, 0.18)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: '0 0 256px',
          height: '100vh',
          minHeight: '100vh',
          maxHeight: '100vh',
          overflowY: 'auto',
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 100
        }}
      >
        <div>
          {/* Centered Brand Navbar Logo Header */}
          <div
            style={{
              height: '64px',
              padding: '0 24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'var(--brand-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0px 6px 14px rgba(var(--brand-primary-rgb), 0.35)',
                flexShrink: 0
              }}
            >
              <Icons.Brand />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f7f9fc', fontFamily: "'Fraunces', serif", lineHeight: 1 }}>
              ShareMeal
            </span>
          </div>

          {/* Figma Side Nav Tabs */}
          <nav style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const isActive =
                location.pathname === item.path ||
                (item.path === '/admin/reports' && location.pathname === '/admin/food-reports');
              const { IconComponent } = item;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    height: '44px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: 500,
                    boxSizing: 'border-box',
                    transition: 'all 0.15s ease-in-out',
                    background: isActive ? '#3769bd' : 'transparent',
                    color: isActive ? '#ffffff' : '#d5deeb',
                    boxShadow: isActive ? '0px 6px 14px rgba(4, 12, 28, 0.24)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                  }}
                  onMouseOut={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
                      <IconComponent color={isActive ? '#ffffff' : '#bac8dc'} />
                    </div>
                    <span>{item.label}</span>
                  </div>
                  {isActive && <Icons.ChevronRight />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Footer Anchored to Bottom */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: 'auto' }}>
          {/* Interactive Admin Profile Box */}
          <div
            onClick={() => setShowProfileModal(true)}
            style={{
              padding: '10px 12px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 4,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
            title="Click to view email, forget password, and notification settings"
          >
            {/* Centered Initial Avatar */}
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#e0e7ff',
                color: '#3730a3',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {getInitials(user?.name || 'Administrator')}
            </div>

            <div style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f7f9fc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', lineHeight: '18px' }}>
                {user?.name ? user.name.replace(/\s*\(Super Admin\)/i, '') : 'Administrator'}
              </div>
              <div style={{ fontSize: 12, color: '#aebdd2', lineHeight: '16px' }}>Admin</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              height: '40px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: 0,
              background: 'transparent',
              color: '#d5deeb',
              fontSize: 14,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18 }}>
              <Icons.Logout color="#bac8dc" />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="admin-main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', marginLeft: '256px' }}>
        {/* Figma Top Header Bar */}
        <header
          className="dashboard-sticky-header"
          style={{
            width: '100%',
            height: '64px',
            background: '#ffffff',
            borderBottom: '1px solid rgba(44,35,32,0.06)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            boxSizing: 'border-box',
            position: 'relative'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="admin-mobile-hamburger"
              style={{
                background: 'transparent',
                border: 0,
                fontSize: '22px',
                color: '#2c2320',
                cursor: 'pointer',
                padding: 0
              }}
            >
              {isMobileOpen ? '✕' : '☰'}
            </button>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
              {title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto', position: 'relative' }}>
            {/* Notifications Button */}
            <div
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(44,35,32,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Click to view notifications and activity lifecycles"
            >
              <Icons.Bell />
              {unreadCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    left: 24,
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: 700,
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    textAlign: 'center'
                  }}
                >
                  {unreadCount}
                </div>
              )}
            </div>

            {/* Notification Dropdown Panel */}
            {showNotificationPanel && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: 0,
                  width: 'calc(100vw - 32px)',
                  maxWidth: '420px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.18)',
                  border: '1px solid rgba(44,35,32,0.1)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '16px', borderBottom: '1px solid #f0e8e4', background: '#fcf8f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>
                      Realtime Platform Activity
                    </h4>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      style={{ background: 'transparent', border: 0, fontSize: '18px', cursor: 'pointer', color: '#888' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span style={{ fontSize: '12px', color: '#6b5d56' }}>Live Database Activity &amp; Audit Logs</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: '11px',
                          color: 'var(--brand-primary)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: '6px'
                        }}
                      >
                        ✓ Mark All Read
                      </button>
                    )}
                  </div>

                  {/* Filter Tabs */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setNotifTab('all')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: notifTab === 'all' ? 'var(--brand-primary)' : '#efe8e4',
                        color: notifTab === 'all' ? '#ffffff' : '#6b5d56'
                      }}
                    >
                      🔔 Events ({notifications.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifTab('threads')}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        cursor: 'pointer',
                        background: notifTab === 'threads' ? 'var(--brand-primary)' : '#efe8e4',
                        color: notifTab === 'threads' ? '#ffffff' : '#6b5d56'
                      }}
                    >
                      🍲 Food Threads ({foodThreads.length})
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {loadingData && (
                    <div style={{ padding: '24px', textAlign: 'center', color: '#6b5d56', fontSize: '13px' }}>
                      ⏳ Loading realtime activity...
                    </div>
                  )}

                  {!loadingData && notifTab === 'all' && (
                    <>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b5d56', fontSize: '13px' }}>
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              handleNotificationClick(notif);
                              setShowNotificationPanel(false);
                            }}
                            style={{
                              padding: '14px 16px',
                              borderBottom: '1px solid #f7f2ef',
                              background: notif.unread ? '#fff7ed' : '#ffffff',
                              cursor: 'pointer',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                            onMouseOut={(e) => (e.currentTarget.style.background = notif.unread ? '#fff7ed' : '#ffffff')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                              <span style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>{notif.title}</span>
                              <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: 600 }}>{notif.time}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#6b5d56', lineHeight: '16px' }}>{notif.subtitle}</p>
                            <div style={{ marginTop: 8, fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>View Activity Thread Lifecycle →</span>
                            </div>
                          </div>
                        ))
                      )}
                    </>
                  )}

                  {!loadingData && notifTab === 'threads' && (
                    <>
                      {foodThreads.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#6b5d56', fontSize: '13px' }}>
                          No food donation posts found.
                        </div>
                      ) : (
                        foodThreads.map((thread) => {
                          const isDone = thread.total_packets != null && thread.remaining_packets === 0;
                          return (
                            <div
                              key={thread.post_id}
                              onClick={() => handleThreadSelect(thread)}
                              style={{
                                padding: '14px 16px',
                                borderBottom: '1px solid #f7f2ef',
                                background: '#ffffff',
                                cursor: 'pointer',
                                transition: 'background 0.15s'
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                              onMouseOut={(e) => (e.currentTarget.style.background = '#ffffff')}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>
                                  #{thread.post_id} • {thread.food_name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    background: isDone ? '#ecfdf5' : '#fff7ed',
                                    color: isDone ? '#047857' : '#c2410c'
                                  }}
                                >
                                  {isDone ? '✓ Completed' : `${thread.remaining_packets ?? thread.initial_quantity} left`}
                                </span>
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6b5d56', lineHeight: '16px' }}>
                                Donated by {thread.donor.name} • {thread.initial_quantity} portions ({thread.formatted_created_at || 'Recently'})
                              </p>
                              <div style={{ marginTop: 8, fontSize: '11px', color: 'var(--brand-primary)', fontWeight: 700 }}>
                                📋 Inspect Full Lifecycle Thread ({thread.steps.length} Steps) →
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto', background: '#f8fafc' }}>
          {children}
        </main>
      </div>

      {/* Food Post Lifecycle Audit Thread Modal */}
      {selectedThread && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 3000 }}>
          <div style={{ width: '100%', maxWidth: '720px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#2c2320', maxHeight: '90vh', overflowY: 'auto' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', borderBottom: '1px solid #eee5e0', paddingBottom: '14px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#2c2320' }}>
                    🍲 {selectedThread.food_name}
                  </h3>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: selectedThread.total_packets != null && selectedThread.remaining_packets === 0 ? '#ecfdf5' : '#fff7ed',
                      color: selectedThread.total_packets != null && selectedThread.remaining_packets === 0 ? '#047857' : '#c2410c',
                      border: '1px solid currentColor'
                    }}
                  >
                    {selectedThread.total_packets != null && selectedThread.remaining_packets === 0
                      ? '✓ Fully Distributed'
                      : `📢 Distributing (${selectedThread.remaining_packets} of ${selectedThread.total_packets} left)`}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#6b5d56', marginTop: '4px', display: 'block' }}>
                  Food Post #{selectedThread.post_id} • Donated by {selectedThread.donor.name} on {selectedThread.formatted_created_at}
                </span>
              </div>
              <button onClick={() => setSelectedThread(null)} style={{ background: 'transparent', border: 0, fontSize: '22px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {/* Switch Food Post Dropdown Selector */}
            {foodThreads.length > 1 && (
              <div style={{ background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>
                  Switch Food Post Thread:
                </span>
                <select
                  value={selectedThread.post_id}
                  onChange={(e) => {
                    const match = foodThreads.find((t) => t.post_id === Number(e.target.value));
                    if (match) setSelectedThread(match);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    fontWeight: 600,
                    background: '#ffffff',
                    color: '#1e293b',
                    cursor: 'pointer'
                  }}
                >
                  {foodThreads.map((t) => (
                    <option key={t.post_id} value={t.post_id}>
                      #{t.post_id} - {t.food_name} ({t.remaining_packets ?? t.initial_quantity} left)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Key Stakeholders Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '14px', border: '1px solid #f2e7e1' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8d7870', textTransform: 'uppercase' }}>🍲 Donor</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>{selectedThread.donor.name}</div>
                <div style={{ fontSize: '11px', color: '#6b5d56' }}>{selectedThread.donor.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8d7870', textTransform: 'uppercase' }}>🏢 Collecting NGO</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>{selectedThread.ngo.organization_name || selectedThread.ngo.name || 'Awaiting NGO'}</div>
                <div style={{ fontSize: '11px', color: '#6b5d56' }}>{selectedThread.ngo.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8d7870', textTransform: 'uppercase' }}>🛵 Pickup Staff</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>{selectedThread.pickup_staff.name || 'Unassigned'}</div>
                <div style={{ fontSize: '11px', color: '#6b5d56' }}>{selectedThread.pickup_staff.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8d7870', textTransform: 'uppercase' }}>🔬 Hub Inspector</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>{selectedThread.hub_inspection.name || 'Pending Check'}</div>
                <div style={{ fontSize: '11px', color: '#6b5d56' }}>{selectedThread.hub_inspection.phone || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#8d7870', textTransform: 'uppercase' }}>📍 Distribution Point</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>{selectedThread.distribution.pickup_point_name || 'Pending Staging'}</div>
                <div style={{ fontSize: '11px', color: '#6b5d56' }}>{selectedThread.remaining_packets ?? 0} portions left</div>
              </div>
            </div>

            {/* Lifecycle Timeline Thread (Steps 1 to 6) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', position: 'relative', marginBottom: '24px' }}>
              {selectedThread.steps.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const isInProgress = item.status === 'in_progress';
                const circleColor = isCompleted ? '#10b981' : isInProgress ? '#f59e0b' : '#9ca3af';

                return (
                  <div key={item.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                    {/* Vertical connecting line */}
                    {idx < selectedThread.steps.length - 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '13px',
                          top: '26px',
                          bottom: '-16px',
                          width: '2px',
                          background: isCompleted ? '#10b981' : '#e5e7eb'
                        }}
                      />
                    )}

                    {/* Step circle */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: circleColor,
                        color: '#ffffff',
                        fontSize: 12,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 1,
                        boxShadow: `0 2px 6px ${circleColor}50`
                      }}
                    >
                      {isCompleted ? '✓' : item.step}
                    </div>

                    <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, flexWrap: 'wrap', gap: '4px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 800, color: '#111827' }}>
                          Step {item.step}: {item.title || item.label}
                        </span>
                        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>
                          {item.full_date || item.time}
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#4b5563', lineHeight: '18px' }}>
                        {item.detail}
                      </p>

                      {/* Step 6 Beneficiary Handover Log Table */}
                      {item.step === 6 && (
                        <div style={{ marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>📋 Beneficiary Claim &amp; Handover Log ("Who Collected")</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {selectedThread.beneficiary_handovers.length} Records Verified
                            </span>
                          </div>

                          {selectedThread.beneficiary_handovers.length === 0 ? (
                            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', fontSize: '12px', color: '#64748b', textAlign: 'center' }}>
                              No beneficiary handovers recorded yet. Awaiting food seeker claims at distribution point.
                            </div>
                          ) : (
                            <div style={{ overflowX: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Food Seeker</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Phone</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Pickup Code</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Servings</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Handed Over By</th>
                                    <th style={{ padding: '8px 10px', fontWeight: 700 }}>Time</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedThread.beneficiary_handovers.map((h, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{h.receiver_name}</td>
                                      <td style={{ padding: '8px 10px', color: '#475569' }}>{h.receiver_phone}</td>
                                      <td style={{ padding: '8px 10px' }}>
                                        <code style={{ background: '#e0f2fe', color: '#0284c7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, fontSize: '10px' }}>
                                          {h.pickup_code}
                                        </code>
                                      </td>
                                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#ea580c' }}>{h.quantity} pkts</td>
                                      <td style={{ padding: '8px 10px', color: '#475569' }}>{h.staff_name}</td>
                                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{h.time_ago || h.formatted_date}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedThread(null)}
                style={{ background: 'var(--brand-primary)', color: '#ffffff', border: 0, borderRadius: '10px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close Thread Audit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Activity Lifecycle Thread Modal for User Registrations / Generic Notifications */}
      {selectedNotification && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 3000 }}>
          <div style={{ width: '100%', maxWidth: '520px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#2c2320', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee5e0', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2c2320' }}>{selectedNotification.title}</h3>
                <span style={{ fontSize: '12px', color: '#6b5d56' }}>Activity Lifecycle Thread • {selectedNotification.time}</span>
              </div>
              <button onClick={() => setSelectedNotification(null)} style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <p style={{ fontSize: '14px', color: '#2c2320', fontWeight: 600, background: '#fcf8f6', padding: '12px 16px', borderRadius: '12px', border: '1px solid #eee5e0', marginBottom: '20px' }}>
              {selectedNotification.subtitle}
            </p>

            {/* Lifecycle Timeline Thread */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '8px', position: 'relative', marginBottom: '24px' }}>
              {(selectedNotification.thread || []).map((item, idx) => (
                <div key={item.step} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', position: 'relative' }}>
                  {/* Vertical connecting line */}
                  {idx < (selectedNotification.thread || []).length - 1 && (
                    <div style={{ position: 'absolute', left: '13px', top: '26px', bottom: '-16px', width: '2px', background: '#10b981' }} />
                  )}

                  {/* Step status circle */}
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: item.status === 'completed' ? '#10b981' : item.status === 'in_progress' ? '#f59e0b' : '#9ca3af',
                      color: '#ffffff',
                      fontSize: 12,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                      boxShadow: '0 2px 6px rgba(16,185,129,0.4)'
                    }}
                  >
                    {item.status === 'completed' ? '✓' : item.step}
                  </div>

                  <div style={{ flex: 1, background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '12px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827' }}>Step {item.step}: {item.label}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.time}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#4b5563', lineHeight: '16px' }}>{item.detail}</p>
                    {selectedNotification.has_nid_pdf &&
                      (item.label === 'NID Verification' || item.label === 'NID Document Uploaded') && (
                        <a
                          href={`${API_BASE_URL}/admin/nid-document/${selectedNotification.user_id}?token=${encodeURIComponent(token || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: '8px', color: '#059669', fontSize: '12px', fontWeight: 700 }}
                        >
                          📄 View NID document
                        </a>
                      )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {(selectedNotification.type === 'new_donor' || selectedNotification.type === 'new_receiver' || selectedNotification.type === 'nid_submitted' || selectedNotification.type === 'user_message') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedNotification(null);
                    navigate(selectedNotification.type === 'user_message'
                      ? `/admin/users?userId=${selectedNotification.user_id}`
                      : '/admin/users');
                  }}
                  style={{
                    background: '#10b981',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(16,185,129,0.3)'
                  }}
                >
                  {selectedNotification.type === 'user_message' ? '💬 Open User Conversation →' : '👤 Inspect Profile &amp; Verify User →'}
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedNotification(null)}
                style={{ background: 'var(--brand-primary)', color: '#ffffff', border: 0, borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Pop-up Modal when clicking on Admin Profile */}
      {showProfileModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2500 }}>
          <div style={{ width: '100%', maxWidth: '460px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#2c2320' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee5e0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--brand-soft)', color: 'var(--brand-primary-deep)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(user?.name || 'Administrator')}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#2c2320' }}>{user?.name ? user.name.replace(/\s*\(Super Admin\)/i, '') : 'Administrator'}</h3>
                  <span style={{ fontSize: '12px', color: '#6b5d56' }}>Super Admin</span>
                </div>
              </div>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {/* Email Field */}
            <div style={{ background: '#fcf8f6', padding: '14px 16px', borderRadius: '12px', border: '1px solid #eee5e0', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#6b5d56', fontWeight: 600 }}>📧 Gmail Account:</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>{user?.email || 'admin@sharemeal.org'}</span>
            </div>

            {/* Notification On / Off Switch */}
            <div style={{ background: '#fcf8f6', padding: '14px 16px', borderRadius: '12px', border: '1px solid #eee5e0', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', color: '#6b5d56', fontWeight: 600 }}>🔔 Admin Notifications:</span>
              <button
                type="button"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                style={{
                  background: notificationsEnabled ? '#10b981' : '#d1d5db',
                  color: '#ffffff',
                  border: 0,
                  borderRadius: '100px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                {notificationsEnabled ? '✓ Enabled (On)' : '✕ Muted (Off)'}
              </button>
            </div>

            {/* Password reset: admin-assisted */}
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '12px', padding: '14px 16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🔑 Forgot your password?
              </div>
              <p style={{ fontSize: '12px', color: '#7c2d12', margin: 0, lineHeight: 1.5 }}>
                Use <strong>Request Password Reset</strong> on the login page. Another Super Admin approves it and gives you a temporary password; you then set a new one. Admins cannot approve their own requests.
              </p>
            </div>

            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                style={{ background: '#f3f4f6', color: '#374151', border: 0, borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Settings
              </button>
            </div>

          </div>
        </div>
      )}

      <ShareMealHelpChatbot role="admin" />
    </div>
  );
};

export default AdminLayout;
