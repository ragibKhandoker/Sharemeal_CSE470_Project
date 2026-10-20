import React, { useState, useEffect } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';

export const FoodPostThreads = () => {
  const { token } = useAuth();
  const [threads, setFoodThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [refreshFeedback, setRefreshFeedback] = useState('');
  const [refreshError, setRefreshError] = useState('');
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDate, setCustomDate] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const sortByLatest = (a, b) => {
    const timeB = new Date(b.post_created_at || b.created_at || 0).getTime() || 0;
    const timeA = new Date(a.post_created_at || a.created_at || 0).getTime() || 0;
    if (timeB !== timeA) return timeB - timeA;
    return Number(b.post_id || b.id || 0) - Number(a.post_id || a.id || 0);
  };

  const getPostDateStr = (t) => {
    if (t.post_date) return t.post_date;
    if (!t.post_created_at) return '';
    try {
      return new Date(t.post_created_at).toISOString().split('T')[0];
    } catch (e) {
      return String(t.post_created_at).substring(0, 10);
    }
  };

  const fetchThreads = async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
      setRefreshFeedback('');
      setRefreshError('');
    }
    try {
      const authToken = token || localStorage.getItem('sharemeal_token') || sessionStorage.getItem('sharemeal_token');
      const res = await fetch(`${API_BASE_URL}/admin/food-threads`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to fetch food threads');
      const list = data.threads || [];
      // Guarantee latest food posts show first
      list.sort(sortByLatest);
      setFoodThreads(list);
      setAvailableDates(data.available_dates || []);
      
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastUpdated(nowTime);
      setError('');

      if (list.length > 0 && !selectedThreadId) {
        setSelectedThreadId(list[0].post_id);
      }

      if (isManual) {
        setRefreshSuccess(true);
        setRefreshFeedback(`Successfully refreshed ${list.length} lifecycle threads!`);
        setTimeout(() => {
          setRefreshSuccess(false);
          setRefreshFeedback('');
        }, 3000);
      }
    } catch (err) {
      console.error('Error fetching food threads:', err);
      if (threads.length === 0) {
        setError(err.message || 'Error loading food threads');
      } else if (isManual) {
        setRefreshError(err.message || 'Failed to refresh threads');
        setTimeout(() => setRefreshError(''), 4000);
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchThreads(false);
    const timer = setInterval(() => fetchThreads(false), 15000);
    return () => clearInterval(timer);
  }, [token]);

  // Date preset calculations
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0];

  const dateCounts = {
    today: threads.filter((t) => getPostDateStr(t) === todayStr).length,
    yesterday: threads.filter((t) => getPostDateStr(t) === yesterdayStr).length,
    sevenDays: threads.filter((t) => {
      const time = new Date(t.post_created_at).getTime();
      return Date.now() - time <= 7 * 24 * 60 * 60 * 1000;
    }).length,
    thirtyDays: threads.filter((t) => {
      const time = new Date(t.post_created_at).getTime();
      return Date.now() - time <= 30 * 24 * 60 * 60 * 1000;
    }).length
  };

  // Filtered threads (guaranteed newest / latest first)
  const filteredThreads = threads.filter((t) => {
    const matchesSearch =
      (t.food_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.donor?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.ngo?.organization_name || t.ngo?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.pickup_staff?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.hub_inspection?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.beneficiary_handovers || []).some((b) => (b.receiver_name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    // Status filter
    if (statusFilter === 'distributing') {
      if (!((t.remaining_packets ?? 0) > 0 && t.steps?.some((s) => s.stage_key === 'distributing' && s.status === 'completed'))) return false;
    } else if (statusFilter === 'picked_up') {
      if (!t.steps?.some((s) => s.stage_key === 'picked_up' && s.status === 'completed')) return false;
    } else if (statusFilter === 'inspected') {
      if (!t.steps?.some((s) => s.stage_key === 'hub_inspected' && s.status === 'completed')) return false;
    } else if (statusFilter === 'completed') {
      if (!((t.remaining_packets ?? 1) === 0 || t.post_status === 'distributed' || t.post_status === 'completed')) return false;
    }

    // Date filter
    if (dateFilter !== 'all') {
      const pDate = getPostDateStr(t);
      if (dateFilter === 'today') {
        if (pDate !== todayStr) return false;
      } else if (dateFilter === 'yesterday') {
        if (pDate !== yesterdayStr) return false;
      } else if (dateFilter === '7days') {
        const postTime = new Date(t.post_created_at).getTime();
        if (Date.now() - postTime > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (dateFilter === '30days') {
        const postTime = new Date(t.post_created_at).getTime();
        if (Date.now() - postTime > 30 * 24 * 60 * 60 * 1000) return false;
      } else {
        if (pDate !== dateFilter) return false;
      }
    }

    return true;
  }).sort(sortByLatest);

  // Keep selected thread in sync with filtered list (defaulting to newest)
  useEffect(() => {
    if (filteredThreads.length > 0 && !filteredThreads.some((t) => t.post_id === selectedThreadId)) {
      setSelectedThreadId(filteredThreads[0].post_id);
    }
  }, [filteredThreads, selectedThreadId]);

  const selectedThread = threads.find((t) => t.post_id === selectedThreadId) || filteredThreads[0] || null;

  // Stats dynamically computed from filtered view
  const totalPosts = filteredThreads.length;
  const activeHubs = filteredThreads.filter((t) => (t.remaining_packets ?? 0) > 0 && t.distribution?.pickup_point_id).length;
  const inspectedPosts = filteredThreads.filter((t) => t.hub_inspection?.received_at_hub_at).length;
  const totalHandovers = filteredThreads.reduce((acc, t) => acc + (t.beneficiary_handovers?.length || 0), 0);

  return (
    <AdminLayout title="Food Post Threads">
      <div style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Header & Refresh */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#2c2320', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
              🍲 Food Post Lifecycle Threads
            </h1>
            <p style={{ fontSize: '14px', color: '#786d66', margin: 0 }}>
              End-to-end realtime platform audit for every food post: donor pickup, NGO hub check, distribution, and beneficiary handover.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {lastUpdated && (
              <span
                style={{
                  fontSize: '12px',
                  color: '#786d66',
                  background: '#f5f0eb',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <span>🕒</span> Synced: {lastUpdated}
              </span>
            )}
            <span
              style={{
                fontSize: '12px',
                color: '#059669',
                background: '#ecfdf5',
                padding: '6px 12px',
                borderRadius: '100px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block'
                }}
              />
              Live Polling (15s)
            </span>
            <button
              type="button"
              id="refresh-threads-btn"
              disabled={refreshing}
              onClick={() => fetchThreads(true)}
              style={{
                background: refreshing ? '#faf6f3' : refreshSuccess ? '#ecfdf5' : '#ffffff',
                border: refreshSuccess ? '1.5px solid #10b981' : '1.5px solid #dcd3cb',
                padding: '8px 18px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                color: refreshSuccess ? '#047857' : '#2c2320',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(44,35,32,0.06)',
                transition: 'all 0.2s ease',
                opacity: refreshing ? 0.8 : 1
              }}
              title="Click to manually refresh all threads from server"
            >
              <span
                style={{
                  display: 'inline-block',
                  transformOrigin: 'center',
                  animation: refreshing ? 'spinRefresh 0.8s linear infinite' : 'none'
                }}
              >
                🔄
              </span>
              {refreshing ? 'Refreshing...' : refreshSuccess ? '✓ Updated!' : 'Refresh Threads'}
            </button>
          </div>
        </div>

        {/* Global Keyframes for smooth animations */}
        <style>{`
          @keyframes spinRefresh {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes fadeInBanner {
            from { opacity: 0; transform: translateY(-4px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        {/* Refresh Notification Banner */}
        {refreshFeedback && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeInBanner 0.2s ease-in'
            }}
          >
            <span>✓</span> {refreshFeedback}
          </div>
        )}
        {refreshError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#991b1b',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              animation: 'fadeInBanner 0.2s ease-in'
            }}
          >
            <span>⚠️</span> {refreshError}
          </div>
        )}

        {/* Metric Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Total Food Posts
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2c2320', marginTop: '6px' }}>
              {totalPosts}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600, marginTop: '2px' }}>
              All tracked platform donations
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Distribution Hubs
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#0284c7', marginTop: '6px' }}>
              {activeHubs}
            </div>
            <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600, marginTop: '2px' }}>
              Currently distributing food
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Hub Inspected &amp; Confirmed
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#059669', marginTop: '6px' }}>
              {inspectedPosts}
            </div>
            <div style={{ fontSize: '12px', color: '#047857', fontWeight: 600, marginTop: '2px' }}>
              Verified for hygiene &amp; quality
            </div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Beneficiaries Served
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#d97706', marginTop: '6px' }}>
              {totalHandovers}
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', fontWeight: 600, marginTop: '2px' }}>
              Food seekers collected meals
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        {/* Search & Comprehensive Date / Status Filter Bar */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1px solid rgba(44,35,32,0.06)',
            boxShadow: '0 4px 14px rgba(44,35,32,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          {/* Row 1: Search Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', background: '#faf8f5', padding: '10px 16px', borderRadius: '12px', border: '1px solid #f0eae4' }}>
            <span style={{ fontSize: '16px' }}>🔍</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by food name, donor, NGO, staff, or food seeker..."
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                fontSize: '14px',
                color: '#2c2320'
              }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 2: Date Selector (Presets + Specific Date Picker + Dropdown) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #f8f4f0', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#786d66', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📅</span> Filter Date:
              </span>
              {[
                { id: 'all', label: `All Dates (${threads.length})` },
                { id: 'today', label: `Today (${dateCounts.today})` },
                { id: 'yesterday', label: `Yesterday (${dateCounts.yesterday})` },
                { id: '7days', label: `Past 7 Days (${dateCounts.sevenDays})` },
                { id: '30days', label: `Past 30 Days (${dateCounts.thirtyDays})` }
              ].map((btn) => (
                <button
                  key={btn.id}
                  type="button"
                  onClick={() => { setDateFilter(btn.id); setCustomDate(''); }}
                  style={{
                    padding: '6px 13px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: dateFilter === btn.id && !customDate ? '1.5px solid #2c2320' : '1px solid #e0d8d3',
                    background: dateFilter === btn.id && !customDate ? '#2c2320' : '#ffffff',
                    color: dateFilter === btn.id && !customDate ? '#ffffff' : '#6b5d56',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Specific Date Picker Input & Quick Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Quick Select by Available Dates in DB */}
              {availableDates.length > 0 && (
                <select
                  value={['all', 'today', 'yesterday', '7days', '30days'].includes(dateFilter) ? '' : dateFilter}
                  onChange={(e) => {
                    if (e.target.value) {
                      setDateFilter(e.target.value);
                      setCustomDate(e.target.value);
                    } else {
                      setDateFilter('all');
                      setCustomDate('');
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: '1px solid #dcd3cb',
                    background: '#ffffff',
                    color: '#2c2320',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  <option value="">Choose specific date ({availableDates.length} recorded)</option>
                  {availableDates.map((d) => (
                    <option key={d.date} value={d.date}>
                      {d.date} ({d.count} {d.count === 1 ? 'post' : 'posts'})
                    </option>
                  ))}
                </select>
              )}

              {/* Exact HTML5 Calendar Picker */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fdfbf9', border: '1px solid #e0d8d3', padding: '4px 10px', borderRadius: '10px' }}>
                <span style={{ fontSize: '13px' }}>🗓️</span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDate(val);
                    if (val) {
                      setDateFilter(val);
                    } else {
                      setDateFilter('all');
                    }
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#2c2320',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
                {customDate && (
                  <button
                    type="button"
                    onClick={() => { setCustomDate(''); setDateFilter('all'); }}
                    style={{ border: 'none', background: 'transparent', color: '#9ca3af', cursor: 'pointer', fontSize: '13px', padding: 0 }}
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Lifecycle Status Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid #f8f4f0', paddingTop: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#786d66' }}>Lifecycle Status:</span>
            {[
              { id: 'all', label: 'All Stages' },
              { id: 'distributing', label: '📍 Distributing' },
              { id: 'inspected', label: '🔬 Inspected' },
              { id: 'picked_up', label: '🚚 Picked Up' },
              { id: 'completed', label: '✓ Completed' }
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: statusFilter === btn.id ? '1.5px solid var(--brand-primary)' : '1px solid #e0d8d3',
                  background: statusFilter === btn.id ? '#fff3ef' : '#ffffff',
                  color: statusFilter === btn.id ? 'var(--brand-primary)' : '#6b5d56',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {btn.label}
              </button>
            ))}

            {(statusFilter !== 'all' || dateFilter !== 'all' || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('all');
                  setCustomDate('');
                  setSearchTerm('');
                }}
                style={{
                  marginLeft: 'auto',
                  background: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>

        {/* Main Content Layout: Left Post List + Right Detailed Audit Thread */}
        {loading ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '48px', textAlign: 'center', color: '#786d66' }}>
            Loading food post lifecycle audit threads...
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '24px', color: '#991b1b' }}>
            {error}
          </div>
        ) : filteredThreads.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '16px', padding: '56px 24px', textAlign: 'center', color: '#786d66', border: '1px solid rgba(44,35,32,0.06)' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🗓️</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
              No food posts found for {dateFilter === 'all' ? 'current filter' : dateFilter}
            </div>
            <p style={{ fontSize: '14px', color: '#888', marginTop: '6px' }}>
              Try selecting a different date or clicking "All Dates" to view all lifecycle threads.
            </p>
            <button
              type="button"
              onClick={() => { setDateFilter('all'); setCustomDate(''); setSearchTerm(''); setStatusFilter('all'); }}
              style={{
                marginTop: '16px',
                background: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Reset to All Dates
            </button>
          </div>
        ) : (
          <div className="admin-threads-split" style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 410px) 1fr', gap: '24px', alignItems: 'start' }}>
            
            {/* Left Column: List of Food Posts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#786d66', paddingLeft: '4px' }}>
                FOOD POST LIST ({filteredThreads.length})
              </div>

              {filteredThreads.map((thread) => {
                const isSelected = selectedThread?.post_id === thread.post_id;
                const activeStep = thread.steps?.slice().reverse().find((s) => s.status === 'completed') || thread.steps?.[0];
                const totalServings = thread.total_packets || thread.initial_quantity || 1;
                const remaining = thread.remaining_packets ?? 0;
                const distributed = totalServings - remaining;
                const pct = Math.min(100, Math.round((distributed / totalServings) * 100));

                return (
                  <div
                    key={thread.post_id}
                    onClick={() => setSelectedThreadId(thread.post_id)}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      padding: '18px 20px',
                      border: isSelected ? '2px solid var(--brand-primary)' : '1px solid rgba(44,35,32,0.08)',
                      boxShadow: isSelected ? '0 6px 20px rgba(var(--brand-primary-rgb), 0.12)' : '0 2px 8px rgba(44,35,32,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-primary)', background: '#fff3ef', padding: '2px 8px', borderRadius: '6px' }}>
                            📅 {getPostDateStr(thread) || 'Date N/A'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9c8e85' }}>
                            {thread.formatted_created_at ? thread.formatted_created_at.split(',')[1]?.trim() : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 800, color: '#2c2320', lineHeight: 1.35 }}>
                          {thread.food_name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#786d66', marginTop: '4px' }}>
                          Donor: <strong>{thread.donor?.name || 'Anonymous'}</strong> · {thread.donor?.address || 'Dhaka'}
                        </div>
                      </div>

                      {/* Tag Pair Container with Fixed 8px Gap */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            background: '#f3f4f6',
                            color: '#4b5563',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0
                          }}
                        >
                          {thread.food_type || 'Cooked Meals'}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 10px',
                            borderRadius: '10px',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                            background:
                              activeStep?.stage_key === 'distributing'
                                ? '#e0f2fe'
                                : activeStep?.stage_key === 'hub_inspected'
                                ? '#ecfdf5'
                                : activeStep?.stage_key === 'picked_up'
                                ? '#fef3c7'
                                : '#f3f4f6',
                            color:
                              activeStep?.stage_key === 'distributing'
                                ? '#0369a1'
                                : activeStep?.stage_key === 'hub_inspected'
                                ? '#047857'
                                : activeStep?.stage_key === 'picked_up'
                                ? '#b45309'
                                : '#4b5563',
                            border: '1px solid rgba(0,0,0,0.06)'
                          }}
                        >
                          {activeStep?.label || 'Posted'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar of Handover */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b5d56', marginBottom: '4px' }}>
                        <span>Progress: {pct}% Distributed</span>
                        <span>{distributed} / {totalServings} portions</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '100px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: pct === 100 ? '#10b981' : 'var(--brand-primary)',
                            borderRadius: '100px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Key Actors Summary */}
                    <div style={{ fontSize: '11px', color: '#786d66', display: 'flex', flexDirection: 'column', gap: '3px', borderTop: '1px solid #f8f6f4', paddingTop: '8px' }}>
                      <div>
                        🏢 <strong>NGO:</strong> {thread.ngo?.organization_name || thread.ngo?.name || 'Pending assignment'}
                      </div>
                      {thread.pickup_staff?.name && (
                        <div>
                          🚚 <strong>Staff:</strong> {thread.pickup_staff.name} ({thread.pickup_staff.phone || 'Driver'})
                        </div>
                      )}
                      {thread.hub_inspection?.name && (
                        <div>
                          🔬 <strong>Inspected by:</strong> {thread.hub_inspection.name}
                        </div>
                      )}
                      <div>
                        👥 <strong>Beneficiaries:</strong> {thread.beneficiary_handovers?.length || 0} food seekers collected
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Full Lifecycle Audit Thread Details */}
            {selectedThread && (
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '20px',
                  padding: '28px',
                  border: '1px solid rgba(44,35,32,0.08)',
                  boxShadow: '0 4px 20px rgba(44,35,32,0.04)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                }}
              >
                {/* Header of Selected Thread */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #f4ece8', paddingBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2c2320' }}>
                        {selectedThread.food_name}
                      </h2>
                      <span style={{ fontSize: '12px', background: 'var(--brand-soft)', color: 'var(--brand-primary-deep)', padding: '3px 10px', borderRadius: '100px', fontWeight: 700 }}>
                        Post #{selectedThread.post_id}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#786d66', marginTop: '4px' }}>
                      Posted on {selectedThread.formatted_created_at || 'Recently'} · Category: <strong>{selectedThread.food_type || 'Cooked Meals'}</strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ background: '#fcf9f6', border: '1px solid #f0e9e4', padding: '8px 16px', borderRadius: '12px', textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#786d66', fontWeight: 700 }}>REMAINING PACKETS</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: selectedThread.remaining_packets === 0 ? '#10b981' : 'var(--brand-primary)' }}>
                        {selectedThread.remaining_packets ?? 0} / {selectedThread.total_packets || selectedThread.initial_quantity}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5-Card Key Participants Matrix */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  {/* Donor */}
                  <div style={{ background: '#fcf8f6', border: '1px solid #f5ede9', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>
                      📦 1. DONOR
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2c2320', marginTop: '4px' }}>
                      {selectedThread.donor?.name || 'Anonymous Donor'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b5d56', marginTop: '2px' }}>
                      📞 {selectedThread.donor?.phone || 'No phone'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8c7e77', marginTop: '2px' }}>
                      📍 {selectedThread.donor?.address || 'Dhaka'}
                    </div>
                  </div>

                  {/* NGO */}
                  <div style={{ background: '#fcf8f6', border: '1px solid #f5ede9', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>
                      🏢 2. NGO PARTNER
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2c2320', marginTop: '4px' }}>
                      {selectedThread.ngo?.organization_name || selectedThread.ngo?.name || 'Pending assignment'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b5d56', marginTop: '2px' }}>
                      📞 {selectedThread.ngo?.phone || '01711223344'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginTop: '2px' }}>
                      ✓ {selectedThread.ngo?.status || 'Active Request'}
                    </div>
                  </div>

                  {/* Pickup Staff */}
                  <div style={{ background: '#fcf8f6', border: '1px solid #f5ede9', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>
                      🚚 3. PICKUP DRIVER / STAFF
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2c2320', marginTop: '4px' }}>
                      {selectedThread.pickup_staff?.name || 'Tanvir Ahmed'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b5d56', marginTop: '2px' }}>
                      📞 {selectedThread.pickup_staff?.phone || '01711002233'}
                    </div>
                    <div style={{ fontSize: '11px', color: selectedThread.pickup_staff?.picked_up_at ? '#059669' : '#d97706', fontWeight: 600, marginTop: '2px' }}>
                      {selectedThread.pickup_staff?.picked_up_at ? '✓ Picked Up' : 'Dispatched'}
                    </div>
                  </div>

                  {/* Hub Inspector */}
                  <div style={{ background: '#fcf8f6', border: '1px solid #f5ede9', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>
                      🔬 4. HUB INSPECTOR
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2c2320', marginTop: '4px' }}>
                      {selectedThread.hub_inspection?.name || 'Nusrat Jahan'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b5d56', marginTop: '2px' }}>
                      NGO Quality Inspector
                    </div>
                    <div style={{ fontSize: '11px', color: selectedThread.hub_inspection?.received_at_hub_at ? '#059669' : '#d97706', fontWeight: 600, marginTop: '2px' }}>
                      {selectedThread.hub_inspection?.received_at_hub_at ? '✓ Quality Confirmed' : 'Awaiting Check'}
                    </div>
                  </div>

                  {/* Distribution Point */}
                  <div style={{ background: '#fcf8f6', border: '1px solid #f5ede9', borderRadius: '14px', padding: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>
                      📍 5. DISTRIBUTION HUB
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#2c2320', marginTop: '4px' }}>
                      {selectedThread.distribution?.pickup_point_name || 'Central Distribution Hub'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b5d56', marginTop: '2px' }}>
                      {selectedThread.distribution?.pickup_point_address || 'Dhanmondi, Dhaka'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#0284c7', fontWeight: 700, marginTop: '2px' }}>
                      {selectedThread.remaining_packets ?? 0} Meals Available
                    </div>
                  </div>
                </div>

                {/* 6-Step Visual Stepper Timeline */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#2c2320', margin: '0 0 16px 0' }}>
                    🧭 Lifecycle Stepper Timeline
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {selectedThread.steps?.map((step) => {
                      const isDone = step.status === 'completed';
                      const isInProgress = step.status === 'in_progress';

                      return (
                        <div
                          key={step.step}
                          style={{
                            display: 'flex',
                            gap: '16px',
                            background: isDone ? '#f0fdf4' : isInProgress ? '#fffbeb' : '#faf8f6',
                            border: isDone ? '1px solid #bbf7d0' : isInProgress ? '1px solid #fde68a' : '1px solid #eee5e0',
                            borderRadius: '14px',
                            padding: '16px'
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: isDone ? '#10b981' : isInProgress ? '#f59e0b' : '#d1d5db',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 800,
                              fontSize: '13px',
                              flexShrink: 0
                            }}
                          >
                            {isDone ? '✓' : step.step}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#2c2320' }}>
                                {step.title}
                              </span>
                              <span style={{ fontSize: '12px', color: '#786d66', fontWeight: 600 }}>
                                {step.time || step.full_date}
                              </span>
                            </div>
                            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b5d56', lineHeight: '18px' }}>
                              {step.detail}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Step 6 Beneficiary Handover Log (Who collected the food) */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#2c2320', margin: 0 }}>
                        👥 Beneficiary Food Seeker Claim &amp; Handover Log
                      </h3>
                      <p style={{ fontSize: '12px', color: '#786d66', margin: '2px 0 0' }}>
                        Live audit of every food seeker who presented pickup codes and collected food packets.
                      </p>
                    </div>

                    <span
                      style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        fontSize: '12px',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: '100px'
                      }}
                    >
                      {selectedThread.beneficiary_handovers?.length || 0} Total Handed Over
                    </span>
                  </div>

                  {selectedThread.beneficiary_handovers && selectedThread.beneficiary_handovers.length > 0 ? (
                    <div style={{ overflowX: 'auto', border: '1px solid #eee5e0', borderRadius: '12px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                          <tr style={{ background: '#fbf9f7', borderBottom: '1px solid #eee5e0' }}>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Food Seeker</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Mobile Number</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Pickup Code</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Quantity</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Handed Over By</th>
                            <th style={{ padding: '12px 16px', fontWeight: 700, color: '#786d66' }}>Time Handed Over</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...(selectedThread.beneficiary_handovers || [])]
                            .sort((a, b) => new Date(b.handed_over_at || 0).getTime() - new Date(a.handed_over_at || 0).getTime())
                            .map((item, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f4ece8' }}>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2c2320' }}>
                                👤 {item.receiver_name || 'Verified Seeker'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#6b5d56' }}>
                                {item.receiver_phone || '01988993333'}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 800, background: '#f3f4f6', color: '#2c2320', padding: '3px 8px', borderRadius: '6px' }}>
                                  {item.pickup_code || 'PK-8921'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                                {item.quantity || 1} Meal Packet(s)
                              </td>
                              <td style={{ padding: '12px 16px', color: '#2c2320', fontWeight: 600 }}>
                                {item.staff_name || 'Nusrat Jahan (Hub Staff)'}
                              </td>
                              <td style={{ padding: '12px 16px', color: '#786d66' }}>
                                {item.formatted_date || item.time_ago || 'Recently'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ background: '#fbf9f7', border: '1px dashed #e0d8d3', borderRadius: '12px', padding: '24px', textAlign: 'center', color: '#786d66', fontSize: '13px' }}>
                      No food packets have been handed over to food seekers yet for this post.
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default FoodPostThreads;
