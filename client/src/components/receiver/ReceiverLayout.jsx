import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import RequestThreadModal from './RequestThreadModal';
import ShareMealHelpChatbot from '../common/ShareMealHelpChatbot';
import '../../App.css';

// Figma Receiver Vector Icons
const ReceiverIcons = {
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
  FindFood: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  MyRequests: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  Wallet: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
      <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
    </svg>
  ),
  Cart: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  ),
  History: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  ),
  Ratings: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  ),
  Profile: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Notifications: ({ color = "currentColor" }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

export const ReceiverLayout = ({ children, title = 'Receiver Dashboard' }) => {
  const { user, token, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
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
      console.error('Error fetching receiver notifications:', err);
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
    if (token && notif.id && !String(notif.id).startsWith('rec_')) {
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

    if (notif.thread) {
      setSelectedRequest(notif);
      setShowNotificationPanel(false);
    }
  };

  const handleLeaveReview = (e, notif) => {
    e.stopPropagation();
    setShowNotificationPanel(false);
    navigate(`/receiver/ratings?post_id=${notif.food_post_id}&target_id=${notif.donor_id || ''}`);
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

  const navItems = [
    { label: 'Home', path: '/receiver/dashboard', IconComponent: ReceiverIcons.Home },
    { label: 'Find Food', path: '/receiver/find-food', IconComponent: ReceiverIcons.FindFood },
    { label: 'Cart & Wishlist', path: '/receiver/cart', IconComponent: ReceiverIcons.Cart },
    { label: 'Wallet', path: '/receiver/wallet', IconComponent: ReceiverIcons.Wallet },
    { label: 'My Requests', path: '/receiver/my-requests', IconComponent: ReceiverIcons.MyRequests },
    { label: 'History', path: '/receiver/history', IconComponent: ReceiverIcons.History },
    { label: 'Ratings', path: '/receiver/ratings', IconComponent: ReceiverIcons.Ratings },
    { label: 'Profile', path: '/receiver/profile', IconComponent: ReceiverIcons.Profile }
  ];

  const getInitials = (name) => {
    if (!name) return 'RA';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Strictly Bangladeshi name default
  const displayName = user?.name || 'Rahim Ahmed';
  const displayInitials = getInitials(displayName);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f4f0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .receiver-sidebar {
            position: fixed !important;
            left: -256px;
            transition: left 0.3s ease-in-out;
            z-index: 2000;
          }
          .receiver-main-viewport {
            margin-left: 0 !important;
          }
          .receiver-sidebar.open {
            left: 0 !important;
          }
          .receiver-mobile-toggle {
            display: flex !important;
          }
        }
        @media (min-width: 769px) {
          .receiver-mobile-toggle {
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
        className={`receiver-sidebar ${isMobileOpen ? 'open' : ''}`}
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
              <ReceiverIcons.Brand />
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
                  {isActive && <ReceiverIcons.ChevronRight />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Logout Footer */}
        <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', marginTop: 'auto' }}>
          <div
            onClick={() => navigate('/receiver/profile')}
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
                background: '#dbeafe',
                color: '#1e3a8a',
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
              <div style={{ fontSize: 14, fontWeight: 600, color: '#f7f9fc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 12, color: '#aebdd2' }}>Receiver</div>
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
              <ReceiverIcons.Logout color="#bac8dc" />
            </div>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="receiver-main-viewport" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100vh', marginLeft: '256px' }}>
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
              className="receiver-mobile-toggle"
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
                color: '#6b5d56',
                textDecoration: 'none'
              }}
              title="Notifications"
            >
              <ReceiverIcons.Notifications color="#6b5d56" />
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

            {/* Notification Dropdown Panel */}
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
                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>Notifications</h4>
                    <button
                      onClick={() => setShowNotificationPanel(false)}
                      style={{ background: 'transparent', border: 0, fontSize: '18px', cursor: 'pointer', color: '#888' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#6b5d56' }}>Food request &amp; pickup updates</span>
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
                        <p style={{ margin: '0 0 6px', fontSize: '12px', color: '#6b5d56', lineHeight: '16px' }}>{notif.subtitle || notif.message}</p>

                        {/* Extra Details / Buttons */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '6px' }}>
                          {notif.pickup_code && (
                            <span style={{ fontSize: '10px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: 800 }}>
                              Code: {notif.pickup_code}
                            </span>
                          )}

                          {notif.can_review && (
                            <button
                              type="button"
                              onClick={(e) => handleLeaveReview(e, notif)}
                              style={{
                                background: 'linear-gradient(135deg, var(--brand-primary) 0%, #ea580c 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 6px rgba(234,88,12,0.25)'
                              }}
                            >
                              <span>⭐</span>
                              <span>Leave Review</span>
                            </button>
                          )}

                          {notif.thread && (
                            <span style={{ fontSize: '10px', background: 'var(--brand-soft)', color: '#ea580c', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                              📋 View Claim Thread →
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

            <Link
              to="/receiver/profile"
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
        <main
          style={{ flex: 1, padding: '28px', overflowY: 'auto', background: '#f7f4f0' }}
        >
          {children}
        </main>
      </div>

      {/* Seeker Food Request Lifecycle Thread Modal */}
      {selectedRequest && (
        <RequestThreadModal
          selectedRequest={selectedRequest}
          onClose={() => setSelectedRequest(null)}
        />
      )}
      <ShareMealHelpChatbot role="receiver" />
    </div>
  );
};

export default ReceiverLayout;
