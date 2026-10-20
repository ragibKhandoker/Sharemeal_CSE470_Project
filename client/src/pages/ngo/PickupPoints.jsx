import React, { useState, useEffect } from 'react';
import NgoLayout from '../../components/ngo/NgoLayout';
import { API_BASE_URL } from '../../utils/constants';
import { useAuth } from '../../context/AuthContext';

export const PickupPoints = () => {
  const { token } = useAuth();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPoint, setEditingPoint] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [operatingHours, setOperatingHours] = useState('8 AM – 9 PM');
  const [activeItems, setActiveItems] = useState(0);
  const [status, setStatus] = useState('Active');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPickupPoints();
  }, [token]);

  const fetchPickupPoints = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pickup-points`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setPoints(data.data || []);
      } else {
        setPoints([]);
      }
    } catch (err) {
      console.error('Error fetching pickup points:', err);
      setPoints([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingPoint(null);
    setName('');
    setAddress('');
    setOperatingHours('8 AM – 9 PM');
    setActiveItems(0);
    setStatus('Active');
    setShowModal(true);
  };

  const handleOpenEditModal = (pt) => {
    setEditingPoint(pt);
    setName(pt.name || '');
    setAddress(pt.address || '');
    setOperatingHours(pt.operating_hours || '8 AM – 9 PM');
    setActiveItems(pt.active_items || 0);
    setStatus(pt.status || 'Active');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert('Please fill in Hub Name and Address.');
      return;
    }
    setSubmitting(true);

    try {
      const url = editingPoint
        ? `${API_BASE_URL}/pickup-points/${editingPoint.id}`
        : `${API_BASE_URL}/pickup-points`;
      const method = editingPoint ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          operating_hours: operatingHours,
          active_items: parseInt(activeItems, 10) || 0,
          status
        })
      });

      if (res.ok) {
        setShowModal(false);
        fetchPickupPoints();
      } else {
        const errData = await res.json();
        alert(errData.message || 'Failed to save pickup point');
      }
    } catch (err) {
      console.error('Error saving pickup point:', err);
      alert('Network error while saving pickup point.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pickup-points/${id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchPickupPoints();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  return (
    <NgoLayout title="Pickup Points">
      <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Action Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '24px', fontWeight: 800, color: '#2c2320' }}>
              NGO Distribution & Pickup Points
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#786d66' }}>
              Manage community collection hubs across Dhaka and nearby regions for receiver meal pickups.
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
            <span>Add New Pickup Point</span>
          </button>
        </div>

        {/* Content / Cards Grid */}
        {loading ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '40px', textAlign: 'center', color: '#888' }}>
            Loading pickup points from database...
          </div>
        ) : points.length === 0 ? (
          /* Empty State */
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
            <div style={{ fontSize: '38px', marginBottom: '14px' }}>📍</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 700, color: '#2c2320' }}>
              No pickup points registered yet.
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#786d66' }}>
              Configure your organization's distribution centers in Dhaka where receivers can collect meals safely.
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
              + Add New Pickup Point
            </button>
          </div>
        ) : (
          /* 2-Column Responsive Grid matching Figma 8:27113 */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '22px' }}>
            {points.map((pt) => {
              const isActive = pt.status === 'Active';
              return (
                <div
                  key={pt.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
                    border: '1px solid rgba(44, 35, 32, 0.06)',
                    display: 'flex',
                    flexDirection: 'column'
                  }}
                >
                  {/* Top Illustration Area */}
                  <div
                    style={{
                      height: '130px',
                      background: isActive
                        ? 'linear-gradient(135deg, #e6f7ef 0%, #d1fae5 100%)'
                        : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      position: 'relative'
                    }}
                  >
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '22px',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
                      }}
                    >
                      📍
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isActive ? '#059669' : '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {isActive ? 'Active Distribution Hub' : 'Inactive Hub'}
                    </span>
                  </div>

                  {/* Details Area */}
                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between', gap: '16px' }}>
                    <div>
                      {/* Name & Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#2c2320' }}>
                          {pt.name}
                        </h3>
                        <span
                          style={{
                            padding: '3px 12px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            background: isActive ? '#ecfdf5' : '#f3f4f6',
                            color: isActive ? '#047857' : '#6b7280',
                            border: `1px solid ${isActive ? '#a7f3d0' : '#e5e7eb'}`
                          }}
                        >
                          {pt.status}
                        </span>
                      </div>

                      {/* Address in Bangladesh */}
                      <div style={{ fontSize: '13px', color: '#6b5d56', marginBottom: '14px', lineHeight: 1.4 }}>
                        {pt.address}
                      </div>

                      {/* Info Chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#786d66' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🕒</span>
                          <span>{pt.operating_hours || '8 AM – 9 PM'}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📦</span>
                          <span>{pt.active_items || 0} items available</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons Row matching Figma */}
                    <div style={{ display: 'flex', gap: '10px', paddingTop: '12px', borderTop: '1px solid rgba(44, 35, 32, 0.06)' }}>
                      <button
                        onClick={() => handleOpenEditModal(pt)}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid rgba(44, 35, 32, 0.15)',
                          background: '#ffffff',
                          color: '#2c2320',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                        onMouseOut={(e) => (e.currentTarget.style.background = '#ffffff')}
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleToggleStatus(pt.id)}
                        style={{
                          flex: 1,
                          padding: '8px 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: isActive ? '#fee2e2' : '#ecfdf5',
                          color: isActive ? '#dc2626' : '#047857',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.opacity = '0.85';
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.opacity = '1';
                        }}
                      >
                        {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Add / Edit Pickup Point Modal */}
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
                {editingPoint ? 'Edit Pickup Point' : 'Add New Pickup Point'}
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
                  Hub Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dhanmondi Community Hub"
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
                  Address in Bangladesh *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. House 24, Road 27, Dhanmondi, Dhaka"
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
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="8 AM – 9 PM"
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
                    Available Items
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={activeItems}
                    onChange={(e) => setActiveItems(e.target.value)}
                    placeholder="5"
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
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid rgba(44, 35, 32, 0.15)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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
                  {submitting ? 'Saving...' : editingPoint ? 'Save Changes' : 'Create Hub'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </NgoLayout>
  );
};

export default PickupPoints;
