import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DonorLayout from '../../components/donor/DonorLayout';
import { API_BASE_URL } from '../../utils/constants';
import foodPostService from '../../services/foodPostService';

// Figma Badge Color Mapping
const getStatusConfig = (status) => {
  const s = String(status || '').toLowerCase();
  if (s.includes('collected by ngo') || s === 'collected') {
    return { bg: '#ebf3fe', color: 'var(--brand-primary)', border: 'var(--brand-soft-border)', label: 'Collected by NGO' };
  }
  if (s.includes('available') || s === 'pending') {
    return { bg: '#fef9ee', color: '#d97706', border: '#fde68a', label: 'Available' };
  }
  if (s.includes('at ngo point') || s.includes('ngo point')) {
    return { bg: '#fef3e8', color: '#ea580c', border: '#fed7aa', label: 'At NGO Point' };
  }
  if (s.includes('taken') || s.includes('completed')) {
    return { bg: '#eaf7ed', color: '#16a34a', border: '#bbf7d0', label: 'Taken' };
  }
  if (s.includes('expired') || s.includes('rejected')) {
    return { bg: '#fdeee9', color: '#dc2626', border: '#fecaca', label: 'Expired' };
  }
  return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: status || 'Available' };
};

// Check if a food post has been picked up, collected, or taken (deletion disabled)
export const isPostPickedUp = (item) => {
  if (!item) return false;
  const s = String(item.statusKey || item.status || '').toLowerCase();
  return (
    s.includes('collected') ||
    s.includes('ngo point') ||
    s.includes('taken') ||
    s.includes('picked') ||
    s.includes('in_transit') ||
    s.includes('transit') ||
    s.includes('completed')
  );
};

export const MyDonations = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [activeFilter, setActiveFilter] = useState('All');
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDonation, setSelectedDonation] = useState(null);
  const [donationToDelete, setDonationToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // NGO Pickup Requests state
  const [pickupRequests, setPickupRequests] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [respondingId, setRespondingId] = useState(null);

  const handleConfirmDelete = async () => {
    if (!donationToDelete) return;
    if (isPostPickedUp(donationToDelete)) {
      alert('Cannot delete post: food has already been picked up or collected.');
      setDonationToDelete(null);
      return;
    }
    setIsDeleting(true);
    try {
      await foodPostService.deletePost(donationToDelete.id);
      setDonations((prev) => prev.filter((item) => item.id !== donationToDelete.id));
      if (selectedDonation && selectedDonation.id === donationToDelete.id) {
        setSelectedDonation(null);
      }
      setToastMessage(`"${donationToDelete.title}" was deleted successfully.`);
      setTimeout(() => {
        setToastMessage(null);
      }, 4000);
      setDonationToDelete(null);
    } catch (err) {
      console.error('Failed to delete donation post:', err);
      alert(err.response?.data?.message || 'Failed to delete donation post. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    const fetchDonations = async () => {
      if (!user?.id) {
        setDonations([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const url = `${API_BASE_URL}/food-posts?donor_id=${user.id}`;
        const res = await fetch(url);
        const data = await res.json();
        let apiPosts = [];
        if (res.ok && data.foodPosts) {
          // Strictly ensure posts belong exclusively to this logged in donor
          const donorPosts = data.foodPosts.filter(
            (p) => Number(p.donor_id) === Number(user.id)
          );

          apiPosts = donorPosts.map((post) => {
            const statusConfig = getStatusConfig(post.status);
            return {
              id: post.id,
              donor_id: post.donor_id,
              title: post.title || (post.food_type ? `${post.food_type} Meal Donation` : 'Nutritious Meal'),
              category: post.food_type || 'Cooked',
              quantity: post.quantity || 1,
              quantity_unit: post.quantity_unit || 'meals',
              status: statusConfig.label,
              statusKey: post.status || 'available',
              expiryText: post.expiry_time ? new Date(post.expiry_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today',
              expiryTime: post.expiry_time,
              createdText: post.created_at ? new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
              image: post.image_url ? (post.image_url.startsWith('http') ? post.image_url : `${API_BASE_URL.replace('/api', '')}${post.image_url}`) : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
              location: [post.house_no, post.road_no, post.area_ward, post.thana, post.district].filter(Boolean).join(', ') || 'Dhaka, Bangladesh',
              notes: post.notes || ''
            };
          });
        }
        setDonations(apiPosts);
      } catch (err) {
        console.error('Error fetching donations from database:', err);
        setDonations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [user]);

  // Fetch NGO pickup requests for this donor
  const fetchPickupRequests = async () => {
    if (!token) return;
    setPickupLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/donor-pickup-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPickupRequests(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching NGO pickup requests:', err);
    } finally {
      setPickupLoading(false);
    }
  };

  useEffect(() => {
    fetchPickupRequests();

    if (!token) return undefined;

    // NGO requests can arrive while the donor already has My Donations open.
    // Refresh when they return to the tab and periodically while it is visible.
    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') fetchPickupRequests();
    };
    const refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') fetchPickupRequests();
    }, 10000);
    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [token]);

  const handlePickupRespond = async (requestId, action) => {
    if (!token) return;
    setRespondingId(requestId);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${requestId}/pickup-respond`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        setToastMessage(action === 'accept' ? '✅ Pickup request accepted! NGO can now collect the food.' : '❌ Pickup request rejected.');
        setTimeout(() => setToastMessage(null), 4000);
        fetchPickupRequests();
      } else {
        alert(data.message || 'Could not process response');
      }
    } catch (err) {
      console.error('Error responding to pickup request:', err);
    } finally {
      setRespondingId(null);
    }
  };

  const filterOptions = ['All', 'Available', 'Collected by NGO', 'At NGO Point', 'Taken', 'Expired'];

  const filteredDonations = donations.filter((item) => {
    if (activeFilter === 'All') return true;
    const s = String(item.status || '').toLowerCase();
    const f = activeFilter.toLowerCase();
    if (f === 'available') return s.includes('available');
    if (f === 'collected by ngo') return s.includes('collected');
    if (f === 'at ngo point') return s.includes('ngo point');
    if (f === 'taken') return s.includes('taken') || s.includes('completed');
    if (f === 'expired') return s.includes('expired');
    return true;
  });

  return (
    <DonorLayout title="My Donations">
      <div style={{ maxWidth: '1200px', width: '100%', margin: '0 auto' }}>

        {/* NGO Pickup Requests Section */}
        {pickupRequests.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 4, height: 24, borderRadius: 2, background: 'var(--brand-primary)' }} />
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
                🚚 NGO Pickup Requests
              </h3>
              <span style={{ background: 'var(--brand-primary)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                {pickupRequests.length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pickupRequests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    background: '#fffbf8',
                    borderRadius: '16px',
                    border: '1px solid rgba(var(--brand-primary-rgb), 0.2)',
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#2c2320', marginBottom: 4 }}>
                      🏢 {req.ngo_organization_name || req.requester_name || 'NGO'} requests pickup
                    </div>
                    <div style={{ fontSize: '12px', color: '#786d66', display: 'flex', gap: 12 }}>
                      <span>🍱 {req.food_type} · {req.post_quantity} meals</span>
                      <span>📍 {req.thana || req.district || 'Dhaka'}</span>
                    </div>
                    {req.notes && req.notes !== 'NGO Pickup Request' && (
                      <div style={{ fontSize: '12px', color: '#5b5b5b', marginTop: 4, fontStyle: 'italic' }}>
                        "{req.notes}"
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      onClick={() => handlePickupRespond(req.id, 'accept')}
                      disabled={respondingId === req.id}
                      style={{
                        padding: '8px 20px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: respondingId === req.id ? 'not-allowed' : 'pointer',
                        opacity: respondingId === req.id ? 0.7 : 1,
                        boxShadow: '0 3px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handlePickupRespond(req.id, 'reject')}
                      disabled={respondingId === req.id}
                      style={{
                        padding: '8px 20px',
                        background: '#ffffff',
                        color: '#dc2626',
                        border: '1.5px solid #dc2626',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: respondingId === req.id ? 'not-allowed' : 'pointer',
                        opacity: respondingId === req.id ? 0.7 : 1
                      }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Control Bar: Filter Pills + View Switcher (Figma Node 8:23608 & 8:26244) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            marginBottom: 28
          }}
        >
          {/* Status Filter Pills Container */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f1ebe6',
              padding: '6px 8px',
              borderRadius: '14px',
              overflowX: 'auto',
              maxWidth: '100%'
            }}
          >
            {filterOptions.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 0,
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    background: isActive ? '#ffffff' : 'transparent',
                    color: isActive ? '#2c2320' : '#6b5d56',
                    boxShadow: isActive ? '0 2px 8px rgba(44,35,32,0.06)' : 'none',
                    transition: 'all 0.18s ease'
                  }}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          {/* Right View Switcher: Grid vs Table */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#f1ebe6',
              padding: '4px',
              borderRadius: '12px'
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px',
                border: 0,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'grid' ? 'var(--brand-primary)' : 'transparent',
                color: viewMode === 'grid' ? '#ffffff' : '#6b5d56',
                boxShadow: viewMode === 'grid' ? '0 4px 12px rgba(var(--brand-primary-rgb), 0.28)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <span>⊞</span> Grid
            </button>
            <button
              onClick={() => setViewMode('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: '8px',
                border: 0,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: viewMode === 'table' ? 'var(--brand-primary)' : 'transparent',
                color: viewMode === 'table' ? '#ffffff' : '#6b5d56',
                boxShadow: viewMode === 'table' ? '0 4px 12px rgba(var(--brand-primary-rgb), 0.28)' : 'none',
                transition: 'all 0.18s ease'
              }}
            >
              <span>☰</span> Table
            </button>
          </div>
        </div>

        {/* Content View: Grid or Table */}
        {loading ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '64px 24px',
              textAlign: 'center',
              border: '1px solid rgba(44,35,32,0.06)',
              boxShadow: '0 8px 30px rgba(44,35,32,0.03)'
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '20px', color: '#2c2320', marginBottom: '8px' }}>
              Loading your donations...
            </h3>
            <p style={{ color: '#6b5d56', fontSize: '14px' }}>
              Fetching latest food posts from the database.
            </p>
          </div>
        ) : filteredDonations.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '64px 24px',
              textAlign: 'center',
              border: '1px solid rgba(44,35,32,0.06)',
              boxShadow: '0 8px 30px rgba(44,35,32,0.03)'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🍲</div>
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: '22px', color: '#2c2320', marginBottom: '8px' }}>
              {donations.length === 0 ? 'No Donations Posted Yet' : 'No donations in this category'}
            </h3>
            <p style={{ color: '#6b5d56', fontSize: '14px', maxWidth: '420px', margin: '0 auto 24px auto', lineHeight: '1.6' }}>
              {donations.length === 0
                ? "You haven't posted any food donations yet. Share your surplus food with those who need it most!"
                : `You don't have any food posts matching the "${activeFilter}" filter right now.`}
            </p>
            <button
              onClick={() => navigate('/donor/post-food')}
              style={{
                background: 'linear-gradient(174deg, var(--brand-primary-light) 0%, var(--brand-primary-dark) 100%)',
                color: '#ffffff',
                border: 0,
                padding: '12px 24px',
                borderRadius: '12px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 8px 20px -6px rgba(var(--brand-primary-rgb), 0.4)'
              }}
            >
              + Post New Food
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ========================================================================= */
          /* GRID VIEW (Figma Node 8:23608)                                            */
          /* ========================================================================= */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px'
            }}
          >
            {filteredDonations.map((item) => {
              const statusCfg = getStatusConfig(item.status);
              return (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    border: '1px solid rgba(44,35,32,0.06)',
                    boxShadow: '0 8px 24px rgba(44,35,32,0.04)',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 16px 36px rgba(44,35,32,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(44,35,32,0.04)';
                  }}
                >
                  {/* Card Image Banner with Category Badge */}
                  <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
                    <img
                      src={item.image}
                      alt={item.title}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Category Pill Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        background: 'rgba(255, 255, 255, 0.94)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 12px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#2c2320',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      {item.category}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: '8px' }}>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: 700,
                          color: '#2c2320',
                          fontFamily: "'Fraunces', serif",
                          lineHeight: '24px'
                        }}
                      >
                        {item.title}
                      </h4>
                      {/* Status Badge */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          background: statusCfg.bg,
                          color: statusCfg.color,
                          fontSize: '11px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ fontSize: '10px' }}>●</span>
                        <span>{statusCfg.label}</span>
                      </div>
                    </div>

                    {/* Meta line: e.g. 12 meals · 95 min left */}
                    <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#6b5d56' }}>
                      {item.quantity} {item.quantity_unit} · {item.expiryText}
                    </p>

                    {/* Actions: View Details + Delete */}
                    <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setSelectedDonation(item)}
                        style={{
                          flex: 1,
                          height: '42px',
                          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-light))',
                          border: '1.5px solid var(--brand-primary)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          fontSize: '14px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 5px 12px rgba(var(--brand-primary-rgb), 0.24)',
                          transition: 'all 0.18s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.filter = 'brightness(1.08)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.filter = 'none';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        View Details
                      </button>
                      <button
                        disabled={isPostPickedUp(item)}
                        title={
                          isPostPickedUp(item)
                            ? 'Cannot delete post: food has already been collected or picked up'
                            : 'Delete Post'
                        }
                        aria-label={`Delete ${item.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isPostPickedUp(item)) return;
                          setDonationToDelete(item);
                        }}
                        style={{
                          width: '42px',
                          height: '42px',
                          background: isPostPickedUp(item) ? '#f5f5f5' : '#ffffff',
                          border: isPostPickedUp(item) ? '1.5px solid #e5e7eb' : '1.5px solid #fecaca',
                          borderRadius: '12px',
                          color: isPostPickedUp(item) ? '#a8a29e' : '#dc2626',
                          fontSize: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isPostPickedUp(item) ? 'not-allowed' : 'pointer',
                          opacity: isPostPickedUp(item) ? 0.55 : 1,
                          flexShrink: 0,
                          transition: 'all 0.18s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isPostPickedUp(item)) {
                            e.currentTarget.style.background = '#fef2f2';
                            e.currentTarget.style.borderColor = '#dc2626';
                            e.currentTarget.style.transform = 'scale(1.04)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isPostPickedUp(item)) {
                            e.currentTarget.style.background = '#ffffff';
                            e.currentTarget.style.borderColor = '#fecaca';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* TABLE VIEW (Figma Node 8:26244)                                           */
          /* ========================================================================= */
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid rgba(44,35,32,0.06)',
              boxShadow: '0 8px 30px rgba(44,35,32,0.04)',
              overflow: 'hidden'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(44,35,32,0.06)' }}>
                    <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Food Item</th>
                    <th style={{ padding: '18px 20px', fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Type</th>
                    <th style={{ padding: '18px 20px', fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Qty</th>
                    <th style={{ padding: '18px 20px', fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Status</th>
                    <th style={{ padding: '18px 20px', fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Expiry</th>
                    <th style={{ padding: '18px 24px', fontSize: '13px', fontWeight: 600, color: '#6b5d56', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonations.map((item, idx) => {
                    const statusCfg = getStatusConfig(item.status);
                    const isLast = idx === filteredDonations.length - 1;
                    return (
                      <tr
                        key={item.id}
                        style={{
                          borderBottom: isLast ? 'none' : '1px solid rgba(44,35,32,0.04)',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#faf6f3')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {/* Food Item (Thumbnail + Title) */}
                        <td style={{ padding: '16px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <img
                              src={item.image}
                              alt={item.title}
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                              }}
                              style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                            />
                            <span style={{ fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>
                              {item.title}
                            </span>
                          </div>
                        </td>

                        {/* Type */}
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#4b5563' }}>
                          {item.category}
                        </td>

                        {/* Qty */}
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#4b5563', fontWeight: 500 }}>
                          {item.quantity} {item.quantity_unit}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '16px 20px' }}>
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '5px 12px',
                              borderRadius: '999px',
                              background: statusCfg.bg,
                              color: statusCfg.color,
                              fontSize: '12px',
                              fontWeight: 700
                            }}
                          >
                            <span style={{ fontSize: '10px' }}>●</span>
                            <span>{statusCfg.label}</span>
                          </div>
                        </td>

                        {/* Expiry */}
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b5d56' }}>
                          {item.expiryText}
                        </td>

                        {/* Actions: Details & Delete */}
                        <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                            <button
                              onClick={() => setSelectedDonation(item)}
                              style={{
                                background: 'transparent',
                                border: 0,
                                color: 'var(--brand-primary)',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                padding: '6px 10px',
                                borderRadius: '8px'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                            >
                              Details
                            </button>
                            <button
                              disabled={isPostPickedUp(item)}
                              title={
                                isPostPickedUp(item)
                                  ? 'Cannot delete post: food has already been collected or picked up'
                                  : 'Delete Post'
                              }
                              onClick={() => {
                                if (isPostPickedUp(item)) return;
                                setDonationToDelete(item);
                              }}
                              style={{
                                background: isPostPickedUp(item) ? '#f5f5f5' : '#fff5f5',
                                border: isPostPickedUp(item) ? '1px solid #e5e7eb' : '1px solid #fecaca',
                                color: isPostPickedUp(item) ? '#a8a29e' : '#dc2626',
                                fontSize: '12px',
                                fontWeight: 600,
                                cursor: isPostPickedUp(item) ? 'not-allowed' : 'pointer',
                                opacity: isPostPickedUp(item) ? 0.55 : 1,
                                padding: '5px 10px',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isPostPickedUp(item)) {
                                  e.currentTarget.style.background = '#fee2e2';
                                  e.currentTarget.style.borderColor = '#dc2626';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isPostPickedUp(item)) {
                                  e.currentTarget.style.background = '#fff5f5';
                                  e.currentTarget.style.borderColor = '#fecaca';
                                }
                              }}
                            >
                              <span>🗑️</span> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Modal Popup for Inspection */}
        {selectedDonation && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setSelectedDonation(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                maxWidth: '520px',
                width: '100%',
                overflow: 'hidden',
                boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
                animation: 'modalSlideIn 0.25s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Banner */}
              <div style={{ position: 'relative', height: '200px', width: '100%' }}>
                <img
                  src={selectedDonation.image}
                  alt={selectedDonation.title}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                  }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={() => setSelectedDonation(null)}
                  style={{
                    position: 'absolute',
                    top: '14px',
                    right: '14px',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#ffffff',
                    border: 0,
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '16px',
                    background: 'rgba(255,255,255,0.95)',
                    padding: '4px 12px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#2c2320'
                  }}
                >
                  {selectedDonation.category}
                </div>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontFamily: "'Fraunces', serif", fontSize: '22px', color: '#2c2320' }}>
                    {selectedDonation.title}
                  </h3>
                  {(() => {
                    const cfg = getStatusConfig(selectedDonation.status);
                    return (
                      <div
                        style={{
                          padding: '4px 12px',
                          borderRadius: '999px',
                          background: cfg.bg,
                          color: cfg.color,
                          fontSize: '12px',
                          fontWeight: 700
                        }}
                      >
                        ● {cfg.label}
                      </div>
                    );
                  })()}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, margin: '16px 0', background: '#faf6f3', padding: '16px', borderRadius: '14px' }}>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7e77', fontWeight: 600 }}>Quantity</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>
                      {selectedDonation.quantity} {selectedDonation.quantity_unit}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7e77', fontWeight: 600 }}>Expiry / Status</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#2c2320' }}>
                      {selectedDonation.expiryText}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7e77', fontWeight: 600 }}>Pickup Location</div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#2c2320', marginTop: '2px' }}>
                      📍 {selectedDonation.location}
                    </div>
                  </div>
                  {selectedDonation.notes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#8c7e77', fontWeight: 600 }}>Donor Notes</div>
                      <div style={{ fontSize: '13px', color: '#524540', marginTop: '2px', fontStyle: 'italic' }}>
                        "{selectedDonation.notes}"
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: '20px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => {
                      setSelectedDonation(null);
                      navigate('/donor/food-journey');
                    }}
                    style={{
                      flex: 1,
                      minWidth: '160px',
                      height: '44px',
                      background: 'linear-gradient(174deg, var(--brand-primary-light) 0%, var(--brand-primary-dark) 100%)',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Track in Food Journey →
                  </button>
                  <button
                    disabled={isPostPickedUp(selectedDonation)}
                    title={
                      isPostPickedUp(selectedDonation)
                        ? 'Cannot delete post: food has already been collected or picked up'
                        : 'Delete Post'
                    }
                    onClick={() => {
                      if (isPostPickedUp(selectedDonation)) return;
                      const itemToDel = selectedDonation;
                      setSelectedDonation(null);
                      setDonationToDelete(itemToDel);
                    }}
                    style={{
                      padding: '0 16px',
                      height: '44px',
                      background: isPostPickedUp(selectedDonation) ? '#f5f5f5' : '#fff5f5',
                      color: isPostPickedUp(selectedDonation) ? '#a8a29e' : '#dc2626',
                      border: isPostPickedUp(selectedDonation) ? '1.5px solid #e5e7eb' : '1.5px solid #fecaca',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: isPostPickedUp(selectedDonation) ? 'not-allowed' : 'pointer',
                      opacity: isPostPickedUp(selectedDonation) ? 0.55 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.18s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isPostPickedUp(selectedDonation)) {
                        e.currentTarget.style.background = '#fee2e2';
                        e.currentTarget.style.borderColor = '#dc2626';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isPostPickedUp(selectedDonation)) {
                        e.currentTarget.style.background = '#fff5f5';
                        e.currentTarget.style.borderColor = '#fecaca';
                      }
                    }}
                  >
                    🗑️ Delete Post
                  </button>
                  <button
                    onClick={() => setSelectedDonation(null)}
                    style={{
                      padding: '0 18px',
                      height: '44px',
                      background: '#f1ebe6',
                      color: '#6b5d56',
                      border: 0,
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal Dialog */}
        {donationToDelete && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => !isDeleting && setDonationToDelete(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                maxWidth: '440px',
                width: '100%',
                padding: '28px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                textAlign: 'center',
                animation: 'modalSlideIn 0.2s ease'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Warning Icon Badge */}
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  border: '6px solid #fee2e2',
                  color: '#dc2626',
                  fontSize: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 18px auto'
                }}
              >
                🗑️
              </div>

              <h3
                style={{
                  margin: '0 0 10px 0',
                  fontFamily: "'Fraunces', serif",
                  fontSize: '22px',
                  color: '#2c2320'
                }}
              >
                Delete Donation Post?
              </h3>

              <p
                style={{
                  margin: '0 0 24px 0',
                  fontSize: '14px',
                  lineHeight: '1.5',
                  color: '#6b5d56'
                }}
              >
                Are you sure you want to delete <strong style={{ color: '#2c2320' }}>"{donationToDelete.title}"</strong>? This will permanently remove this post from ShareMeal and cancel any pending collections.
              </p>

              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  disabled={isDeleting}
                  onClick={() => setDonationToDelete(null)}
                  style={{
                    flex: 1,
                    height: '44px',
                    background: '#f1ebe6',
                    color: '#6b5d56',
                    border: 0,
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    transition: 'background 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#e5dfd9';
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#f1ebe6';
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  style={{
                    flex: 1,
                    height: '44px',
                    background: '#dc2626',
                    color: '#ffffff',
                    border: 0,
                    borderRadius: '12px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#b91c1c';
                  }}
                  onMouseLeave={(e) => {
                    if (!isDeleting) e.currentTarget.style.background = '#dc2626';
                  }}
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete Post'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast Notification */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              background: '#2c2320',
              color: '#ffffff',
              padding: '14px 22px',
              borderRadius: '14px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: 500,
              zIndex: 10001,
              animation: 'modalSlideIn 0.25s ease'
            }}
          >
            <span style={{ fontSize: '18px', color: '#4ade80' }}>✓</span>
            <span>{toastMessage}</span>
            <button
              onClick={() => setToastMessage(null)}
              style={{
                background: 'transparent',
                border: 0,
                color: '#a89d97',
                fontSize: '16px',
                cursor: 'pointer',
                marginLeft: '8px',
                padding: '0 4px'
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </DonorLayout>
  );
};

export default MyDonations;
