import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import NgoLayout from '../../components/ngo/NgoLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';

export const CollectionRequests = () => {
  const { user, token } = useAuth();
  const [collectionItems, setCollectionItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [pickupPoints, setPickupPoints] = useState([]);
  const activePickupPoints = pickupPoints.filter((point) => String(point.status || '').toLowerCase() === 'active');
  const [pickupPointsError, setPickupPointsError] = useState('');
  const [showQuickPointForm, setShowQuickPointForm] = useState(false);
  const [quickPointName, setQuickPointName] = useState('');
  const [quickPointAddress, setQuickPointAddress] = useState('');
  const [creatingPickupPoint, setCreatingPickupPoint] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  // Modals state
  const [assignModalItem, setAssignModalItem] = useState(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');

  const [pickupModalItem, setPickupModalItem] = useState(null);
  const [atHubModalItem, setAtHubModalItem] = useState(null);
  const [selectedHubStaffId, setSelectedHubStaffId] = useState('');

  const [distributeModalItem, setDistributeModalItem] = useState(null);
  const [selectedPickupPointId, setSelectedPickupPointId] = useState('');
  const [totalPackets, setTotalPackets] = useState('');
  const [distributionPrice, setDistributionPrice] = useState('');
  const [selectedNeeds, setSelectedNeeds] = useState(['Cooked Meal', 'Halal']);

  const [handoverModalItem, setHandoverModalItem] = useState(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [handoverQuantity, setHandoverQuantity] = useState(1);
  const [pickupCodeInput, setPickupCodeInput] = useState('');
  const [handoverError, setHandoverError] = useState(null);
  const [handoverSuccess, setHandoverSuccess] = useState(null);
  const [codeVerifying, setCodeVerifying] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeMatchMessage, setCodeMatchMessage] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const fetchCollectionItems = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/ngo-pickup-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCollectionItems(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching NGO pickup requests:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchStaffList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/ngo/staff`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching staff list:', err);
    }
  }, [token]);

  const fetchPickupPoints = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/pickup-points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPickupPoints(Array.isArray(data.data) ? data.data : []);
        setPickupPointsError('');
      } else {
        setPickupPoints([]);
        const message = await res.text();
        setPickupPointsError('Pickup points could not be loaded. Please refresh this page and try again.');
        console.error('Could not load pickup points:', res.status, message);
      }
    } catch (err) {
      setPickupPoints([]);
      setPickupPointsError('Could not connect to load pickup points. Check your connection and try again.');
      console.error('Error fetching pickup points:', err);
    }
  }, [token]);

  const handleQuickCreatePickupPoint = async () => {
    if (!quickPointName.trim() || !quickPointAddress.trim()) {
      showToast('Enter the pickup point name and real street address.', 'error');
      return;
    }
    setCreatingPickupPoint(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pickup-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: quickPointName.trim(),
          address: quickPointAddress.trim(),
          status: 'Active'
        })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Could not create the pickup point.', 'error');
        return;
      }
      const newPoint = data.data;
      setPickupPoints((current) => [newPoint, ...current.filter((point) => String(point.id) !== String(newPoint.id))]);
      setSelectedPickupPointId(String(newPoint.id));
      setQuickPointName('');
      setQuickPointAddress('');
      setShowQuickPointForm(false);
      showToast('Pickup point created and selected.');
    } catch (err) {
      console.error('Error creating pickup point:', err);
      showToast('Could not connect to create the pickup point.', 'error');
    } finally {
      setCreatingPickupPoint(false);
    }
  };

  useEffect(() => {
    fetchCollectionItems();
    fetchStaffList();
    fetchPickupPoints();
  }, [fetchCollectionItems, fetchStaffList, fetchPickupPoints]);

  // Action: Assign receiving staff
  const handleAssignStaff = async (e) => {
    e.preventDefault();
    if (!selectedStaffId) {
      showToast('Please select a staff member to assign.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${assignModalItem.id}/assign-staff`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ staff_id: parseInt(selectedStaffId, 10) })
      });
      if (res.ok) {
        showToast('🚚 Receiving staff assigned successfully!');
        setAssignModalItem(null);
        setActiveTab('approved'); // keep card in Approved & Assigned tab
        fetchCollectionItems();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to assign staff.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Receiving staff confirms food picked up from donor
  const handleConfirmPickedUp = async (itemId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${itemId}/mark-picked-up`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: parseInt(pickupModalItem?.assigned_staff_id || user?.id, 10)
        })
      });
      if (res.ok) {
        setPickupModalItem(null);
        showToast('📦 Marked as Picked Up! Moved to "Picked Up" tab.');
        setActiveTab('picked_up'); // Automatically switch tab so card stays on screen!
        fetchCollectionItems();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to mark as picked up.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Distributor staff confirms verified at hub
  const handleConfirmAtHub = async (itemId) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${itemId}/mark-at-hub`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          staff_id: parseInt(selectedHubStaffId || user?.id, 10)
        })
      });
      if (res.ok) {
        setAtHubModalItem(null);
        showToast('🏢 Food verified and safely stored at NGO Hub!');
        setActiveTab('at_hub'); // Automatically switch tab so card stays on screen!
        fetchCollectionItems();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to mark at hub.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Post food for distribution
  const handlePostDistribution = async (e) => {
    e.preventDefault();
    const price = Number(distributionPrice);
    if (!selectedPickupPointId || !totalPackets || !distributionPrice || !Number.isFinite(price) || price <= 0) {
      showToast('Please select a pickup point, enter the available packets, and set a price above BDT 0.', 'error');
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${distributeModalItem.id}/post-distributing`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          pickup_point_id: selectedPickupPointId,
          total_packets: parseInt(totalPackets, 10),
          needs_options: selectedNeeds,
          price_per_portion_bdt: price,
        })
      });
      if (res.ok) {
        showToast('🍲 Food posted for distribution! Now visible on Find Food.');
        setDistributeModalItem(null);
        setActiveTab('distributing'); // Keep card visible in Distributing tab
        fetchCollectionItems();
      } else {
        const err = await res.json();
        showToast(err.message || 'Failed to post for distribution.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to connect to server.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Look up & verify receiver pickup code, auto-filling beneficiary info with food-scoping & quantity validation
  const verifyReceiverCode = async (rawCode) => {
    const code = (rawCode !== undefined ? rawCode : pickupCodeInput).trim().toUpperCase();
    if (!code) {
      setCodeVerified(false);
      setCodeMatchMessage(null);
      setHandoverError('Please enter a receiver pickup code.');
      return;
    }
    setCodeVerifying(true);
    setHandoverError(null);
    setCodeMatchMessage(null);
    try {
      const queryParams = new URLSearchParams();
      if (handoverModalItem?.id) queryParams.append('collection_id', handoverModalItem.id);
      if (handoverModalItem?.food_post_id) queryParams.append('food_post_id', handoverModalItem.food_post_id);

      const url = `${API_BASE_URL}/food-requests/lookup-code/${code}?${queryParams.toString()}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.valid && data.data) {
        setCodeVerified(true);
        setCodeMatchMessage(data.message || `✓ Matched: ${data.data.receiver_name} (${data.data.requested_quantity || 1} portions requested)`);
        setHandoverError(null);
        // Automatically fill the infos (all remain editable)
        if (data.data.receiver_name) setReceiverName(data.data.receiver_name);
        if (data.data.receiver_phone) setReceiverPhone(data.data.receiver_phone);
        if (data.data.requested_quantity) {
          const maxRemaining = handoverModalItem?.remaining_packets != null ? handoverModalItem.remaining_packets : (handoverModalItem?.post_quantity || 1);
          setHandoverQuantity(Math.min(data.data.requested_quantity, maxRemaining));
        }
      } else {
        setCodeVerified(false);
        setCodeMatchMessage(null);
        setHandoverError(data.message || `Invalid pickup code "${code}". No matching receiver request found.`);
      }
    } catch (err) {
      console.error(err);
      setCodeVerified(false);
      setCodeMatchMessage(null);
      setHandoverError('Failed to verify code. Please check server connection.');
    } finally {
      setCodeVerifying(false);
    }
  };

  // Action: Handover packets to a receiver
  const handleHandoverPackets = async (e) => {
    e.preventDefault();
    setHandoverError(null);

    const cleanCode = pickupCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setHandoverError('Receiver pickup code is required. Without code match no one can take food.');
      return;
    }
    if (!codeVerified) {
      setHandoverError('Please verify a valid matching receiver pickup code first. Without code match no one can take food.');
      return;
    }

    const name = receiverName.trim();
    if (!name) {
      setHandoverError('Please enter the receiver / beneficiary name.');
      return;
    }
    const maxAllowed = handoverModalItem.remaining_packets != null 
      ? handoverModalItem.remaining_packets 
      : (handoverModalItem.post_quantity || 1);
    const qty = parseInt(handoverQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setHandoverError('Please enter a valid packet quantity (at least 1).');
      return;
    }
    if (qty > maxAllowed) {
      setHandoverError(`Cannot handover more than remaining packets (${maxAllowed}).`);
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/food-requests/${handoverModalItem.id}/handover`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiver_name: name,
          receiver_phone: receiverPhone.trim(),
          quantity: qty,
          pickup_code: pickupCodeInput.trim().toUpperCase()
        })
      });
      if (res.ok) {
        const data = await res.json();
        const rem = data.data?.remaining_packets != null ? data.data.remaining_packets : Math.max(0, maxAllowed - qty);
        
        setHandoverSuccess(`Successfully handed over ${qty} packet${qty > 1 ? 's' : ''} to ${name}! Remaining: ${rem} packets.`);
        showToast(`🤝 Handed over ${qty} packet${qty > 1 ? 's' : ''}! Remaining: ${rem}`, 'success');

        setTimeout(() => {
          setHandoverModalItem(null);
          setReceiverName('');
          setReceiverPhone('');
          setPickupCodeInput('');
          setHandoverQuantity(1);
          setHandoverSuccess(null);
          setHandoverError(null);
          if (rem <= 0) {
            setActiveTab('distributed'); // Move to Distributed tab if all handed over
          } else {
            setActiveTab('distributing'); // Keep in Distributing tab
          }
          fetchCollectionItems();
        }, 1200);
      } else {
        const err = await res.json();
        setHandoverError(err.message || 'Handover failed.');
      }
    } catch (err) {
      console.error(err);
      setHandoverError('Failed to connect to server. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter tabs
  const tabs = [
    { label: 'All', key: 'All' },
    { label: 'Awaiting Donor', key: 'pickup_requested' },
    { label: 'Approved & Assigned', key: 'approved' },
    { label: 'Picked Up', key: 'picked_up' },
    { label: 'At Hub', key: 'at_hub' },
    { label: 'Distributing', key: 'distributing' },
    { label: 'Distributed', key: 'distributed' }
  ];

  const filteredItems = collectionItems.filter((item) => {
    const s = (item.status || '').toLowerCase();
    if (activeTab === 'All') return true;
    if (activeTab === 'approved') return s === 'approved' || s === 'assigned';
    return s === activeTab;
  });

  const getStatusBadge = (status) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'pickup_requested':
        return { bg: '#fffbeb', color: '#b45309', border: '#fde68a', label: '⏳ Waiting for Donor Acceptance' };
      case 'approved':
        return { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0', label: '✅ Donor Accepted Pickup' };
      case 'assigned':
        return { bg: 'var(--brand-soft)', color: 'var(--brand-primary-dark)', border: 'var(--brand-soft-border)', label: '🚚 Assigned for Pickup' };
      case 'picked_up':
        return { bg: '#f5f3ff', color: '#6d28d9', border: '#ddd6fe', label: '📦 Picked Up by Staff' };
      case 'at_hub':
        return { bg: '#fef3c7', color: '#92400e', border: '#fde68a', label: '🏢 Verified at NGO Hub' };
      case 'distributing':
        return { bg: '#fff7ed', color: '#c2410c', border: '#ffedd5', label: '🍲 Actively Distributing' };
      case 'distributed':
        return { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: '🎉 Fully Distributed' };
      case 'rejected':
        return { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', label: '❌ Donor Declined' };
      default:
        return { bg: '#f3f4f6', color: '#4b5563', border: '#e5e7eb', label: status };
    }
  };

  const isNgoAdmin = !user?.ngo_staff_role || user?.ngo_staff_role === 'admin';
  const isReceivingStaff = user?.ngo_staff_role === 'receiving_staff' || isNgoAdmin;
  const isDistributorStaff = user?.ngo_staff_role === 'distributor_staff' || isNgoAdmin;
  const receivingStaff = staffList.filter((staff) =>
    !staff.ngo_staff_role || staff.ngo_staff_role === 'receiving_staff'
  );
  // Let an NGO administrator handle pickup when no receiving staff are available.
  if (isNgoAdmin && user?.id && !receivingStaff.some((staff) => String(staff.id) === String(user.id))) {
    receivingStaff.unshift({ ...user, ngo_staff_role: 'admin' });
  }

  return (
    <NgoLayout title="Collection Requests">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            top: 24,
            right: 24,
            background: toastType === 'error' ? '#ef4444' : '#10b981',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: toastType === 'error'
              ? '0 8px 24px rgba(239, 68, 68, 0.35)'
              : '0 8px 24px rgba(16, 185, 129, 0.35)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {toastType === 'error' ? '⚠️' : '✓'} {toastMessage}
          </div>
        )}

        {/* Top Header Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '22px 28px',
          border: '1px solid rgba(44, 35, 32, 0.06)',
          boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 800, color: '#2c2320', fontFamily: "'Fraunces', serif" }}>
              Food Collection & Distribution Pipeline
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#786d66' }}>
              Track donations from initial request ➔ donor approval ➔ staff pickup ➔ hub inspection ➔ packet distribution.
            </p>
          </div>

          <Link
            to="/ngo/incoming"
            style={{
              background: 'var(--brand-primary)',
              color: '#ffffff',
              textDecoration: 'none',
              padding: '10px 20px',
              borderRadius: '14px',
              fontSize: '13px',
              fontWeight: 700,
              boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.3)'
            }}
          >
            + Browse Incoming Donations
          </Link>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid var(--brand-primary)' : '1px solid rgba(44, 35, 32, 0.1)',
                  background: isActive ? 'var(--brand-primary)' : '#ffffff',
                  color: isActive ? '#ffffff' : '#6b5d56',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Collection Cards List */}
        {loading ? (
          <div style={{ background: '#ffffff', borderRadius: '20px', padding: '50px', textAlign: 'center', color: '#786d66' }}>
            Loading collection requests from database...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            padding: '50px 24px',
            textAlign: 'center',
            border: '1px solid rgba(44, 35, 32, 0.06)',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)'
          }}>
            <div style={{ fontSize: '36px', marginBottom: 12 }}>🚚</div>
            <h4 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 700, color: '#2c2320' }}>
              No collection requests found
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#786d66' }}>
              Request food donations from the Incoming Donations page to start the collection pipeline.
            </p>
            <Link
              to="/ngo/incoming"
              style={{
                background: 'var(--brand-primary)',
                color: '#fff',
                padding: '10px 22px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '13px'
              }}
            >
              Browse Incoming Donations
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filteredItems.map((item) => {
              const statusCfg = getStatusBadge(item.status);
              const status = (item.status || '').toLowerCase();
              const remaining = item.remaining_packets != null ? item.remaining_packets : (item.post_quantity || item.total_packets || 0);
              const total = item.total_packets || item.post_quantity || 1;
              const percentDone = Math.min(100, Math.round(((total - remaining) / total) * 100));

              return (
                <div
                  key={item.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '20px',
                    padding: '24px',
                    border: '1px solid rgba(44, 35, 32, 0.08)',
                    boxShadow: '0 4px 18px rgba(44, 35, 32, 0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                  }}
                >
                  {/* Top Bar: Food Info & Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                          🍱 {item.food_name || item.food_title || (item.food_type ? `${item.food_type} Meals` : 'Food Donation')}
                        </h3>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand-primary)' }}>
                          · {item.post_quantity} portions
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: '#786d66', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span>👤 Donor: <strong>{item.donor_name || 'Donor'}</strong> (+880 {item.donor_phone || '01700000000'})</span>
                        <span>·</span>
                        <span>📍 Location: <strong>{item.thana || item.district || 'Dhaka'}</strong></span>
                        {item.pickup_code && (
                          <>
                            <span>·</span>
                            <span>🔑 Pickup Code: <code style={{ background: '#f5f3f0', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>{item.pickup_code}</code></span>
                          </>
                        )}
                      </div>
                    </div>

                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 14px',
                      borderRadius: '999px',
                      background: statusCfg.bg,
                      color: statusCfg.color,
                      border: `1px solid ${statusCfg.border}`,
                      fontSize: '12px',
                      fontWeight: 800
                    }}>
                      <span>●</span>
                      <span>{statusCfg.label}</span>
                    </div>
                  </div>

                  {/* Dynamic Status Progress / Details Box */}
                  <div style={{
                    background: '#faf7f4',
                    borderRadius: '14px',
                    padding: '14px 18px',
                    border: '1px solid rgba(44, 35, 32, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}>
                    {/* Assigned Info */}
                    {item.assigned_staff_name && (
                      <div style={{ fontSize: '13px', color: 'var(--brand-primary-deep)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🚚</span>
                        <span><strong>{item.assigned_staff_name}</strong> assigned for pickup {item.assigned_staff_phone ? `(${item.assigned_staff_phone})` : ''}</span>
                      </div>
                    )}

                    {/* Picked up info */}
                    {(item.picked_up_staff_name || (status !== 'pickup_requested' && status !== 'approved' && status !== 'assigned' && item.assigned_staff_name)) && (
                      <div style={{ fontSize: '13px', color: '#5b21b6', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>📦</span>
                        <span>Picked up by <strong>{item.picked_up_staff_name || item.assigned_staff_name}</strong></span>
                      </div>
                    )}

                    {/* At Hub info */}
                    {item.hub_staff_name && (
                      <div style={{ fontSize: '13px', color: '#92400e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>🏢</span>
                        <span>Inspected & confirmed at NGO Hub by <strong>{item.hub_staff_name}</strong></span>
                      </div>
                    )}

                    {/* Distributing Packets Counter */}
                    {(status === 'distributing' || status === 'distributed') && (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                          <span>Distribution Progress ({item.pickup_point_name || 'Designated Point'})</span>
                          <span>{total - remaining} of {total} packets given ({remaining} remaining)</span>
                        </div>
                        <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${percentDone}%`, height: '100%', background: percentDone === 100 ? '#10b981' : 'var(--brand-primary)', transition: 'width 0.3s' }} />
                        </div>

                        {/* Recent Handover History */}
                        {Array.isArray(item.distribution_logs) && item.distribution_logs.length > 0 && (
                          <div style={{ marginTop: 10, borderTop: '1px solid rgba(44,35,32,0.06)', paddingTop: 8 }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b5d56', marginBottom: 6 }}>
                              📋 Beneficiary Handover Log:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {item.distribution_logs.slice(-3).reverse().map((log, idx) => (
                                <div key={idx} style={{ fontSize: '12px', color: '#374151', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>👤 {log.receiver_name} ({log.receiver_phone || 'Direct'})</span>
                                  <span><strong>+{log.quantity} packets</strong> {log.pickup_code ? `· Code: ${log.pickup_code}` : ''}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lifecycle Action Buttons */}
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(44, 35, 32, 0.05)' }}>
                    
                    {/* 1. Approved -> Assign Staff (Admin or Receiving Staff) */}
                    {(status === 'approved' || status === 'assigned') && isNgoAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssignModalItem(item);
                          setSelectedStaffId(item.assigned_staff_id || '');
                        }}
                        style={{
                          background: 'var(--brand-primary)',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🚚 {item.assigned_staff_id ? 'Reassign Staff' : 'Assign Receiving Staff'}
                      </button>
                    )}

                    {/* 2. Assigned -> Mark as Picked Up (Receiving Staff or Admin) */}
                    {(status === 'assigned' || (status === 'approved' && isReceivingStaff)) && (
                      <button
                        type="button"
                        onClick={() => setPickupModalItem(item)}
                        disabled={actionLoading}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        📦 Mark as Picked Up
                      </button>
                    )}

                    {/* 3. Picked Up -> Mark At Hub (Distributor Staff or Admin) */}
                    {status === 'picked_up' && isDistributorStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setAtHubModalItem(item);
                          const distStaff = staffList.find(s => s.ngo_staff_role === 'distributor_staff');
                          setSelectedHubStaffId(distStaff ? distStaff.id : user?.id);
                        }}
                        disabled={actionLoading}
                        style={{
                          background: '#3b82f6',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🏢 Verify & Receive at Hub
                      </button>
                    )}

                    {/* 4. At Hub -> Post for Distribution (Distributor Staff or Admin) */}
                    {status === 'at_hub' && isDistributorStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setDistributeModalItem(item);
                          setTotalPackets(item.post_quantity || 50);
                          setDistributionPrice('');
                          if (pickupPoints.length > 0) {
                          setSelectedPickupPointId(activePickupPoints[0]?.id ? String(activePickupPoints[0].id) : '');
                          }
                        }}
                        style={{
                          background: '#f97316',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🍲 Post for Distribution
                      </button>
                    )}

                    {/* 5. Distributing -> Handover Packets (Distributor Staff or Admin) */}
                    {status === 'distributing' && remaining > 0 && isDistributorStaff && (
                      <button
                        type="button"
                        onClick={() => {
                          setHandoverModalItem(item);
                          setHandoverQuantity(1);
                          setReceiverName('');
                          setReceiverPhone('');
                          setPickupCodeInput('');
                          setHandoverError(null);
                          setHandoverSuccess(null);
                          setCodeVerifying(false);
                          setCodeVerified(false);
                          setCodeMatchMessage(null);
                        }}
                        style={{
                          background: '#10b981',
                          color: '#fff',
                          border: 'none',
                          padding: '9px 18px',
                          borderRadius: '12px',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        🤝 Handover Packets to Receiver
                      </button>
                    )}

                    {/* Completed Badge */}
                    {status === 'distributed' && (
                      <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 700 }}>
                        ✓ All portions fully served to beneficiaries
                      </span>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Assign Staff */}
        {assignModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                Assign Receiving Staff
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#786d66' }}>
                Select a team member to travel to the donor's location in {assignModalItem.thana || 'Dhaka'} and collect this food.
              </p>

              <form onSubmit={handleAssignStaff}>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                    Select Staff Member
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      fontSize: '14px',
                      background: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="">-- Choose staff member --</option>
                    {staffList.filter(s => !s.ngo_staff_role || s.ngo_staff_role === 'receiving_staff').map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.ngo_staff_role === 'receiving_staff' ? 'Receiving Staff' : 'NGO Member'}) · {s.phone}
                      </option>
                    ))}
                  </select>
                  {staffList.length === 0 && (
                    <div style={{ fontSize: '12px', color: '#d97706', marginTop: 6 }}>
                      Tip: You can add staff members from the Staff Directory on the NGO Dashboard.
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setAssignModalItem(null)}
                    style={{
                      padding: '9px 18px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    style={{
                      padding: '9px 22px',
                      background: 'var(--brand-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {actionLoading ? 'Assigning...' : 'Confirm Assignment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Confirm Food Picked Up from Donor */}
        {pickupModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3200,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.22)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  📦
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                    Confirm Food Picked Up
                  </h3>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Verify collection from donor before en route to NGO hub
                  </div>
                </div>
              </div>

              <div style={{
                background: '#faf7f4',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: 18,
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.6
              }}>
                <div><strong>Donation:</strong> {pickupModalItem.food_name || pickupModalItem.food_title || pickupModalItem.food_type || 'Cooked Meals'} ({pickupModalItem.post_quantity || 50} portions)</div>
                <div><strong>Donor:</strong> {pickupModalItem.donor_name} (+880 {pickupModalItem.donor_phone})</div>
                <div><strong>Location:</strong> {pickupModalItem.thana || 'Turag'}, {pickupModalItem.district || 'Dhaka'}</div>
                <div><strong>Pickup Code:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-primary)' }}>{pickupModalItem.pickup_code}</span></div>
                <div><strong>Collecting Staff:</strong> {pickupModalItem.assigned_staff_name || user?.name || 'Assigned Staff'}</div>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#374151' }}>
                Confirm that this food parcel has been collected from the donor? The card will immediately transition to the <strong>Picked Up</strong> stage.
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setPickupModalItem(null)}
                  style={{
                    padding: '10px 18px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleConfirmPickedUp(pickupModalItem.id)}
                  style={{
                    padding: '10px 24px',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  {actionLoading ? 'Updating...' : '✓ Confirm Picked Up'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Confirm Arrival & Quality at Hub */}
        {atHubModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3200,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.22)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'var(--brand-soft)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px'
                }}>
                  🏢
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                    Verify Arrival at NGO Hub
                  </h3>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    Inspect freshness & store safely at distribution hub
                  </div>
                </div>
              </div>

              <div style={{
                background: '#faf7f4',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: 18,
                fontSize: '13px',
                color: '#4b5563',
                lineHeight: 1.6
              }}>
                <div><strong>Donation:</strong> {atHubModalItem.food_name || atHubModalItem.food_title || atHubModalItem.food_type || 'Cooked Meals'} ({atHubModalItem.post_quantity || 50} portions)</div>
                <div><strong>Donor:</strong> {atHubModalItem.donor_name}</div>
                <div><strong>Picked Up By:</strong> {atHubModalItem.picked_up_staff_name || atHubModalItem.assigned_staff_name || 'Staff'}</div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                  Inspecting Distributor Staff *
                </label>
                <select
                  value={selectedHubStaffId}
                  onChange={(e) => setSelectedHubStaffId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1.5px solid #e5e7eb',
                    fontSize: '14px',
                    background: '#fff',
                    outline: 'none'
                  }}
                >
                  {staffList.filter(s => s.ngo_staff_role === 'distributor_staff').map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (Distributor Staff) · {s.phone}
                    </option>
                  ))}
                  <option value={user?.id}>
                    {user?.name} (NGO Administrator)
                  </option>
                </select>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#374151' }}>
                Confirm that this donation has arrived safely at your NGO Hub and passed quality inspection? It will transition to the <strong>At Hub</strong> stage.
              </p>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAtHubModalItem(null)}
                  style={{
                    padding: '10px 18px',
                    background: '#f3f4f6',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => handleConfirmAtHub(atHubModalItem.id)}
                  style={{
                    padding: '10px 24px',
                    background: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
                  }}
                >
                  {actionLoading ? 'Verifying...' : '✓ Confirm at Hub'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Post for Distribution */}
        {distributeModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3000,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                Post Food for Distribution
              </h3>
              <p style={{ margin: '0 0 18px', fontSize: '13px', color: '#786d66' }}>
                Set the pickup point, available quantity, and a fair price per portion. Receivers will see this price before adding the meal to their cart.
              </p>

              <form onSubmit={handlePostDistribution}>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                    Select NGO Pickup Point
                  </label>
                  <select
                    value={selectedPickupPointId}
                    onChange={(e) => setSelectedPickupPointId(e.target.value)}
                    required={activePickupPoints.length > 0}
                    disabled={activePickupPoints.length === 0}
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      fontSize: '14px',
                      background: '#fff',
                      outline: 'none'
                    }}
                  >
                    <option value="">
                      {activePickupPoints.length ? '-- Choose Pickup Point --' : 'No active pickup points available'}
                    </option>
                    {activePickupPoints.map((pt) => (
                      <option key={pt.id} value={pt.id}>
                        📍 {pt.name} — {pt.address} ({pt.operating_hours})
                      </option>
                    ))}
                  </select>
                  {pickupPointsError ? (
                    <p role="alert" style={{ margin: '8px 0 0', fontSize: '12px', color: '#b91c1c' }}>
                      {pickupPointsError} <button type="button" onClick={fetchPickupPoints} style={{ border: 0, background: 'none', color: 'var(--brand-primary)', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
                    </p>
                  ) : activePickupPoints.length === 0 && (
                    <div style={{ marginTop: 8, fontSize: '12px', color: '#9a3412' }}>
                      <p style={{ margin: '0 0 8px' }}>
                        Add or activate a pickup point before posting this food.{' '}
                        <Link to="/ngo/pickup-points" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>
                          Manage pickup points
                        </Link>
                      </p>
                      {!showQuickPointForm ? (
                        <button
                          type="button"
                          onClick={() => setShowQuickPointForm(true)}
                          style={{ padding: '7px 11px', border: '1px solid #fed7aa', borderRadius: 8, background: '#fff7ed', color: '#9a3412', fontWeight: 700, cursor: 'pointer' }}
                        >
                          + Create pickup point here
                        </button>
                      ) : (
                        <div style={{ display: 'grid', gap: 8, padding: 12, border: '1px solid #fed7aa', borderRadius: 10, background: '#fffaf5' }}>
                          <input
                            value={quickPointName}
                            onChange={(e) => setQuickPointName(e.target.value)}
                            placeholder="Pickup point name"
                            aria-label="Pickup point name"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid #e7d5c8', borderRadius: 8 }}
                          />
                          <input
                            value={quickPointAddress}
                            onChange={(e) => setQuickPointAddress(e.target.value)}
                            placeholder="Full street address"
                            aria-label="Full street address"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', padding: '9px 11px', border: '1px solid #e7d5c8', borderRadius: 8 }}
                          />
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button type="button" onClick={() => setShowQuickPointForm(false)} style={{ padding: '8px 12px', border: '1px solid #e7d5c8', borderRadius: 8, background: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button type="button" onClick={handleQuickCreatePickupPoint} disabled={creatingPickupPoint} style={{ padding: '8px 12px', border: 0, borderRadius: 8, background: 'var(--brand-primary)', color: '#fff', fontWeight: 700, cursor: creatingPickupPoint ? 'wait' : 'pointer' }}>
                              {creatingPickupPoint ? 'Creating…' : 'Create and select'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                    Available Packets / Portions
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={totalPackets}
                    onChange={(e) => setTotalPackets(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                    Price per portion (BDT)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    value={distributionPrice}
                    onChange={(e) => setDistributionPrice(e.target.value)}
                    required
                    placeholder="For example: 80.00"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: '12px', border: '1.5px solid #e5e7eb', fontSize: '14px', boxSizing: 'border-box' }}
                  />
                  <p style={{ margin: '7px 0 0', fontSize: '12px', color: '#786d66' }}>
                    Estimated total at this quantity: BDT {((Number(totalPackets) || 0) * (Number(distributionPrice) || 0)).toFixed(2)}
                  </p>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 8 }}>
                    Dietary & Needs Tags for Receivers
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Cooked Meal', 'Halal', 'Vegetarian', 'Children Friendly', 'Ready to Eat', 'Urgent'].map((tag) => {
                      const isSelected = selectedNeeds.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            setSelectedNeeds(prev => isSelected ? prev.filter(t => t !== tag) : [...prev, tag]);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '999px',
                            border: isSelected ? '1px solid var(--brand-primary)' : '1px solid #d1d5db',
                            background: isSelected ? 'var(--brand-primary)' : '#f9fafb',
                            color: isSelected ? '#fff' : '#4b5563',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {isSelected ? '✓ ' : '+ '}{tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setDistributeModalItem(null)}
                    style={{
                      padding: '9px 18px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || activePickupPoints.length === 0}
                    style={{
                      padding: '9px 24px',
                      background: 'var(--brand-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {actionLoading ? 'Posting...' : 'Post for Distribution'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Handover Packets */}
        {handoverModalItem && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3200,
            padding: 20
          }}>
            <div style={{
              background: '#fff',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '480px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.22)'
            }}>
              {handoverSuccess ? (
                <div style={{ textAlign: 'center', padding: '16px 10px' }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    margin: '0 auto 16px',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)'
                  }}>
                    ✓
                  </div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '19px', fontWeight: 800, color: '#065f46' }}>
                    Handover Recorded Successfully!
                  </h3>
                  <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#374151', lineHeight: 1.5 }}>
                    {handoverSuccess}
                  </p>
                  <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                    Updating distribution pipeline records...
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: '#ecfdf5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px'
                    }}>
                      🤝
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                        Beneficiary Packet Handover
                      </h3>
                      <div style={{ fontSize: '13px', color: '#4b5563', marginTop: '3px' }}>
                        Food: <strong style={{ color: '#111827' }}>{handoverModalItem.food_name || handoverModalItem.food_title || (handoverModalItem.food_type ? `${handoverModalItem.food_type} Meals` : 'Food Donation')}</strong> · Remaining Available: <strong style={{ color: '#059669' }}>{handoverModalItem.remaining_packets != null ? handoverModalItem.remaining_packets : (handoverModalItem.post_quantity || 0)}</strong> packets
                      </div>
                      <div style={{ fontSize: '11px', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '5px', fontWeight: 600 }}>
                        🔒 Food-Specific Scoping: Only pickup codes for this specific food can be accepted
                      </div>
                    </div>
                  </div>

                  {handoverError && (
                    <div style={{
                      background: '#fee2e2',
                      color: '#b91c1c',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 600,
                      marginBottom: 16,
                      border: '1px solid #fecaca',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>⚠️</span>
                      <span>{handoverError}</span>
                    </div>
                  )}

                  <form onSubmit={handleHandoverPackets}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                        <label style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>
                          Receiver Pickup Code <span style={{ color: '#ef4444' }}>* Required</span>
                        </label>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>
                          e.g. SM-SKDHQQ
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input
                          type="text"
                          required
                          placeholder="SM-XXXXXX"
                          value={pickupCodeInput}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setPickupCodeInput(val);
                            setCodeVerified(false);
                            setCodeMatchMessage(null);
                            setHandoverError(null);
                            if (val.trim().length >= 6) {
                              if (window.pickupLookupTimer) clearTimeout(window.pickupLookupTimer);
                              window.pickupLookupTimer = setTimeout(() => {
                                verifyReceiverCode(val);
                              }, 350);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              verifyReceiverCode();
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: codeVerified ? '1.5px solid #10b981' : '1.5px solid #e5e7eb',
                            background: codeVerified ? '#f0fdf4' : '#fff',
                            fontSize: '14px',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            boxSizing: 'border-box'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => verifyReceiverCode()}
                          disabled={codeVerifying || !pickupCodeInput.trim()}
                          style={{
                            padding: '10px 16px',
                            background: codeVerified ? '#10b981' : '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: codeVerifying ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {codeVerifying ? 'Checking...' : codeVerified ? '✓ Matched' : 'Verify Code'}
                        </button>
                      </div>

                      {codeMatchMessage && (
                        <div style={{
                          marginTop: 8,
                          padding: '8px 12px',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          borderRadius: '10px',
                          fontSize: '12px',
                          color: '#065f46',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>{codeMatchMessage}</span>
                          <span style={{ fontSize: '11px', color: '#047857', fontWeight: 500 }}>
                            (Infos auto-filled & editable below)
                          </span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                        Receiver Name / Beneficiary *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Fatima Begum"
                        value={receiverName}
                        onChange={(e) => setReceiverName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: '1.5px solid #e5e7eb',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                          Phone (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="017xxxxxxxx"
                          value={receiverPhone}
                          onChange={(e) => setReceiverPhone(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #e5e7eb',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div style={{ width: '130px' }}>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: 6 }}>
                          Packets Given *
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={handoverModalItem.remaining_packets != null ? handoverModalItem.remaining_packets : (handoverModalItem.post_quantity || 1)}
                          value={handoverQuantity}
                          onChange={(e) => setHandoverQuantity(e.target.value)}
                          required
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            border: '1.5px solid #e5e7eb',
                            fontSize: '14px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setHandoverModalItem(null)}
                        style={{
                          padding: '9px 18px',
                          background: '#f3f4f6',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading || !codeVerified}
                        style={{
                          padding: '9px 24px',
                          background: !codeVerified ? '#9ca3af' : '#10b981',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          fontWeight: 700,
                          cursor: !codeVerified ? 'not-allowed' : 'pointer',
                          boxShadow: codeVerified ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}
                      >
                        {actionLoading ? 'Processing...' : !codeVerified ? '🔒 Valid Code Required' : 'Confirm Handover'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}


      </div>
    </NgoLayout>
  );
};

export default CollectionRequests;
