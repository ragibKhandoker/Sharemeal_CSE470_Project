import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import FoodThreadModal from '../common/FoodThreadModal';
import ShareMealHelpChatbot from '../common/ShareMealHelpChatbot';
import '../../App.css';

// Figma NGO Vector SVG Icons
const NgoIcons = {
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
  Incoming: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Collections: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  PickupPoints: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  ServingLog: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  Requests: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  Payments: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  ),
  Reports: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  Blog: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  Profile: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Logout: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  ChevronRight: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
};

export const NgoLayout = ({ children, title = 'NGO Dashboard' }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching NGO notifications:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleNotificationClick = (notif) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
    );
    if (token && notif.id && !String(notif.id).startsWith('rec_') && !String(notif.id).startsWith('dist_') && !String(notif.id).startsWith('ngo_')) {
      fetch(`${API_BASE_URL}/notifications/${notif.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    }

    if (notif.link) {
      setShowNotificationPanel(false);
      navigate(notif.link);
      return;
    }

    if (notif.lifecycle || notif.thread) {
      const threadData = notif.lifecycle || {
        post_id: notif.food_post_id,
        food_name: notif.title,
        steps: notif.thread,
        donor: { name: 'Community Donor' },
        ngo: { name: user?.name, organization_name: user?.name },
        pickup_staff: {},
        hub_inspection: {},
        distribution: {},
        beneficiary_handovers: []
      };
      setSelectedThread(threadData);
      setShowNotificationPanel(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    if (!token || markingAll) return;
    setMarkingAll(true);
    try {
      const res = await fetch(`${API_BASE_URL}/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentRole = user?.ngo_staff_role || 'admin';

  const allNavItems = [
    { label: 'Home', path: '/ngo/dashboard', IconComponent: NgoIcons.Home, roles: ['admin', 'receiving_staff', 'distributor_staff'] },
    { label: 'Incoming Donations', path: '/ngo/incoming', IconComponent: NgoIcons.Incoming, roles: ['admin', 'receiving_staff'] },
    { label: 'Collection Requests', path: '/ngo/collections', IconComponent: NgoIcons.Collections, roles: ['admin', 'receiving_staff', 'distributor_staff'] },
    { label: 'Pickup Points', path: '/ngo/pickup-points', IconComponent: NgoIcons.PickupPoints, roles: ['admin', 'receiving_staff', 'distributor_staff'] },
    { label: 'Receiver Requests', path: '/ngo/requests', IconComponent: NgoIcons.Requests, roles: ['admin', 'distributor_staff'] },
    { label: 'Serving Log', path: '/ngo/serving-log', IconComponent: NgoIcons.ServingLog, roles: ['admin', 'distributor_staff'] },
    { label: 'Payments', path: '/ngo/payments', IconComponent: NgoIcons.Payments, roles: ['admin'] },
    { label: 'Reports', path: '/ngo/reports', IconComponent: NgoIcons.Reports, roles: ['admin'] },
    { label: 'Home Blog & Stories', path: '/ngo/blogs', IconComponent: NgoIcons.Blog, roles: ['admin'] },
    { label: 'Profile', path: '/ngo/profile', IconComponent: NgoIcons.Profile, roles: ['admin', 'receiving_staff', 'distributor_staff'] }
  ];

  const navItems = allNavItems.filter((item) => item.roles.includes(currentRole));

  const getInitials = (name) => {
    if (!name) return 'AR';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Strictly Bangladeshi name default
  const displayName = user?.name || 'Anisur Rahman';
  const displayInitials = getInitials(displayName);
  const displayRoleLabel =
    user?.ngo_staff_role === 'receiving_staff'
      ? '🚚 Receiving Staff'
      : user?.ngo_staff_role === 'distributor_staff'
      ? '🍲 Distributor Staff'
      : '🛡️ NGO Administrator';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f4f0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .ngo-sidebar {
            position: fixed !important;
            left: -272px !important;
            visibility: hidden;
            transition: left 0.3s ease-in-out, visibility 0.3s;
            z-index: 2000 !important;
          }
          .ngo-main-viewport {
            margin-left: 0 !important;
          }
          .ngo-sidebar.open {
            left: 0 !important;
            visibility: visible;
            box-shadow: 8px 0 24px rgba(0, 0, 0, 0.25);
          }
          .ngo-mobile-toggle {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .ngo-mobile-toggle {
            display: none !important;
          }
        }
      `}</style>

      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            zIndex: 1999
          }}
        />
      )}

      {/* 256px Left Sidebar matching Figma */}
      <aside
        className={`ngo-sidebar ${isMobileOpen ? 'open' : ''}`}
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
          {/* Brand Header */}
          <div
            style={{
              height: '64px',
              padding: '0 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
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
              <NgoIcons.Brand />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f7f9fc', fontFamily: "'Fraunces', serif" }}>
              ShareMeal
            </span>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
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
                  {isActive && <NgoIcons.ChevronRight />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout Footer */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: 'auto' }}>
          <div
            onClick={() => navigate('/ngo/profile')}
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
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ffedd5',
                color: '#c2410c',
                fontWeight: 700,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {displayInitials}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#f7f9fc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '12px', color: '#aebdd2', fontWeight: 500 }}>{displayRoleLabel}</div>
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
              <NgoIcons.Logout color="#bac8dc" />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="ngo-main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', marginLeft: '256px' }}>
        {/* Top Header Bar */}
        <header
          className="dashboard-sticky-header"
          style={{
            height: '64px',
            background: '#ffffff',
            borderBottom: '1px solid rgba(44, 35, 32, 0.06)',
            padding: '0 28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="ngo-mobile-toggle"
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
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
              {title}
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
            {/* Notification Bell */}
            <div
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(44, 35, 32, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#6b5d56'
              }}
              title="Notifications"
            >
              <NgoIcons.Incoming color="#6b5d56" />
              {unreadCount > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 5px rgba(var(--brand-primary-rgb), 0.4)'
                  }}
                >
                  {unreadCount}
                </div>
              )}
            </div>

            {/* NGO Notification Dropdown Panel */}
            {showNotificationPanel && (
              <div
                style={{
                  position: 'absolute',
                  top: '52px',
                  right: 0,
                  width: 'calc(100vw - 32px)',
                  maxWidth: '360px',
                  background: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                  border: '1px solid rgba(44,35,32,0.08)',
                  zIndex: 1000,
                  overflow: 'hidden'
                }}
              >
                <div style={{ padding: '16px', borderBottom: '1px solid #f0e8e4', background: '#fcf8f6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>NGO Notifications</h4>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      style={{ background: 'transparent', border: 0, fontSize: '18px', cursor: 'pointer', color: '#888' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b5d56' }}>Pickup &amp; Collection Updates</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        disabled={markingAll}
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
                        {markingAll ? 'Marking...' : '✓ Mark All as Seen'}
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '32px', textAlign: 'center', color: '#9a8d85', fontSize: '13px' }}>
                      <div style={{ fontSize: '28px', marginBottom: 8 }}>🔔</div>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        style={{
                          padding: '14px 16px',
                          borderBottom: '1px solid #f7f2ef',
                          background: notif.is_read ? '#ffffff' : '#fff7ed',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>{notif.title || 'Notification'}</span>
                          <span style={{ fontSize: '11px', color: '#9a3412', fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 8 }}>
                            {notif.time || (notif.created_at ? new Date(notif.created_at).toLocaleDateString() : '')}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 8px', fontSize: '12px', color: '#6b5d56', lineHeight: '16px' }}>{notif.subtitle || notif.message}</p>

                        {/* 5-Stage Staff Progress Bar */}
                        {notif.progress_bar && (
                          <div style={{ marginTop: '8px', marginBottom: '8px', background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '6px', display: 'flex', justifyContent: 'space-between' }}>
                              <span>Status Flow:</span>
                              <span style={{ color: '#ea580c', fontWeight: 800 }}>{notif.progress_bar.current_label}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                              {notif.progress_bar.stages.map((stage, sIdx) => {
                                const isDone = stage.completed;
                                const isCurrent = stage.step === notif.progress_bar.current_step;
                                const barColor = isDone ? '#10b981' : isCurrent ? '#f59e0b' : '#e2e8f0';

                                return (
                                  <React.Fragment key={stage.step}>
                                    <div
                                      title={stage.label}
                                      style={{
                                        flex: 1,
                                        height: '6px',
                                        borderRadius: '3px',
                                        background: barColor,
                                        transition: 'all 0.3s'
                                      }}
                                    />
                                    {sIdx < notif.progress_bar.stages.length - 1 && (
                                      <span style={{ fontSize: '9px', color: '#94a3b8' }}>›</span>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginTop: '5px' }}>
                              <span>Accepted</span>
                              <span>Assigned</span>
                              <span>Picked Up</span>
                              <span>At Hub</span>
                              <span>Distributing</span>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {(notif.thread || notif.lifecycle) && (
                            <span style={{ fontSize: '10px', background: 'var(--brand-soft)', color: '#ea580c', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              🍲 View Food Thread →
                            </span>
                          )}
                          {notif.link && (
                            <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              🔑 Open Reset Link →
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Profile Avatar Pill */}
            <Link
              to="/ngo/profile"
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: '#ffe8e0',
                color: 'var(--brand-primary-dark)',
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                cursor: 'pointer'
              }}
              title="Profile Settings"
            >
              {displayInitials}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#f7f4f0' }}>
          {children}
        </main>
      </div>

      {/* Food Post Lifecycle Thread Modal */}
      {selectedThread && (
        <FoodThreadModal
          selectedThread={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
      <ShareMealHelpChatbot role="ngo" />
    </div>
  );
};

export default NgoLayout;
