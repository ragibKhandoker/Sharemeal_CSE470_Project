import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import { getAnonymousMode, setAnonymousMode as persistAnonymousMode } from '../../services/receiverData';
import authService from '../../services/authService';
import CaptchaWidget from '../../components/common/CaptchaWidget';
import './Dashboard.css';

export const ReceiverDashboard = () => {
  const { user, token, updateUser } = useAuth();
  const navigate = useNavigate();

  const isVerified = user?.verification_status === 'verified';

  const [isAnonymous, setIsAnonymous] = useState(getAnonymousMode());
  const [activeRequest, setActiveRequest] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [nearbyFoods, setNearbyFoods] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false);

  // Request Food Modal State
  const [requestModalItem, setRequestModalItem] = useState(null);
  const [requestedPortions, setRequestedPortions] = useState(1);
  const [requestNote, setRequestNote] = useState('');
  const [requestSuccessMessage, setRequestSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestCaptcha, setRequestCaptcha] = useState({ captchaId: '', captchaAnswer: '', isValid: false });

  useEffect(() => {
    fetchActiveRequest();
    fetchNearbyFoodPosts();
    if (token && updateUser) {
      authService.getMe().then((data) => {
        if (data?.user) updateUser(data.user);
      }).catch((err) => console.error('Failed refreshing current user:', err));
    }
  }, [token]);

  // Fetch active request strictly from DB
  const fetchActiveRequest = async () => {
    if (!token) {
      setLoadingRequests(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/my-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const allReqs = data?.data || [];
        setMyRequests(allReqs);
        if (allReqs.length > 0) {
          // Find first active request (status: 'requested', 'approved', 'accepted')
          const active = allReqs.find(
            (r) =>
              r.status === 'requested' ||
              r.status === 'approved' ||
              r.status === 'accepted'
          );
          setActiveRequest(active || null);
        } else {
          setActiveRequest(null);
        }
      }
    } catch (err) {
      console.error('Error fetching active request:', err);
      setActiveRequest(null);
    } finally {
      setLoadingRequests(false);
    }
  };

  // Fetch nearby food posts strictly from DB
  const fetchNearbyFoodPosts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/food-posts`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.foodPosts && data.foodPosts.length > 0) {
          // Only show posts that are available or at NGO points
          const availablePosts = data.foodPosts.filter(
            (p) =>
              (p.status || '').toLowerCase() === 'available' ||
              (p.status || '').toLowerCase() === 'at_ngo_point'
          );
          setNearbyFoods(availablePosts);
        } else {
          setNearbyFoods([]);
        }
      }
    } catch (err) {
      console.error('Error fetching food posts:', err);
      setNearbyFoods([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleToggleAnonymous = () => {
    const next = !isAnonymous;
    setIsAnonymous(next);
    persistAnonymousMode(next);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/receiver/find-food?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/receiver/find-food');
    }
  };

  const handleConfirmRequest = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in to submit a food request.');
      return;
    }
    if (!isVerified) {
      alert('National ID (NID) verification required. Please upload your NID document in your Profile and wait for Super Admin verification before requesting food.');
      navigate('/receiver/profile');
      return;
    }
    if (!requestCaptcha.captchaAnswer || requestCaptcha.captchaAnswer.length < 4) {
      alert('Please enter the security verification code (CAPTCHA) to verify you are not a bot.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          food_post_id: requestModalItem.id,
          is_anonymous: isAnonymous,
          requested_quantity: requestedPortions,
          notes: requestNote,
          captchaId: requestCaptcha.captchaId,
          captchaAnswer: requestCaptcha.captchaAnswer
        })
      });
      const data = await res.json();
      if (res.ok) {
        setRequestSuccessMessage('Request submitted successfully! Refreshing status...');
        setTimeout(() => {
          setRequestSuccessMessage('');
          setRequestModalItem(null);
          fetchActiveRequest();
          navigate('/receiver/my-requests');
        }, 1200);
      } else {
        alert(data.message || 'Failed to submit request');
      }
    } catch (err) {
      console.error(err);
      alert('Network error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  // Strictly Bangladeshi user display name
  const displayName = user?.name ? user.name.split(' ')[0] : 'Rahim';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayLabel = new Intl.DateTimeFormat('en-BD', {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  }).format(new Date());
  const activeRequestsCount = myRequests.filter((request) =>
    ['requested', 'approved', 'accepted'].includes(request.status)
  ).length;
  const completedRequestsCount = myRequests.filter((request) =>
    ['fulfilled', 'completed', 'collected', 'delivered', 'distributed'].includes(request.status)
  ).length;

  return (
    <ReceiverLayout title="Receiver Dashboard">
      <div className="receiver-dashboard" style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Welcome panel */}
        <div
          className="receiver-dashboard-hero"
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, var(--brand-primary) 100%)',
            borderRadius: '24px',
            padding: '32px',
            color: '#ffffff',
            boxShadow: '0 12px 30px rgba(var(--brand-primary-rgb), 0.25)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: '-80px',
              top: '-80px',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
              pointerEvents: 'none'
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 800, fontFamily: "'Fraunces', serif" }}>
                  {greeting}, {displayName}
                </h2>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    fontSize: '12px',
                    fontWeight: 600,
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)'
                  }}
                >
                  <span>{isAnonymous ? '👁' : '👤'}</span>
                  <span>Anonymous: {isAnonymous ? 'ON' : 'OFF'}</span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    background: isVerified ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.28)',
                    fontSize: '12px',
                    fontWeight: 700,
                    backdropFilter: 'blur(6px)',
                    border: `1px solid ${isVerified ? 'rgba(110, 231, 183, 0.45)' : 'rgba(252, 211, 77, 0.45)'}`,
                    color: '#ffffff'
                  }}
                >
                  <span>{isVerified ? '✓ Verified' : '⏳ Super Admin Verification Required'}</span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '14px', color: 'rgba(255, 255, 255, 0.85)', maxWidth: '480px', lineHeight: '20px' }}>
                {isAnonymous
                  ? 'Hidden from donors & NGOs — admin can still see your identity.'
                  : 'Your identity is visible to donors and NGOs when requesting meals.'}
              </p>
              <p className="receiver-dashboard-date">{todayLabel} · Find a meal near you</p>
            </div>

            {/* Interactive Anonymous Mode Switch */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.15)', padding: '8px 16px', borderRadius: '30px', backdropFilter: 'blur(4px)' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Anonymous Mode</span>
              <button
                type="button"
                onClick={handleToggleAnonymous}
                style={{
                  width: '46px',
                  height: '24px',
                  borderRadius: '12px',
                  background: isAnonymous ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  padding: 2
                }}
                aria-label="Toggle Anonymous Mode"
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: isAnonymous ? 'var(--brand-primary)' : '#ffffff',
                    position: 'absolute',
                    top: 2,
                    left: isAnonymous ? '24px' : '2px',
                    transition: 'left 0.2s ease, background 0.2s'
                  }}
                />
              </button>
            </div>
          </div>

          {/* Search bar inside hero */}
          <form onSubmit={handleSearchSubmit} style={{ position: 'relative', zIndex: 1 }}>
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '16px',
                padding: '4px 16px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backdropFilter: 'blur(8px)'
              }}
            >
              <span style={{ fontSize: '18px', marginRight: '10px', opacity: 0.85 }}>🔍</span>
              <input
                type="text"
                className="receiver-dashboard-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food near you (e.g. Dhanmondi, Banani, Mirpur)..."
                style={{
                  width: '100%',
                  height: '42px',
                  border: 'none',
                  background: 'transparent',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: '#ffffff',
                  color: 'var(--brand-primary)',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                Find
              </button>
            </div>
          </form>
        </div>

        <section className="receiver-dashboard-stats" aria-label="Your food activity">
          <article className="receiver-dashboard-stat">
            <span className="receiver-dashboard-stat-icon" aria-hidden="true">🍲</span>
            <div>
              <span className="receiver-dashboard-stat-label">Available meals</span>
              <strong>{loadingPosts ? '—' : nearbyFoods.length}</strong>
              <span className="receiver-dashboard-stat-caption">ready to request</span>
            </div>
          </article>
          <article className="receiver-dashboard-stat">
            <span className="receiver-dashboard-stat-icon receiver-dashboard-stat-icon--blue" aria-hidden="true">📦</span>
            <div>
              <span className="receiver-dashboard-stat-label">Open requests</span>
              <strong>{loadingRequests ? '—' : activeRequestsCount}</strong>
              <span className="receiver-dashboard-stat-caption">being processed</span>
            </div>
          </article>
          <article className="receiver-dashboard-stat">
            <span className="receiver-dashboard-stat-icon receiver-dashboard-stat-icon--green" aria-hidden="true">💚</span>
            <div>
              <span className="receiver-dashboard-stat-label">Meals received</span>
              <strong>{loadingRequests ? '—' : completedRequestsCount}</strong>
              <span className="receiver-dashboard-stat-caption">from your requests</span>
            </div>
          </article>
        </section>

        {/* Verification Warning Banner for Unverified Food Seekers */}
        {!isVerified && (
          <div
            className="receiver-dashboard-verification"
            style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '16px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              boxShadow: '0 4px 14px rgba(245,158,11,0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '26px' }}>🛡️</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#92400e' }}>
                  National ID (NID) Verification Required
                </h4>
                <p style={{ margin: '3px 0 0', fontSize: '13px', color: '#b45309', lineHeight: '18px' }}>
                  To ensure fair distribution and security, food seekers must upload their National ID (PDF or image) and receive Super Admin verification before claiming meal packets.
                </p>
              </div>
            </div>
            <Link
              to="/receiver/profile"
              style={{
                background: '#ea580c',
                color: '#ffffff',
                padding: '10px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 10px rgba(234,88,12,0.3)'
              }}
            >
              Upload NID in Profile →
            </Link>
          </div>
        )}

        <div className="receiver-dashboard-active-section">
          <h3 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
            Active Request
          </h3>

          {loadingRequests ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#786d66' }}>
              Checking active requests...
            </div>
          ) : activeRequest ? (
            /* Active Request Card from DB */
            <div
              className="receiver-dashboard-active-card"
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
                border: '1px solid rgba(44, 35, 32, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#2c2320' }}>
                    {activeRequest.food_name || activeRequest.food_title || activeRequest.title || activeRequest.food_type || 'Fresh Food Pack'}
                  </h4>
                  <span style={{ fontSize: '13px', color: '#786d66' }}>
                    {activeRequest.donor_name || 'Donor'} · {activeRequest.thana || 'Dhaka'}, {activeRequest.district || 'Bangladesh'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 14px',
                    borderRadius: '20px',
                    background: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? 'var(--brand-soft)' : '#fffbeb',
                    color: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? 'var(--brand-primary)' : '#b45309',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? '1px solid var(--brand-soft-border)' : '1px solid #fde68a'
                  }}
                >
                  <span
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? 'var(--brand-primary)' : '#b45309'
                    }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{activeRequest.status}</span>
                </div>
              </div>

              {/* Stepper Progress */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', padding: '10px 20px' }}>
                <div
                  style={{
                    position: 'absolute',
                    top: '24px',
                    left: '40px',
                    right: '40px',
                    height: '2px',
                    background: '#e2e8f0',
                    zIndex: 1
                  }}
                >
                  <div
                    style={{
                      width: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? '100%' : '50%',
                      height: '100%',
                      background: 'var(--brand-primary)'
                    }}
                  />
                </div>

                {/* Step 1 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--brand-primary)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 }}>
                    ✓
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#2c2320' }}>Requested</span>
                </div>

                {/* Step 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? 'var(--brand-primary)' : '#e2e8f0',
                      color: activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 700
                    }}
                  >
                    {activeRequest.status === 'approved' || activeRequest.status === 'accepted' ? '✓' : '2'}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#2c2320' }}>Accepted</span>
                </div>

                {/* Step 3 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: activeRequest.pickup_code ? 'var(--brand-primary)' : '#e2e8f0',
                      color: activeRequest.pickup_code ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    3
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#786d66' }}>Pickup Code Ready</span>
                </div>
              </div>

              {/* Pickup Code Callout Box */}
              {activeRequest.pickup_code && (
                <div
                  style={{
                    background: '#fff6f3',
                    border: '1px solid #ffdcd4',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px'
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Your Pickup Code
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
                      <span style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-primary)', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        {activeRequest.pickup_code}
                      </span>
                      <button
                        onClick={() => handleCopyCode(activeRequest.pickup_code)}
                        style={{
                          background: 'rgba(var(--brand-primary-rgb), 0.1)',
                          color: 'var(--brand-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {copiedCode ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => setDirectionsModalOpen(true)}
                    style={{
                      background: '#ffffff',
                      color: 'var(--brand-primary)',
                      border: '1.5px solid var(--brand-primary)',
                      borderRadius: '30px',
                      padding: '10px 22px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Get Directions
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Explicit Empty State if no request in DB */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '36px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
                border: '1px solid rgba(44, 35, 32, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fff5f2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>
                🍲
              </div>
              <h4 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#2c2320' }}>
                No Active Food Requests
              </h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#786d66', maxWidth: '380px', lineHeight: '20px' }}>
                You have no active food requests right now. Explore available meals and NGO distribution centers in Find Food.
              </p>
              <Link
                to="/receiver/find-food"
                style={{
                  marginTop: '8px',
                  background: 'var(--brand-primary)',
                  color: '#ffffff',
                  textDecoration: 'none',
                  padding: '10px 24px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.3)'
                }}
              >
                Find Food
              </Link>
            </div>
          )}
        </div>

        {/* Nearby Food Grid from DB */}
        <div className="receiver-dashboard-food-section">
          <div className="receiver-dashboard-section-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
              Nearby Food
            </h3>
            <Link
              to="/receiver/find-food"
              style={{ fontSize: '13px', fontWeight: 700, color: 'var(--brand-primary)', textDecoration: 'none' }}
            >
              See all
            </Link>
          </div>

          {loadingPosts ? (
            <div style={{ background: '#ffffff', borderRadius: '20px', padding: '32px', textAlign: 'center', color: '#786d66' }}>
              Loading food posts...
            </div>
          ) : nearbyFoods.length === 0 ? (
            /* Explicit Empty State if no food posts in DB */
            <div
              style={{
                background: '#ffffff',
                borderRadius: '20px',
                padding: '40px 24px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
                border: '1px solid rgba(44, 35, 32, 0.06)',
                color: '#786d66',
                fontSize: '14px'
              }}
            >
              No food posts available right now.
            </div>
          ) : (
            <div className="receiver-dashboard-food-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {nearbyFoods.slice(0, 4).map((food) => {
                const img =
                  food.image_url ||
                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                const locationText = food.area_ward
                  ? `${food.area_ward}, ${food.thana || 'Dhaka'}`
                  : `${food.thana || 'Dhaka'}, ${food.district || 'Bangladesh'}`;
                const existingReq = myRequests.find((r) => r.food_post_id === food.id && r.status !== 'cancelled' && r.status !== 'rejected');
                const hasClaimed = Boolean(existingReq);
                const isFulfilled = existingReq?.status === 'fulfilled' || existingReq?.status === 'completed';

                return (
                  <div
                    key={food.id}
                    className="receiver-dashboard-food-card"
                    style={{
                      background: '#ffffff',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 18px rgba(44, 35, 32, 0.04)',
                      border: '1px solid rgba(44, 35, 32, 0.06)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                  >
                    <div className="receiver-dashboard-food-image" style={{ position: 'relative', height: '170px', background: '#e5e7eb' }}>
                      <img
                        src={img}
                        alt={food.food_type}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          background: '#ffffff',
                          color: '#2c2320',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {food.food_type || 'Cooked'}
                      </div>
                    </div>

                    <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '14px' }}>
                      <div>
                        <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#2c2320' }}>
                          {food.food_name || food.title || `${food.food_type} Meals`} ({food.quantity} servings)
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#786d66' }}>
                          <span>📍 {locationText}</span>
                          <span>👤 {food.donor_name || 'Community Donor'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (!isVerified) {
                            alert('National ID (NID) verification required. Please upload your NID document in your Profile and wait for Super Admin verification.');
                            navigate('/receiver/profile');
                            return;
                          }
                          if (!hasClaimed) {
                            setRequestModalItem(food);
                            setRequestedPortions(1);
                            setRequestNote('');
                          }
                        }}
                        disabled={hasClaimed}
                        style={{
                          width: '100%',
                          background: !isVerified
                            ? '#fff7ed'
                            : hasClaimed
                            ? (isFulfilled ? '#ecfdf5' : '#fffbeb')
                            : 'var(--brand-primary)',
                          color: !isVerified
                            ? '#c2410c'
                            : hasClaimed
                            ? (isFulfilled ? '#047857' : '#b45309')
                            : '#ffffff',
                          border: !isVerified
                            ? '1.5px solid #fed7aa'
                            : hasClaimed
                            ? (isFulfilled ? '1.5px solid #a7f3d0' : '1.5px solid #fde68a')
                            : 'none',
                          borderRadius: '14px',
                          padding: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: hasClaimed ? 'not-allowed' : 'pointer',
                          boxShadow: hasClaimed || !isVerified ? 'none' : '0 4px 12px rgba(var(--brand-primary-rgb), 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                          if (!hasClaimed && isVerified) e.currentTarget.style.background = 'var(--brand-primary-dark)';
                        }}
                        onMouseOut={(e) => {
                          if (!hasClaimed && isVerified) e.currentTarget.style.background = 'var(--brand-primary)';
                        }}
                      >
                        {!isVerified
                          ? '🔒 Verification Required (Upload NID)'
                          : hasClaimed
                          ? (isFulfilled ? '✓ Food Received' : `✓ Already Requested (${existingReq.pickup_code || 'Pending'})`)
                          : 'Request Food'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Directions Modal */}
      {directionsModalOpen && activeRequest && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={() => setDirectionsModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: "'Fraunces', serif" }}>
                Pickup Directions
              </h3>
              <button
                onClick={() => setDirectionsModalOpen(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: '#f7f4f0', borderRadius: '16px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#2c2320', marginBottom: '4px' }}>
                {activeRequest.donor_name || 'ShareMeal Distribution Point'}
              </div>
              <div style={{ fontSize: '13px', color: '#6b5d56' }}>
                📍 {activeRequest.thana || 'Dhaka'}, {activeRequest.district || 'Bangladesh'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600, marginTop: '8px' }}>
                Pickup Code: {activeRequest.pickup_code}
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#6b5d56', lineHeight: '20px', marginBottom: '20px' }}>
              Show your pickup code to the counter staff or volunteer at the pickup point in Bangladesh.
            </p>

            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${activeRequest.thana || 'Dhaka'}, ${activeRequest.district || 'Bangladesh'}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'center',
                background: 'var(--brand-primary)',
                color: '#ffffff',
                textDecoration: 'none',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            >
              Open in Google Maps ↗
            </a>
          </div>
        </div>
      )}

      {/* Request Food Modal */}
      {requestModalItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: '20px'
          }}
          onClick={() => setRequestModalItem(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, fontFamily: "'Fraunces', serif" }}>
                Request Food
              </h3>
              <button
                onClick={() => setRequestModalItem(null)}
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
              >
                ✕
              </button>
            </div>

            {requestSuccessMessage ? (
              <div style={{ background: '#ecfdf5', color: '#065f46', padding: '16px', borderRadius: '12px', textAlign: 'center', fontWeight: 600 }}>
                {requestSuccessMessage}
              </div>
            ) : !isVerified ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '14px', padding: '16px', marginBottom: '20px', textAlign: 'left' }}>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#92400e', marginBottom: '4px' }}>
                    🛡️ Super Admin Verification Required
                  </div>
                  <div style={{ fontSize: '13px', color: '#b45309', lineHeight: '18px' }}>
                    To ensure safety and fair distribution, food requests can only be placed after your National ID (NID) has been verified by the Super Admin.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRequestModalItem(null);
                    navigate('/receiver/profile');
                  }}
                  style={{
                    width: '100%',
                    background: '#ea580c',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(234,88,12,0.25)'
                  }}
                >
                  Go to Profile to Upload NID →
                </button>
              </div>
            ) : (
          <form className="receiver-request-form" onSubmit={handleConfirmRequest}>
                <div style={{ marginBottom: '16px', background: '#fcf8f6', padding: '12px', borderRadius: '14px' }}>
                  <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>
                    {requestModalItem.food_name || requestModalItem.title || `${requestModalItem.food_type} Meals`}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#786d66' }}>
                    {requestModalItem.donor_name} · {requestModalItem.thana || 'Dhaka'}
                  </span>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Portions Needed
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      type="button"
                      onClick={() => setRequestedPortions((p) => Math.max(1, p - 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '16px', cursor: 'pointer' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '16px', fontWeight: 700, width: '30px', textAlign: 'center' }}>
                      {requestedPortions}
                    </span>
                    <button
                      type="button"
                      onClick={() => setRequestedPortions((p) => Math.min(Math.min(4, requestModalItem.quantity || 4), p + 1))}
                      style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#f9fafb', fontSize: '16px', cursor: 'pointer' }}
                    >
                      +
                    </button>
                    <span style={{ fontSize: '12px', color: '#888' }}>
                      (Max {Math.min(4, requestModalItem.quantity || 4)} portions)
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Pickup Note (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    placeholder="E.g., Arriving by 3 PM in Dhanmondi..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #e5e7eb', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', padding: '10px 14px', borderRadius: '12px', marginBottom: '20px' }}>
                  <span style={{ fontSize: '12px', color: '#166534', fontWeight: 600 }}>
                    {isAnonymous ? '🛡️ Anonymous Request: Your identity will be hidden' : '👤 Standard Request: Your name will be shared with donor'}
                  </span>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <CaptchaWidget
                    onCaptchaChange={setRequestCaptcha}
                    label="Anti-Bot Security Check"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    width: '100%',
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </ReceiverLayout>
  );
};

export default ReceiverDashboard;
