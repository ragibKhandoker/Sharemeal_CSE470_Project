import React, { useEffect, useState } from 'react';
import NgoLayout from '../../components/ngo/NgoLayout';
import PasswordResetRequestModal from '../../components/common/PasswordResetRequestModal';
import { useAuth } from '../../context/AuthContext';
import ngoService from '../../services/ngoService';

export const NgoProfile = () => {
  const { user, token, updateUser } = useAuth();

  const isStaff = Boolean(user?.ngo_staff_role);
  const isReceiver = user?.ngo_staff_role === 'receiving_staff';
  const isDistributor = user?.ngo_staff_role === 'distributor_staff';

  // Organization state for NGO Admins
  const [repName, setRepName] = useState(user?.name || 'Anisur Rahman');
  const [phone, setPhone] = useState(user?.phone || '01788776655');
  const [orgName, setOrgName] = useState('Care Bangladesh Food Rescue');
  const [regNo] = useState('NGO-DHAKA-2026-481');
  const [address, setAddress] = useState(user?.address || 'House 32, Road 11, Banani, Dhaka-1213, Bangladesh');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Staff member editable fields
  const [staffName, setStaffName] = useState(user?.name || '');
  const [staffPhone, setStaffPhone] = useState(user?.phone || '');
  const [staffAddress, setStaffAddress] = useState(user?.address || 'Dhaka, Bangladesh');

  const handleAdminSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleStaffSave = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    if (updateUser) {
      updateUser({
        ...user,
        name: staffName,
        phone: staffPhone,
        address: staffAddress
      });
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };


  const staffInitials = (user?.name || 'Staff Member')
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <NgoLayout title={isStaff ? 'Staff Profile' : 'Profile'}>
      <div style={{ maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* =========================================================================
            HEADER CARD
           ========================================================================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
            border: '1px solid rgba(44, 35, 32, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: isStaff
                  ? (isReceiver ? 'var(--brand-soft)' : '#ffedd5')
                  : 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-dark) 100%)',
                color: isStaff
                  ? (isReceiver ? 'var(--brand-primary-deep)' : '#9a3412')
                  : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 800,
                flexShrink: 0
              }}
            >
              {isStaff ? staffInitials : 'AR'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#2c2320' }}>
                  {isStaff ? (user?.name || 'Staff Member') : orgName}
                </h3>
                {isStaff ? (
                  <span
                    style={{
                      padding: '4px 12px',
                      borderRadius: '12px',
                      background: isReceiver ? 'var(--brand-soft)' : '#fff7ed',
                      color: isReceiver ? 'var(--brand-primary-deep)' : '#c2410c',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: `1px solid ${isReceiver ? 'var(--brand-soft-border)' : '#fed7aa'}`
                    }}
                  >
                    {isReceiver ? '🚚 Receiving Staff' : '🍲 Distributor Staff'}
                  </span>
                ) : (
                  <span
                    style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: '#ecfdf5',
                      color: '#047857',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0'
                    }}
                  >
                    ✓ Verified by Admin
                  </span>
                )}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#786d66' }}>
                {isStaff ? (
                  <span>
                    Staff ID: #{user?.id || '—'} · Field Operations · Care Bangladesh Food Rescue
                  </span>
                ) : (
                  <span>
                    Govt Reg: {regNo} · Operating Zone: Dhaka Division
                  </span>
                )}
              </p>
            </div>
          </div>

          {isStaff && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '8px 14px',
              fontSize: '12px',
              color: '#475569',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span>🔒</span>
              <span>Role Managed by NGO Admin</span>
            </div>
          )}
        </div>

        {/* =========================================================================
            PROFILE DETAILS CARD
           ========================================================================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '28px',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
            border: '1px solid rgba(44, 35, 32, 0.06)'
          }}
        >
          <h4 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: '#2c2320' }}>
            {isStaff ? 'Field Staff Profile & Information' : 'Organization & Contact Details'}
          </h4>
          <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#786d66' }}>
            {isStaff
              ? 'Your staff record registered with Care Bangladesh Food Rescue. Role reassignments can only be performed by your NGO Administrator.'
              : 'Official organizational parameters and headquarters contact information.'}
          </p>

          {savedSuccess && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '14px',
                background: '#ecfdf5',
                color: '#047857',
                fontSize: '13px',
                fontWeight: 700,
                border: '1px solid #a7f3d0',
                marginBottom: '18px'
              }}
            >
              ✓ Profile information updated successfully!
            </div>
          )}

          {isStaff ? (
            /* Staff Profile Form (Receiving Staff / Distributor Staff) */
            <form onSubmit={handleStaffSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Assigned Role (Strictly Read-Only with explanation) */}
              <div style={{
                background: isReceiver ? 'var(--brand-soft)' : '#fff7ed',
                border: `1.5px solid ${isReceiver ? 'var(--brand-soft-border)' : '#fed7aa'}`,
                borderRadius: '16px',
                padding: '16px 20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: isReceiver ? 'var(--brand-primary-deep)' : '#c2410c', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Assigned Operational Role
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569', background: '#ffffff', padding: '2px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    🔒 Read-Only (Admin Managed)
                  </span>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#2c2320', margin: '4px 0' }}>
                  {isReceiver
                    ? '🚚 Receiving Staff (Donor Pickup & Hub Transport)'
                    : '🍲 Distributor Staff (Hub Verification & Beneficiary Handover)'}
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: 6 }}>
                  Only your NGO Administrator can change your assigned role. Field staff members cannot self-reassign operational roles.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
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
                    Official Email (Login)
                  </label>
                  <input
                    type="email"
                    value={user?.email || 'staff@ngo.org'}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(44, 35, 32, 0.1)',
                      background: '#faf6f3',
                      color: '#786d66',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Contact Phone (Bangladesh) *
                  </label>
                  <input
                    type="text"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
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
                    Operating Hub / Address *
                  </label>
                  <input
                    type="text"
                    value={staffAddress}
                    onChange={(e) => setStaffAddress(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '11px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--brand-primary-dark)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'var(--brand-primary)')}
                >
                  Save Profile Details
                </button>
              </div>
            </form>
          ) : (
            /* Organization Profile Form (NGO Administrator) */
            <form onSubmit={handleAdminSave} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Authorized Representative *
                  </label>
                  <input
                    type="text"
                    value={repName}
                    onChange={(e) => setRepName(e.target.value)}
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
                    Official Email (Login)
                  </label>
                  <input
                    type="email"
                    value={user?.email || 'ngo@test.com'}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(44, 35, 32, 0.1)',
                      background: '#faf6f3',
                      color: '#786d66',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                    Official Contact Phone (Bangladesh) *
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+880 1788-776655"
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
                    Organization Registration Number
                  </label>
                  <input
                    type="text"
                    value={regNo}
                    disabled
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid rgba(44, 35, 32, 0.1)',
                      background: '#faf6f3',
                      color: '#786d66',
                      fontSize: '14px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Primary Headquarters Address (Dhaka, Bangladesh) *
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
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
                  Operational Areas in Dhaka
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {['Dhanmondi', 'Banani', 'Gulshan', 'Uttara', 'Mirpur', 'Mohakhali'].map((area) => (
                    <span
                      key={area}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '16px',
                        background: '#faf6f3',
                        border: '1px solid rgba(44, 35, 32, 0.1)',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#2c2320'
                      }}
                    >
                      📍 {area}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '11px 28px',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'var(--brand-primary-dark)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'var(--brand-primary)')}
                >
                  Save Organization Profile
                </button>
              </div>
            </form>
          )}
        </div>


        {/* =========================================================================
            SECURITY & PASSWORD CARD
           ========================================================================= */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '24px',
            padding: '24px 28px',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
            border: '1px solid rgba(44, 35, 32, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#2c2320' }}>
              🔐 Password & Security
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#786d66' }}>
              {isStaff
                ? 'Need to reset or change your staff account password? Submit a secure request to Super Admin.'
                : 'Need to change or reset your NGO account password? Submit a request to Super Admin.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPasswordModalOpen(true)}
            style={{
              background: '#faf6f3',
              color: '#2c2320',
              border: '1px solid rgba(44, 35, 32, 0.15)',
              borderRadius: '14px',
              padding: '10px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Request Password Change →
          </button>
        </div>

      </div>

      <PasswordResetRequestModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        user={user}
        token={token}
      />
    </NgoLayout>
  );
};

export default NgoProfile;
