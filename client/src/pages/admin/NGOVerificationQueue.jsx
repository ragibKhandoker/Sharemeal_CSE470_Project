import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import TempPasswordModal from '../../components/admin/TempPasswordModal';
import { API_BASE_URL } from '../../utils/constants';
import '../../App.css';

export const NGOVerificationQueue = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusMsg, setStatusMsg] = useState('');

  // Selected User Profile Pop-up Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  const [passwordResetStatus, setPasswordResetStatus] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching NGO staff users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleVerify = async (userId, newStatus) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/ngo-verify/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification update failed');

      setStatusMsg(`NGO User #${userId} status updated to ${newStatus}`);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Error updating NGO user status');
    }
  };

  const handleAdminResetPassword = async () => {
    if (!selectedUser || passwordResetLoading) return;
    if (!window.confirm(`Create a temporary password for ${selectedUser.name}? Any earlier temporary password stops working.`)) return;

    setPasswordResetLoading(true);
    setPasswordResetStatus('');

    try {
      const res = await fetch(`${API_BASE_URL}/admin/reset-password/${selectedUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Password reset failed');

      if (!data.messageSent) setTempPasswordResult(data);
      setPasswordResetStatus(`✅ ${data.message}`);
    } catch (err) {
      setPasswordResetStatus(`❌ ${err.message}`);
    } finally {
      setPasswordResetLoading(false);
    }
  };

  // Filter ONLY for NGO Admin, Collection Staff, Distributor Staff, and NGO role
  const ngoRoles =['ngo', 'ngo_admin', 'collection_staff', 'distributor_staff', 'ngo admin', 'collection staff', 'distributor staff'];

  const filteredNgoUsers = users.filter((u) => {
    const isNgoRole = ngoRoles.includes((u.role || '').toLowerCase()) || (u.role || '').toLowerCase().includes('ngo') || (u.role || '').toLowerCase().includes('staff');
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);
    const matchesFilter = roleFilter === 'all' ? isNgoRole : (u.role || '').toLowerCase().includes(roleFilter.toLowerCase());
    return isNgoRole && matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout title="NGO Panel">
      <div style={{ width: '100%' }}>

        {statusMsg && (
          <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
            {statusMsg}
          </div>
        )}

        {/* Search Bar & Dropdown Filter */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, height: '42px' }}>
            <input
              type="text"
              placeholder="Search NGO partner, collection, distributor staff…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px solid rgba(44, 35, 32, 0.1)',
                background: '#ffffff',
                fontSize: '14px',
                color: '#2c2320',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            />
          </div>

          <div style={{ width: '180px', height: '42px' }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 16px',
                borderRadius: '12px',
                border: '1px solid rgba(44, 35, 32, 0.1)',
                background: '#ffffff',
                fontSize: '14px',
                fontWeight: 400,
                color: '#2c2320',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <option value="all">All NGO Roles</option>
              <option value="ngo">NGO Partner / Admin</option>
              <option value="collection">Collection Staff</option>
              <option value="distributor">Distributor Staff</option>
            </select>
          </div>
        </div>

        {/* Full-width SectionCard Table */}
        <div
          style={{
            width: '100%',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(44, 35, 32, 0.05)',
            overflow: 'hidden',
            boxShadow: '0px 2px 4px rgba(44,35,32,0.03), 0px 12px 28px -12px rgba(var(--brand-primary-rgb), 0.18)'
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    height: '40.5px',
                    background: '#ffffff',
                    borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
                    color: '#6b5d56',
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none'
                  }}
                >
                  <th style={{ paddingLeft: '24px', verticalAlign: 'middle' }}>Staff / Organization</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Role</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Mobile</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Email</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Status</th>
                  <th style={{ paddingRight: '24px', verticalAlign: 'middle', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#6b5d56', fontSize: '14px' }}>Loading NGO database...</td>
                  </tr>
                ) : filteredNgoUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#6b5d56', fontSize: '14px' }}>No NGO staff or partners found.</td>
                  </tr>
                ) : (
                  filteredNgoUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        height: '49.5px',
                        borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Name */}
                      <td style={{ paddingLeft: '24px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#2c2320', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.name}
                        </div>
                      </td>

                      {/* Role Pill */}
                      <td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: '#e3f5ea',
                            color: '#227a55',
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block',
                            textTransform: 'capitalize',
                            lineHeight: '16px'
                          }}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Mobile */}
                      <td style={{ paddingLeft: '16px', verticalAlign: 'middle', fontSize: '14px', color: '#6b5d56', whiteSpace: 'nowrap' }}>
                        {user.phone}
                      </td>

                      {/* Email */}
                      <td style={{ paddingLeft: '16px', verticalAlign: 'middle', fontSize: '14px', color: '#6b5d56', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.email || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: user.verification_status === 'verified' ? 'rgba(63, 185, 132, 0.14)' : 'rgba(245, 183, 62, 0.14)',
                            color: user.verification_status === 'verified' ? '#227a55' : '#9a6b12',
                            padding: '4px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: user.verification_status === 'verified' ? '#3fb984' : '#f5b73e'
                            }}
                          />
                          {user.verification_status === 'verified' ? 'Active' : 'Pending'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ paddingRight: '24px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedUser(user);
                              setPasswordResetStatus('');
                            }}
                            style={{
                              background: 'transparent',
                              border: 0,
                              color: 'var(--brand-primary-dark)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            View
                          </button>

                          {user.verification_status !== 'verified' ? (
                            <button
                              type="button"
                              onClick={() => handleVerify(user.id, 'verified')}
                              style={{
                                background: '#10b981',
                                color: '#ffffff',
                                border: 0,
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Verify
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleVerify(user.id, 'pending')}
                              style={{
                                background: 'transparent',
                                border: '1px solid #fed7aa',
                                color: '#c2410c',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11px',
                                fontWeight: 500,
                                cursor: 'pointer'
                              }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pop-up Profile Modal */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: '540px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#2c2320', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee5e0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>🏢</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>NGO Staff Credentials &amp; Verification</h3>
              </div>
              <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', background: '#fcf8f6', padding: '16px', borderRadius: '14px', border: '1px solid #eee5e0', marginBottom: '16px' }}>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>User ID:</span>
                <strong>#{selectedUser.id}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Name / Org:</span>
                <strong>{selectedUser.name}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>NGO Role:</span>
                <strong style={{ textTransform: 'capitalize', color: '#227a55' }}>{selectedUser.role}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Mobile Number:</span>
                <strong>{selectedUser.phone}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Email Address:</span>
                <strong>{selectedUser.email || 'None'}</strong>
              </div>

              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Verification Status:</span>
                <strong style={{ color: selectedUser.verification_status === 'verified' ? '#047857' : '#c2410c' }}>
                  {selectedUser.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending'}
                </strong>
              </div>
            </div>

            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', marginBottom: '6px' }}>
                🔑 Reset Password for {selectedUser.name}
              </div>

              {passwordResetStatus && (
                <div style={{ fontSize: '12px', padding: '8px', borderRadius: '8px', background: '#ffffff', border: '1px solid #fdba74', marginBottom: '10px' }}>
                  {passwordResetStatus}
                </div>
              )}

              <p style={{ fontSize: '12px', color: '#7c2d12', margin: '0 0 10px', lineHeight: 1.5 }}>
                Admins never choose or see a user's password. This creates a one-time temporary password; the user must set a new password when they log in.
              </p>
              <button
                type="button"
                onClick={handleAdminResetPassword}
                disabled={passwordResetLoading}
                style={{ background: '#ea580c', color: '#ffffff', border: 0, borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: passwordResetLoading ? 'not-allowed' : 'pointer', opacity: passwordResetLoading ? 0.7 : 1 }}
              >
                {passwordResetLoading ? 'Generating...' : '🔑 Generate temporary password'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                style={{ background: '#f3f4f6', color: '#374151', border: 0, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Pop-up
              </button>

              {selectedUser.verification_status !== 'verified' && (
                <button
                  type="button"
                  onClick={() => {
                    handleVerify(selectedUser.id, 'verified');
                    setSelectedUser(null);
                  }}
                  style={{ background: '#10b981', color: '#ffffff', border: 0, borderRadius: '10px', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve &amp; Verify NGO Staff →
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      <TempPasswordModal result={tempPasswordResult} onClose={() => setTempPasswordResult(null)} />
    </AdminLayout>
  );
};

export default NGOVerificationQueue;
