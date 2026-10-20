import React, { useState, useEffect } from 'react';
import NgoLayout from '../../components/ngo/NgoLayout';
import { API_BASE_URL } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export const ServingLog = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [donationRef, setDonationRef] = useState('');
  const [mealsServed, setMealsServed] = useState('');
  const [location, setLocation] = useState('Dhanmondi Community Hub, Dhaka');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchServingLogs();
  }, [token]);

  const fetchServingLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/serving-logs`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error fetching serving logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setDonationRef('');
    setMealsServed('');
    setLocation('Dhanmondi Community Hub, Dhaka');
    setNotes('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mealsServed || !location) {
      alert('Please fill in meals served and location.');
      return;
    }
    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/serving-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          donation_ref: donationRef.trim() || 'Community Food Relief',
          meals_served: parseInt(mealsServed, 10),
          location: location.trim(),
          notes: notes.trim(),
          served_at: new Date().toISOString()
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchServingLogs();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to record serving log');
      }
    } catch (err) {
      console.error('Error saving serving log:', err);
      alert('Network error while saving serving log');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this serving log entry?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/serving-logs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchServingLogs();
      }
    } catch (err) {
      console.error('Error deleting serving log:', err);
    }
  };

  const totalMealsServed = logs.reduce((acc, l) => acc + (parseInt(l.meals_served, 10) || 0), 0);

  return (
    <NgoLayout title="Serving Log">
      <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: '#2c2320' }}>
              Meal Distribution & Serving Log
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#786d66' }}>
              Verified distribution records across Bangladeshi relief hubs. Total recorded:{' '}
              <strong style={{ color: 'var(--brand-primary)' }}>{totalMealsServed} meals</strong>
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              padding: '10px 22px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--brand-primary-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--brand-primary)')}
          >
            <span style={{ fontSize: '16px' }}>+</span>
            <span>Add New Entry</span>
          </button>
        </div>

        {/* Content Table / Empty State */}
        {loading ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px', textAlign: 'center', color: '#888' }}>
            Loading serving logs from database...
          </div>
        ) : logs.length === 0 ? (
          /* Clean Empty State */
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              padding: '54px 24px',
              textAlign: 'center',
              boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
              border: '1px solid rgba(44, 35, 32, 0.06)'
            }}
          >
            <div style={{ fontSize: '38px', marginBottom: '14px' }}>📋</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 700, color: '#2c2320' }}>
              No serving logs recorded yet.
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#786d66' }}>
              Record meal distribution counts and locations in Bangladesh to build your non-profit impact history.
            </p>
            <button
              onClick={handleOpenAddModal}
              style={{
                background: 'var(--brand-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              + Add New Entry
            </button>
          </div>
        ) : (
          /* Table Container matching Figma 8:27340 */
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
              border: '1px solid rgba(44, 35, 32, 0.06)'
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(44, 35, 32, 0.06)', background: '#faf6f3' }}>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66' }}>Date</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66' }}>Donation Ref</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66' }}>People Served</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66' }}>Location</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66' }}>Notes</th>
                    <th style={{ padding: '16px 20px', fontSize: '13px', fontWeight: 600, color: '#786d66', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const dateStr = log.served_at
                      ? new Date(log.served_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'Recent';

                    return (
                      <tr
                        key={log.id}
                        style={{
                          borderBottom: index < logs.length - 1 ? '1px solid rgba(44, 35, 32, 0.05)' : 'none',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b5d56', whiteSpace: 'nowrap' }}>
                          {dateStr}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 700, color: '#2c2320' }}>
                          {log.donation_ref || 'Community Food Relief'}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                          🍽️ {log.meals_served} meals
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '14px', color: '#6b5d56' }}>
                          📍 {log.location}
                        </td>
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#786d66', maxWidth: '260px' }}>
                          {log.notes || '—'}
                        </td>
                        <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => handleDelete(log.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '6px'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = '#fee2e2')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Add New Entry Modal */}
      {showModal && (
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
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#2c2320' }}>
                Add New Serving Log Entry
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#999' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Donation Reference / Title *
                </label>
                <input
                  type="text"
                  value={donationRef}
                  onChange={(e) => setDonationRef(e.target.value)}
                  placeholder="e.g. SM-48210 (Vegetable Biryani Platters)"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(44, 35, 32, 0.15)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    People / Meals Served *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={mealsServed}
                    onChange={(e) => setMealsServed(e.target.value)}
                    placeholder="e.g. 45"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(44, 35, 32, 0.15)',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Location in Dhaka *
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Dhanmondi Hub, Dhaka"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(44, 35, 32, 0.15)',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Distribution Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Distributed fresh meal boxes to families at community shelter."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(44, 35, 32, 0.15)',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'none'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '14px',
                    border: '1px solid rgba(44, 35, 32, 0.15)',
                    background: '#ffffff',
                    color: '#2c2320',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: '14px',
                    border: 'none',
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? 'Recording...' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </NgoLayout>
  );
};

export default ServingLog;
