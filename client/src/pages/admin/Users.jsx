import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TempPasswordModal from '../../components/admin/TempPasswordModal';
import SendResetMessageModal from '../../components/admin/SendResetMessageModal';
import { API_BASE_URL } from '../../utils/constants';
import messageService from '../../services/messageService';
import AdminLayout from '../../components/admin/AdminLayout';
import '../../App.css';

export const AdminUsers = () => {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Tab state: 'users' | 'password-requests'
  const [activeTab, setActiveTab] = useState('users');
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [pwActionLoading, setPwActionLoading] = useState(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusMsg, setStatusMsg] = useState('');

  // Selected User Profile Pop-up Modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [tempPasswordResult, setTempPasswordResult] = useState(null);
  // { request, regenerate } while the approve / resend dialog is open
  const [messageDialog, setMessageDialog] = useState(null);
  const [passwordResetStatus, setPasswordResetStatus] = useState('');
  const [passwordResetLoading, setPasswordResetLoading] = useState(false);
  const [userMessageText, setUserMessageText] = useState('');
  const [userMessageStatus, setUserMessageStatus] = useState('');
  const [userMessageLoading, setUserMessageLoading] = useState(false);
  const [userConversation, setUserConversation] = useState([]);
  const [userConversationLoading, setUserConversationLoading] = useState(false);
  const [userConversationError, setUserConversationError] = useState('');

  // Deletion & batch cleanup state
  const [deletingId, setDeletingId] = useState(null);
  const [batchDeleting, setBatchDeleting] = useState(false);

  const closeUserProfile = () => {
    setSelectedUser(null);
    setUserMessageText('');
    setUserMessageStatus('');

    const params = new URLSearchParams(location.search);
    if (params.has('userId')) {
      params.delete('userId');
      const searchString = params.toString();
      navigate(
        { pathname: location.pathname, search: searchString ? `?${searchString}` : '' },
        { replace: true }
      );
    }
  };

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
      console.error('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPasswordRequests = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/password-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setPasswordRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error fetching password requests:', err);
    }
  };

  useEffect(() => {
    if (!selectedUser || !['donor', 'receiver'].includes(selectedUser.role)) {
      setUserConversation([]);
      setUserConversationError('');
      return undefined;
    }

    let active = true;
    setUserConversationLoading(true);
    setUserConversationError('');
    messageService.getAdminConversation(selectedUser.id)
      .then((response) => {
        if (active) setUserConversation(response.data || []);
      })
      .catch((err) => {
        if (active) setUserConversationError(err.response?.data?.message || 'Could not load this conversation.');
      })
      .finally(() => {
        if (active) setUserConversationLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedUser?.id, selectedUser?.role]);

  useEffect(() => {
    fetchUsers();
    fetchPasswordRequests();
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'password-requests') {
      setActiveTab('password-requests');
    }
  }, [location.search]);

  useEffect(() => {
    const userId = Number(new URLSearchParams(location.search).get('userId'));
    if (!Number.isInteger(userId) || userId <= 0) return;
    const matchingUser = users.find((user) => Number(user.id) === userId);
    if (matchingUser && selectedUser?.id !== matchingUser.id) {
      setSelectedUser(matchingUser);
    }
  }, [location.search, users, selectedUser?.id]);

  // Approve a pending request, or replace the temporary password of an approved one.
  const handleApprovePasswordRequest = async (requestId, regenerate = false, note = '') => {
    setPwActionLoading(requestId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/password-requests/${requestId}/${regenerate ? 'regenerate' : 'approve'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Approval failed');

      setMessageDialog(null);
      // Sealed messages never reveal the password; older requests show it once.
      if (!data.messageSent) setTempPasswordResult(data);
      setStatusMsg(`✅ ${data.message}`);
      await fetchPasswordRequests();
    } catch (err) {
      alert(err.message || 'Failed to approve request');
    } finally {
      setPwActionLoading(null);
    }
  };

  const handleRejectPasswordRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to decline this password reset request?')) return;
    setPwActionLoading(requestId);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/password-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ adminNote: 'Declined by Super Admin' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Rejection failed');

      setStatusMsg(`❌ Password request declined.`);
      await fetchPasswordRequests();
    } catch (err) {
      alert(err.message || 'Failed to reject request');
    } finally {
      setPwActionLoading(null);
    }
  };


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
      setStatusMsg(`User ID #${userId} status updated to ${newStatus}`);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteInactiveUser = async (userToDelete) => {
    const days = userToDelete.inactive_days != null ? userToDelete.inactive_days : 0;
    let force = false;

    let confirmText = `⚠️ PERMANENT ACCOUNT DELETION\n\nAre you sure you want to permanently delete user "${userToDelete.name}" (#${userToDelete.id})?\n\n• Role: ${userToDelete.role.toUpperCase()}\n• Last Active: ${days} day(s) ago\n\nThis will permanently remove the user and all their associated records. This action cannot be undone.`;

    if (days < 90) {
      confirmText = `⚠️ PERMANENT USER DELETION\n\nUser "${userToDelete.name}" (#${userToDelete.id}) was active ${days} day(s) ago (< 90 days).\n\nAs Super Admin, do you want to permanently delete this user account now?\n\nThis action cannot be undone.`;
      force = true;
    }

    if (!window.confirm(confirmText)) {
      return;
    }

    setDeletingId(userToDelete.id);
    try {
      const url = `${API_BASE_URL}/admin/users/${userToDelete.id}${force ? '?force=true' : ''}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete user');

      setStatusMsg(data.message);
      if (selectedUser?.id === userToDelete.id) {
        closeUserProfile();
      }
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteInactiveBatch = async () => {
    const eligibleCount = users.filter((u) => u.is_inactive_eligible).length;
    const confirmText = `⚠️ BATCH INACTIVE ACCOUNT CLEANUP\n\nAre you sure you want to permanently delete all ${eligibleCount} users who have been inactive for at least 3 months (90+ days)?\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmText)) {
      return;
    }

    setBatchDeleting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/delete-inactive-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to batch delete inactive users');

      setStatusMsg(data.message);
      await fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to batch delete inactive users');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleSimulateInactivity = async (userId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/simulate-inactivity`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to simulate inactivity');

      setStatusMsg(`⏱️ ${data.message}`);
      await fetchUsers();
      if (selectedUser?.id === userId) {
        setSelectedUser({ ...selectedUser, is_inactive_eligible: true, inactive_days: 100 });
      }
    } catch (err) {
      alert(err.message || 'Failed to simulate inactivity');
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

  const handleSendUserMessage = async (e) => {
    e.preventDefault();
    if (!selectedUser || !userMessageText.trim()) return;

    setUserMessageLoading(true);
    setUserMessageStatus('');
    try {
      await messageService.sendAdminMessage({
        receiver_id: selectedUser.id,
        message_text: userMessageText.trim()
      });
      setUserMessageStatus(`Message sent to ${selectedUser.name}.`);
      setUserMessageText('');
      const response = await messageService.getAdminConversation(selectedUser.id);
      setUserConversation(response.data || []);
    } catch (err) {
      setUserMessageStatus(err.response?.data?.message || 'Could not send the message. Please try again.');
    } finally {
      setUserMessageLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const isNotAdmin = u.role !== 'admin' && u.role !== 'super_admin';
    const matchesSearch =
      (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.phone || '').includes(search);

    const matchesRole = roleFilter === 'all' ? isNotAdmin : (u.role || '').toLowerCase() === roleFilter.toLowerCase();

    return isNotAdmin && matchesSearch && matchesRole;
  });

  const pendingRequestsCount = passwordRequests.filter((r) => r.status === 'pending').length;

  return (
    <AdminLayout title="Users">
      <div style={{ width: '100%' }}>

        {statusMsg && (
          <div style={{ background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '16px', fontWeight: 600 }}>
            {statusMsg}
          </div>
        )}

        {/* Top Navigation Tab Switcher */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(44,35,32,0.08)', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'users' ? '#2c2320' : '#f4edea',
              color: activeTab === 'users' ? '#ffffff' : '#6b5d56',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>👥 All Platform Users</span>
            <span style={{
              background: activeTab === 'users' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px'
            }}>
              {filteredUsers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('password-requests')}
            style={{
              padding: '10px 20px',
              borderRadius: '12px',
              border: 'none',
              background: activeTab === 'password-requests' ? '#2c2320' : '#f4edea',
              color: activeTab === 'password-requests' ? '#ffffff' : '#6b5d56',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease'
            }}
          >
            <span>🔑 Password Reset Requests</span>
            {pendingRequestsCount > 0 ? (
              <span style={{
                background: 'var(--brand-primary)',
                color: '#ffffff',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                {pendingRequestsCount} Pending
              </span>
            ) : (
              <span style={{
                background: activeTab === 'password-requests' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11px'
              }}>
                {passwordRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: All Users Table */}
        {activeTab === 'users' && (
          <>
            {/* Figma 42px Search Bar & Dropdown Control Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', width: '100%', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, height: '42px' }}>
            <input
              type="text"
              placeholder="Search name, email or mobile…"
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

          <div style={{ width: '220px', height: '42px' }}>
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
                fontWeight: 600,
                color: '#2c2320',
                outline: 'none',
                cursor: 'pointer',
                boxSizing: 'border-box',
                fontFamily: "'Plus Jakarta Sans', sans-serif"
              }}
            >
              <option value="all">All Users</option>
              <option value="donor">Donor</option>
              <option value="receiver">Receiver</option>
              <option value="ngo">NGO</option>
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
            <table style={{ width: '100%', minWidth: '860px', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                  <th style={{ paddingLeft: '24px', verticalAlign: 'middle' }}>Name</th>
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
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#6b5d56', fontSize: '14px' }}>Loading users database...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '32px', textAlign: 'center', color: '#6b5d56', fontSize: '14px' }}>No users match your search or filter.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      style={{
                        height: '49.5px',
                        borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
                        background: 'transparent',
                        transition: 'background 0.15s'
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.background = '#fcf8f6')}
                      onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* Column 1: Name */}
                      <td style={{ paddingLeft: '24px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                        <div title={user.name} style={{ maxWidth: '220px', fontWeight: 600, fontSize: '14px', color: '#2c2320', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.name}
                        </div>
                      </td>

                      {/* Column 2: Role Pill */}
                      <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: user.role === 'admin' ? '#ffe9e2' : user.role === 'ngo' ? '#e3f5ea' : user.role === 'donor' ? '#ffe9e2' : '#fff2d6',
                            color: user.role === 'admin' ? 'var(--brand-primary-deep)' : user.role === 'ngo' ? '#227a55' : user.role === 'donor' ? 'var(--brand-primary-deep)' : '#a06c00',
                            padding: '3px 10px',
                            borderRadius: '100px',
                            fontSize: '12px',
                            fontWeight: 600,
                            display: 'inline-block',
                            whiteSpace: 'nowrap',
                            textTransform: 'capitalize',
                            lineHeight: '16px'
                          }}
                        >
                          {user.role}
                        </span>
                      </td>

                      {/* Column 3: Mobile */}
                      <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle', fontSize: '14px', color: '#6b5d56', whiteSpace: 'nowrap' }}>
                        {user.phone}
                      </td>

                      {/* Column 4: Email */}
                      <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle', fontSize: '14px', color: '#6b5d56' }}>
                        <div title={user.email || ''} style={{ maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.email || '—'}
                        </div>
                      </td>

                      {/* Column 5: Status Pill */}
                      <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
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
                            gap: '6px',
                            whiteSpace: 'nowrap'
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

                      {/* Column 6: Action Buttons */}
                      <td style={{ paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
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
                              padding: '4px 6px'
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
      </>
    )}

    {/* Tab 2: Password Reset Requests Management Table */}
    {activeTab === 'password-requests' && (
      <div style={{ width: '100%' }}>
        <div style={{ background: '#f8fafc', border: '1px solid #f2e7e1', borderRadius: '16px', padding: '16px 20px', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#2c2320', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔑</span> In-App Password Reset Requests
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b5d56' }}>
              Approve a request to send the user a one-time temporary message with a temporary password. Only the user can open it with their secret request code.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchPasswordRequests}
            style={{
              background: '#ffffff',
              border: '1px solid rgba(44,35,32,0.12)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#2c2320',
              cursor: 'pointer'
            }}
          >
            🔄 Refresh Requests
          </button>
        </div>

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
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr
                  style={{
                    height: '42px',
                    background: '#ffffff',
                    borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
                    color: '#6b5d56',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                >
                  <th style={{ paddingLeft: '24px', verticalAlign: 'middle' }}>User</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Role</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Identifier (Phone / Email)</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Reason / Note</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Requested At</th>
                  <th style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>Status</th>
                  <th style={{ paddingRight: '24px', textAlign: 'right', verticalAlign: 'middle', width: '280px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {passwordRequests.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: '#9a8d85', fontSize: '13px' }}>
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔑</div>
                      No password reset requests found. All clear!
                    </td>
                  </tr>
                ) : (
                  passwordRequests.map((req) => {
                    const isPending = req.status === 'pending';
                    const isApproved = req.status === 'approved';
                    const isCompleted = req.status === 'completed';
                    const isRejected = req.status === 'rejected';

                    const roleBadgeColor =
                      req.user_role === 'donor'
                        ? { bg: '#fff7ed', color: '#c2410c' }
                        : req.user_role === 'ngo'
                        ? { bg: '#ecfdf5', color: '#047857' }
                        : { bg: 'var(--brand-soft)', color: 'var(--brand-primary-dark)' };

                    return (
                      <tr
                        key={req.id}
                        style={{
                          borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
                          fontSize: '13px',
                          background: isPending ? '#fffdfb' : '#ffffff'
                        }}
                      >
                        <td style={{ paddingLeft: '24px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                          <strong style={{ color: '#2c2320' }}>{req.user_name}</strong>
                          <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', maxWidth: '220px', overflowWrap: 'anywhere', lineHeight: 1.4 }}>{req.user_email || 'No email'} · User #{req.user_id}</div>
                        </td>
                        <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              background: roleBadgeColor.bg,
                              color: roleBadgeColor.color,
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              padding: '3px 10px',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'capitalize'
                            }}
                          >
                            {req.user_role}
                          </span>
                        </td>
                        <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                          <code style={{ display: 'inline-block', maxWidth: '220px', overflowWrap: 'anywhere', lineHeight: 1.5, background: '#f1f5f9', color: '#334155', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                            {req.identifier}
                          </code>
                        </td>
                        <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle', maxWidth: '240px' }}>
                          <span style={{ display: 'block', color: '#555', lineHeight: 1.45, overflowWrap: 'anywhere', fontStyle: req.reason ? 'normal' : 'italic' }}>
                            {req.reason ? `"${req.reason}"` : 'None provided'}
                          </span>
                        </td>
                        <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle', color: '#6b5d56', fontSize: '12px', whiteSpace: 'nowrap' }}>
                          {req.requested_at ? new Date(req.requested_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Recent'}
                        </td>
                        <td style={{ paddingLeft: '16px', paddingTop: '12px', paddingBottom: '12px', verticalAlign: 'middle' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              padding: '4px 10px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              background: isPending ? '#fff7ed' : isApproved ? 'var(--brand-soft)' : isCompleted ? '#ecfdf5' : '#fef2f2',
                              color: isPending ? '#c2410c' : isApproved ? 'var(--brand-primary-dark)' : isCompleted ? '#047857' : '#991b1b',
                              border: '1px solid currentColor'
                            }}
                          >
                            {isPending ? '⏳ Pending' : isApproved ? '✓ Approved' : isCompleted ? '✓ Completed' : '✕ Rejected'}
                          </span>
                        </td>
                        <td style={{ paddingRight: '24px', paddingTop: '12px', paddingBottom: '12px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  disabled={pwActionLoading === req.id}
                                  onClick={() => setMessageDialog({ request: req, regenerate: false })}
                                  style={{
                                    background: '#10b981',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '6px 14px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    boxShadow: '0 2px 6px rgba(16,185,129,0.25)'
                                  }}
                                >
                                  {pwActionLoading === req.id ? 'Approving...' : '✓ Approve'}
                                </button>
                                <button
                                  type="button"
                                  disabled={pwActionLoading === req.id}
                                  onClick={() => handleRejectPasswordRequest(req.id)}
                                  style={{
                                    background: '#ffffff',
                                    color: '#dc2626',
                                    border: '1px solid #fecaca',
                                    borderRadius: '8px',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  ✕ Decline
                                </button>
                              </>
                            )}

                            {isApproved && (
                              <>
                                <span style={{ flexBasis: '100%', textAlign: 'right', fontSize: '11px', lineHeight: 1.4, color: req.temp_password_active ? '#6b5d56' : '#b91c1c' }}>
                                  {req.temp_password_active
                                    ? `Temp password valid until ${new Date(req.temp_password_expires_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                    : 'Temp password expired'}
                                </span>
                                {req.has_message_code && (
                                  <span style={{ flexBasis: '100%', textAlign: 'right', fontSize: '11px', lineHeight: 1.4, fontWeight: 600, color: req.temp_message_viewed_at ? '#047857' : '#1d4ed8' }}>
                                    {req.temp_message_viewed_at
                                      ? `✓ Message opened ${new Date(req.temp_message_viewed_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                      : req.message_waiting ? '📨 Message sent — not opened yet' : 'Message destroyed (too many wrong codes)'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  disabled={pwActionLoading === req.id}
                                  onClick={() => setMessageDialog({ request: req, regenerate: true })}
                                  style={{
                                    background: 'var(--brand-soft)',
                                    color: 'var(--brand-primary-dark)',
                                    border: '1px solid var(--brand-soft-border)',
                                    borderRadius: '8px',
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {pwActionLoading === req.id ? 'Sending...' : req.has_message_code ? '🔄 Send new message' : '🔄 New temporary password'}
                                </button>
                                <button
                                  type="button"
                                  disabled={pwActionLoading === req.id}
                                  onClick={() => handleRejectPasswordRequest(req.id)}
                                  style={{ background: '#ffffff', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '8px', padding: '5px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                                >
                                  ✕ Cancel
                                </button>
                              </>
                            )}

                            {isCompleted && (
                              <span style={{ fontSize: '12px', color: '#047857', fontWeight: 600 }}>
                                ✓ Password Updated
                              </span>
                            )}

                            {isRejected && (
                              <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 600 }}>
                                ✕ Request Declined
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )}
  </div>

      {/* Super Admin Pop-up Modal: User Full Profile & Password Display */}
      {selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div style={{ width: '100%', maxWidth: '540px', background: '#ffffff', borderRadius: '20px', padding: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.3)', color: '#2c2320', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #eee5e0', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>👤</span>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>User Profile &amp; Security Credentials</h3>
              </div>
              <button onClick={closeUserProfile} style={{ background: 'transparent', border: 0, fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            </div>

            {/* Profile Details Card */}
            <div style={{ display: 'grid', gap: '10px', fontSize: '13px', background: '#fcf8f6', padding: '16px', borderRadius: '14px', border: '1px solid #eee5e0', marginBottom: '16px' }}>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>User ID:</span>
                <strong>#{selectedUser.id}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Full Name:</span>
                <strong>{selectedUser.name}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>System Role:</span>
                <strong style={{ textTransform: 'capitalize', color: 'var(--brand-primary-dark)' }}>{selectedUser.role}</strong>
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
                <span style={{ color: '#6b5d56' }}>NID Number:</span>
                <strong>{selectedUser.nid || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>NID Document:</span>
                {selectedUser.has_nid_pdf ? (
                  <a
                    href={`${API_BASE_URL}/admin/nid-document/${selectedUser.id}?token=${encodeURIComponent(token || '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#10b981', fontWeight: 700, textDecoration: 'underline' }}
                  >
                    📄 View NID document →
                  </a>
                ) : (
                  <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No PDF document attached</span>
                )}
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Pickup Address:</span>
                <strong>{selectedUser.address || 'Not provided'}</strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Verification Status:</span>
                <strong style={{ color: selectedUser.verification_status === 'verified' ? '#047857' : '#c2410c' }}>
                  {selectedUser.verification_status === 'verified' ? '✓ Verified' : '⏳ Pending Admin Approval'}
                </strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Last Active:</span>
                <strong style={{ fontSize: '13px', color: '#2c2320' }}>
                  {selectedUser.last_active_at || selectedUser.last_login || selectedUser.created_at ? (
                    (() => {
                      const d = new Date(selectedUser.last_active_at || selectedUser.last_login || selectedUser.created_at);
                      const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
                      return `${dateStr} at ${timeStr}`;
                    })()
                  ) : (
                    'Not recorded'
                  )}
                </strong>
              </div>
              <div className="admin-detail-row">
                <span style={{ color: '#6b5d56' }}>Inactive since:</span>
                <strong style={{ fontSize: '14px', color: (selectedUser.inactive_days || 0) >= 90 ? '#dc2626' : '#2c2320' }}>
                  {selectedUser.inactive_days != null ? (
                    selectedUser.inactive_days === 0
                      ? '0 days (Active today)'
                      : `${selectedUser.inactive_days} ${selectedUser.inactive_days === 1 ? 'day' : 'days'}`
                  ) : 'Active today'}
                </strong>
              </div>

              {selectedUser.role !== 'admin' && selectedUser.role !== 'super_admin' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px', marginTop: '2px', borderTop: '1px solid #f0e8e4' }}>
                  <button
                    type="button"
                    disabled={deletingId === selectedUser.id}
                    onClick={() => handleDeleteInactiveUser(selectedUser)}
                    style={{
                      background: '#dc2626',
                      color: '#ffffff',
                      border: 0,
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: deletingId === selectedUser.id ? 'not-allowed' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = '#b91c1c')}
                    onMouseOut={(e) => (e.currentTarget.style.background = '#dc2626')}
                  >
                    {deletingId === selectedUser.id ? 'Deleting...' : '🗑️ Delete User'}
                  </button>
                </div>
              )}
            </div>

            {(selectedUser.role === 'donor' || selectedUser.role === 'receiver') && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '14px', padding: '16px', marginTop: '14px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e40af', marginBottom: '8px' }}>
                  Conversation with {selectedUser.name}
                </div>
                {userConversationLoading ? (
                  <p style={{ margin: '0 0 10px', color: '#64748b', fontSize: '12px' }}>Loading conversation...</p>
                ) : userConversationError ? (
                  <p role="alert" style={{ margin: '0 0 10px', color: '#b91c1c', fontSize: '12px' }}>{userConversationError}</p>
                ) : (
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto', marginBottom: '12px' }}>
                    {userConversation.length === 0 ? (
                      <p style={{ margin: '0 0 4px', color: '#64748b', fontSize: '12px' }}>No messages in this conversation yet.</p>
                    ) : userConversation.map((message) => {
                      const fromAdmin = ['admin', 'super_admin'].includes((message.sender_role || '').toLowerCase());
                      return (
                        <article key={message.id} style={{ justifySelf: fromAdmin ? 'start' : 'end', maxWidth: '90%', background: fromAdmin ? '#ffffff' : '#dbeafe', border: `1px solid ${fromAdmin ? '#d1d5db' : '#bfdbfe'}`, borderRadius: '10px', padding: '9px 11px' }}>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: fromAdmin ? '#047857' : '#1d4ed8', marginBottom: '4px' }}>
                            {fromAdmin ? (message.sender_name || 'Admin') : 'User'} · {new Date(message.sent_at).toLocaleString()}
                          </div>
                          <p style={{ margin: 0, color: '#2c2320', fontSize: '12px', lineHeight: 1.45, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message.message_text}</p>
                        </article>
                      );
                    })}
                  </div>
                )}
                {userMessageStatus && (
                  <p role="status" style={{ margin: '0 0 8px', color: userMessageStatus.startsWith('Message sent') ? '#047857' : '#b91c1c', fontSize: '12px' }}>
                    {userMessageStatus}
                  </p>
                )}
                <form onSubmit={handleSendUserMessage} style={{ display: 'grid', gap: '8px' }}>
                  <textarea
                    value={userMessageText}
                    onChange={(e) => setUserMessageText(e.target.value)}
                    placeholder="Ask the user to review or update their profile..."
                    maxLength={2000}
                    rows={3}
                    required
                    style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', padding: '10px 12px', borderRadius: '8px', border: '1px solid #93c5fd', fontSize: '13px', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '11px' }}>{userMessageText.length}/2000</span>
                    <button
                      type="submit"
                      disabled={userMessageLoading || !userMessageText.trim()}
                      style={{ background: '#2563eb', color: '#ffffff', border: 0, borderRadius: '8px', padding: '9px 14px', fontSize: '12px', fontWeight: 700, cursor: userMessageLoading ? 'wait' : 'pointer' }}
                    >
                      {userMessageLoading ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Super Admin Password Change Form */}
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '14px', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#9a3412', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={closeUserProfile}
                style={{ background: '#f3f4f6', color: '#374151', border: 0, borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Close Pop-up
              </button>

              {selectedUser.verification_status !== 'verified' && (
                <button
                  type="button"
                  onClick={() => {
                    handleVerify(selectedUser.id, 'verified');
                    closeUserProfile();
                  }}
                  style={{ background: '#10b981', color: '#ffffff', border: 0, borderRadius: '10px', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Approve &amp; Verify User →
                </button>
              )}
            </div>

          </div>
        </div>
      )}
      <TempPasswordModal result={tempPasswordResult} onClose={() => setTempPasswordResult(null)} />
      <SendResetMessageModal
        request={messageDialog?.request}
        regenerate={messageDialog?.regenerate}
        busy={Boolean(messageDialog && pwActionLoading === messageDialog.request.id)}
        onSend={(note) => handleApprovePasswordRequest(messageDialog.request.id, messageDialog.regenerate, note)}
        onClose={() => setMessageDialog(null)}
      />
    </AdminLayout>
  );
};

export default AdminUsers;
