import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';

export const Reports = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, investigating: 0, resolved: 0, dismissed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Resolution Modal State
  const [selectedReport, setSelectedReport] = useState(null);
  const [newStatus, setNewStatus] = useState('pending');
  const [actionTaken, setActionTaken] = useState('No Action Needed');
  const [adminNotes, setAdminNotes] = useState('');
  const [savingResolution, setSavingResolution] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saveError, setSaveError] = useState('');

  const fetchReports = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (searchTerm.trim()) queryParams.append('search', searchTerm.trim());

      const res = await fetch(`${API_BASE_URL}/food-reports?${queryParams.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch (err) {
      console.error('Error fetching food reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token, statusFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchReports();
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const handleOpenResolutionModal = (report) => {
    setSelectedReport(report);
    setNewStatus(report.status || 'pending');
    setActionTaken(report.action_taken || 'Warned Donor Regarding Food Storage');
    setAdminNotes(report.admin_notes || '');
    setSaveSuccess('');
    setSaveError('');
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setSavingResolution(true);
    setSaveSuccess('');
    setSaveError('');

    try {
      const res = await fetch(`${API_BASE_URL}/food-reports/${selectedReport.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          action_taken: actionTaken,
          admin_notes: adminNotes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update report resolution.');
      }

      setSaveSuccess('Report updated and reporter has been notified.');
      setTimeout(() => {
        setSelectedReport(null);
        setSaveSuccess('');
        fetchReports();
      }, 1200);
    } catch (err) {
      setSaveError(err.message || 'Error updating report resolution.');
    } finally {
      setSavingResolution(false);
    }
  };

  const getStatusBadge = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return { label: '⏳ Pending Review', bg: '#fff7ed', color: '#c2410c', border: '#fdba74' };
      case 'investigating':
        return { label: '🔍 Under Investigation', bg: 'var(--brand-soft)', color: 'var(--brand-primary-dark)', border: '#93c5fd' };
      case 'resolved':
        return { label: '✅ Resolved', bg: '#ecfdf5', color: '#047857', border: '#6ee7b7' };
      case 'dismissed':
        return { label: 'ℹ️ Dismissed', bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' };
      default:
        return { label: status, bg: '#fff7ed', color: '#c2410c', border: '#fdba74' };
    }
  };

  return (
    <AdminLayout title="Food Reports">
      <div style={{ maxWidth: '1240px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Page Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 800, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
              🍲 Food Quality &amp; Safety Reports
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#6b5d56' }}>
              Inspect receiver complaints and safety reports regarding donated meals. Investigate incidents and take administrative action.
            </p>
          </div>

          <button
            type="button"
            onClick={fetchReports}
            style={{
              padding: '9px 18px',
              borderRadius: '12px',
              border: '1px solid rgba(44,35,32,0.12)',
              background: '#ffffff',
              fontSize: '13px',
              fontWeight: 700,
              color: '#2c2320',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
            }}
          >
            🔄 Refresh Feed
          </button>
        </div>

        {/* 4 Metric Summary Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#6b5d56' }}>Total Incidents</span>
              <span style={{ fontSize: '20px' }}>🚩</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#2c2320', marginTop: '8px' }}>
              {counts.total}
            </div>
            <div style={{ fontSize: '12px', color: '#8c7e75', marginTop: '4px' }}>All recorded meal safety reports</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#c2410c' }}>Pending Review</span>
              <span style={{ fontSize: '20px' }}>⏳</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#c2410c', marginTop: '8px' }}>
              {counts.pending}
            </div>
            <div style={{ fontSize: '12px', color: '#8c7e75', marginTop: '4px' }}>Awaiting admin action</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--brand-primary-dark)' }}>Under Investigation</span>
              <span style={{ fontSize: '20px' }}>🔍</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-primary-dark)', marginTop: '8px' }}>
              {counts.investigating}
            </div>
            <div style={{ fontSize: '12px', color: '#8c7e75', marginTop: '4px' }}>In communication with donor</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '16px', padding: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#047857' }}>Resolved &amp; Closed</span>
              <span style={{ fontSize: '20px' }}>✅</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#047857', marginTop: '8px' }}>
              {counts.resolved + counts.dismissed}
            </div>
            <div style={{ fontSize: '12px', color: '#8c7e75', marginTop: '4px' }}>Actions taken / completed</div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ background: '#ffffff', borderRadius: '16px', padding: '16px 20px', border: '1px solid rgba(44,35,32,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: `All (${counts.total})` },
              { id: 'pending', label: `Pending (${counts.pending})` },
              { id: 'investigating', label: `Investigating (${counts.investigating})` },
              { id: 'resolved', label: `Resolved (${counts.resolved})` },
              { id: 'dismissed', label: `Dismissed (${counts.dismissed})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  background: statusFilter === tab.id ? 'var(--brand-primary)' : '#f5eee9',
                  color: statusFilter === tab.id ? '#ffffff' : '#6b5d56',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search food, donor, receiver..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '12px',
                border: '1px solid rgba(44,35,32,0.12)',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: '#998d85' }}>
              🔍
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', cursor: 'pointer', color: '#888' }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Reports Table Container */}
        <div style={{ background: '#ffffff', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 20px rgba(44,35,32,0.03)' }}>
          {loading ? (
            <div style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: '14px' }}>
              ⏳ Loading food safety reports...
            </div>
          ) : reports.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#786d66' }}>
              <div style={{ fontSize: '38px', marginBottom: '12px' }}>🛡️</div>
              <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                No Food Reports Found
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#786d66' }}>
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filter or search query.'
                  : 'All distributed food has met quality standards. No incidents filed.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(44,35,32,0.06)', background: '#faf6f3' }}>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>Report ID</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>Reported Food &amp; Donor</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>Filed By (Receiver)</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>Incident Category</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase' }}>Status</th>
                    <th style={{ padding: '16px 20px', fontSize: '12px', fontWeight: 700, color: '#786d66', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report, index) => {
                    const badge = getStatusBadge(report.status);
                    const formattedDate = report.created_at
                      ? new Date(report.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })
                      : 'Recently';

                    return (
                      <tr
                        key={report.id}
                        style={{
                          borderBottom: index < reports.length - 1 ? '1px solid rgba(44,35,32,0.05)' : 'none',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = '#fdfbf9')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '16px 20px', fontSize: '13px', color: '#6b5d56', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 800, color: '#2c2320' }}>#FR-{report.id}</span>
                          <div style={{ fontSize: '11px', color: '#998d85', marginTop: '2px' }}>{formattedDate}</div>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 800, color: '#2c2320', fontSize: '14px' }}>
                            🍲 {report.food_name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '3px' }}>
                            Donor: <strong>{report.resolved_donor_name || 'Community Donor'}</strong>
                            {report.donor_phone && <span> · 📞 {report.donor_phone}</span>}
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          <div style={{ fontWeight: 700, color: '#2c2320' }}>
                            👤 {report.reporter_name || 'Anonymous Receiver'}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '2px' }}>
                            {report.reporter_phone || report.reporter_email || 'No contact provided'}
                          </div>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                fontSize: '11px',
                                fontWeight: 700
                              }}
                            >
                              ⚠️ {report.reason}
                            </span>
                            {report.proof_image_url && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  background: '#ecfdf5',
                                  color: '#047857',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  border: '1px solid #a7f3d0'
                                }}
                                title="Photo proof submitted by receiver"
                              >
                                📷 Photo Proof
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              margin: '4px 0 0',
                              fontSize: '12px',
                              color: '#554a43',
                              lineHeight: '16px',
                              maxWidth: '300px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={report.description}
                          >
                            "{report.description}"
                          </p>
                        </td>

                        <td style={{ padding: '16px 20px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                          <span
                            style={{
                              padding: '5px 12px',
                              borderRadius: '20px',
                              background: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '16px 20px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenResolutionModal(report)}
                            style={{
                              padding: '7px 14px',
                              borderRadius: '10px',
                              background: '#2c2320',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                              transition: 'background 0.15s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--brand-primary)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = '#2c2320')}
                          >
                            Review &amp; Action →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit & Resolution Modal */}
        {selectedReport && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.65)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '16px'
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: '20px 28px',
                  background: '#faf6f3',
                  borderBottom: '1px solid rgba(44,35,32,0.08)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase' }}>
                    Incident Investigation
                  </span>
                  <h3 style={{ margin: '2px 0 0', fontSize: '19px', fontWeight: 800, color: '#2c2320' }}>
                    Report #FR-{selectedReport.id}: {selectedReport.food_name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  style={{ background: 'transparent', border: 'none', fontSize: '22px', color: '#888', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Incident Information Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                  {/* Food & Donor Box */}
                  <div style={{ background: '#f8fafc', border: '1px solid #f2e2d8', borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#c2410c', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Donated Food &amp; Donor
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#2c2320' }}>
                      🍲 {selectedReport.food_name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '4px' }}>
                      Donor: <strong>{selectedReport.resolved_donor_name || 'Community Donor'}</strong>
                    </div>
                    {selectedReport.donor_phone && (
                      <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '2px' }}>
                        Phone: {selectedReport.donor_phone}
                      </div>
                    )}
                    {selectedReport.donor_email && (
                      <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '2px' }}>
                        Email: {selectedReport.donor_email}
                      </div>
                    )}
                  </div>

                  {/* Reporter Box */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary-dark)', textTransform: 'uppercase', marginBottom: '6px' }}>
                      Filed by Receiver
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#2c2320' }}>
                      👤 {selectedReport.reporter_name || 'Receiver'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '4px' }}>
                      Phone: {selectedReport.reporter_phone || 'N/A'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b5d56', marginTop: '2px' }}>
                      Email: {selectedReport.reporter_email || 'N/A'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#998d85', marginTop: '4px' }}>
                      Filed: {new Date(selectedReport.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Complaint Details Card */}
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '14px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '16px' }}>⚠️</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>
                      Reported Issue: {selectedReport.reason}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#450a0a', lineHeight: '20px', whiteHeight: 'pre-wrap' }}>
                    "{selectedReport.description}"
                  </p>
                </div>

                {/* Attached Photo Proof Section */}
                {selectedReport.proof_image_url && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
                        📷 Attached Photo Evidence Submitted by Receiver
                      </span>
                      <a
                        href={selectedReport.proof_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontSize: '12px',
                          color: 'var(--brand-primary)',
                          fontWeight: 700,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        Open Full Image ↗
                      </a>
                    </div>
                    <div
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid #cbd5e1',
                        background: '#f1f5f9',
                        textAlign: 'center',
                        padding: '6px'
                      }}
                    >
                      <img
                        src={selectedReport.proof_image_url}
                        alt="Report Incident Proof"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '280px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          display: 'inline-block'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Administrative Resolution Form */}
                <form onSubmit={handleSaveResolution} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2c2320', borderBottom: '1px solid #f0e8e4', paddingBottom: '8px' }}>
                    ⚖️ Administrative Resolution
                  </div>

                  {saveError && (
                    <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 600 }}>
                      ⚠️ {saveError}
                    </div>
                  )}

                  {saveSuccess && (
                    <div style={{ background: '#ecfdf5', color: '#047857', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 700 }}>
                      ✅ {saveSuccess}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                        Update Status:
                      </label>
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(44,35,32,0.15)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#2c2320',
                          outline: 'none',
                          background: '#fff'
                        }}
                      >
                        <option value="pending">⏳ Pending Review</option>
                        <option value="investigating">🔍 Under Investigation</option>
                        <option value="resolved">✅ Resolved (Action Taken)</option>
                        <option value="dismissed">ℹ️ Dismissed (False Alarm / No Fault)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                        Action Taken:
                      </label>
                      <select
                        value={actionTaken}
                        onChange={(e) => setActionTaken(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: '1px solid rgba(44,35,32,0.15)',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#2c2320',
                          outline: 'none',
                          background: '#fff'
                        }}
                      >
                        <option value="Warned Donor Regarding Food Storage">Warned Donor Regarding Food Storage</option>
                        <option value="Donor Account Suspended / Flagged">Donor Account Suspended / Flagged</option>
                        <option value="Verified False Alarm / Food was Safe">Verified False Alarm / Food was Safe</option>
                        <option value="Replacement Meal / Receiver Assisted">Replacement Meal / Receiver Assisted</option>
                        <option value="Packaging Guidelines Reminded to NGO">Packaging Guidelines Reminded to NGO</option>
                        <option value="No Action Needed">No Action Needed</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                      Investigation Feedback / Notes (visible to receiver):
                    </label>
                    <textarea
                      rows={3}
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Contacted the donor to review cooking timeline. Cautioned against delayed packaging. Receiver confirmed safety."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid rgba(44,35,32,0.15)',
                        fontSize: '13px',
                        color: '#2c2320',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedReport(null)}
                      disabled={savingResolution}
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        border: '1px solid rgba(44,35,32,0.15)',
                        background: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#6b5d56',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingResolution}
                      style={{
                        padding: '10px 22px',
                        borderRadius: '10px',
                        border: 'none',
                        background: 'var(--brand-primary)',
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#ffffff',
                        cursor: savingResolution ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)'
                      }}
                    >
                      {savingResolution ? 'Saving Resolution...' : 'Save Resolution'}
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};

export default Reports;
