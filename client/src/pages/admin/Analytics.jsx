import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import AnalyticsKPICards from '../../components/admin/AnalyticsKPICards';

export const Analytics = () => {
  const { token } = useAuth();
  const [period, setPeriod] = useState('7days');
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState({
    donations_over_time: [],
    food_type_distribution: [],
    anonymous_vs_named: [],
    top_donors: [],
    top_ngos: []
  });
  const [hoveredPoint, setHoveredPoint] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/admin/analytics?period=${period}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setAnalyticsData(data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period, token]);

  // Export CSV handler
  const handleExportCSV = () => {
    const headers = ['Category', 'Item', 'Value / Portion', 'Percentage / Metric'];
    const rows = [];

    // Donations
    analyticsData.donations_over_time.forEach((d) => {
      rows.push(['Donations Over Time', d.label, d.value, 'Portions']);
    });

    // Food Types
    analyticsData.food_type_distribution.forEach((ft) => {
      rows.push(['Food Type Distribution', ft.name, ft.value, `${ft.percentage}%`]);
    });

    // Anonymous vs Named
    analyticsData.anonymous_vs_named.forEach((an) => {
      rows.push(['Request Privacy', an.name, an.value, `${an.percentage}%`]);
    });

    // Top Donors
    const donorsList = (analyticsData.top_donors && analyticsData.top_donors.length > 0)
      ? analyticsData.top_donors
      : (analyticsData.top_ngos || []);
    donorsList.forEach((donor) => {
      rows.push(['Top Donor', donor.name, donor.meals, 'Meals Donated']);
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => `"${e.join('","')}"`)].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sharemeal-analytics-${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for SVG spline curve
  const points = analyticsData.donations_over_time || [];
  const chartWidth = 960;
  const chartHeight = 180;
  const maxY = 100;

  const getCoordinates = (index, value) => {
    const x = 50 + (index / (points.length - 1 || 1)) * (chartWidth - 90);
    const y = chartHeight - (value / maxY) * (chartHeight - 30) - 10;
    return { x, y };
  };

  const pathD = points.reduce((acc, point, i, arr) => {
    const { x, y } = getCoordinates(i, point.value);
    if (i === 0) return `M ${x},${y}`;
    const prev = getCoordinates(i - 1, arr[i - 1].value);
    const cpX1 = prev.x + (x - prev.x) / 2;
    const cpX2 = prev.x + (x - prev.x) / 2;
    return `${acc} C ${cpX1},${prev.y} ${cpX2},${y} ${x},${y}`;
  }, '');

  const areaD = points.length > 0 ? `${pathD} L ${getCoordinates(points.length - 1, 0).x},${chartHeight + 10} L ${getCoordinates(0, 0).x},${chartHeight + 10} Z` : '';

  // SVG Donut slice generator
  const renderDonutSlices = (data, radius = 58, stroke = 24) => {
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return data.map((item, idx) => {
      const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += item.percentage;

      return (
        <circle
          key={idx}
          cx="80"
          cy="80"
          r={radius}
          fill="transparent"
          stroke={item.color}
          strokeWidth={stroke}
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
      );
    });
  };

  return (
    <AdminLayout title="Analytics">
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Top Filter and Actions Bar (Figma Node 8:32081) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          {/* Period Pills */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPeriod('7days')}
              style={{
                background: period === '7days' ? 'var(--brand-primary)' : '#ffffff',
                color: period === '7days' ? '#ffffff' : '#6b5d56',
                border: period === '7days' ? 'none' : '1px solid rgba(44, 35, 32, 0.1)',
                padding: '7px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: period === '7days' ? '0 4px 10px rgba(var(--brand-primary-rgb), 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              7 days
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30days')}
              style={{
                background: period === '30days' ? 'var(--brand-primary)' : '#ffffff',
                color: period === '30days' ? '#ffffff' : '#6b5d56',
                border: period === '30days' ? 'none' : '1px solid rgba(44, 35, 32, 0.1)',
                padding: '7px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: period === '30days' ? '0 4px 10px rgba(var(--brand-primary-rgb), 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              30 days
            </button>
            <button
              type="button"
              onClick={() => setPeriod('custom')}
              style={{
                background: period === 'custom' ? 'var(--brand-primary)' : '#ffffff',
                color: period === 'custom' ? '#ffffff' : '#6b5d56',
                border: period === 'custom' ? 'none' : '1px solid rgba(44, 35, 32, 0.1)',
                padding: '7px 18px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: period === 'custom' ? '0 4px 10px rgba(var(--brand-primary-rgb), 0.4)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Custom
            </button>
          </div>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            style={{
              background: '#ffffff',
              border: '1px solid #ffa286',
              color: 'var(--brand-primary-deep)',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(var(--brand-primary-deep-rgb), 0.08)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#fff5f2')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#ffffff')}
          >
            <span>↓</span> Export CSV
          </button>
        </div>

        {/* High-Level Operational KPI Cards */}
        <AnalyticsKPICards
          totalMeals={
            (analyticsData.top_donors || []).reduce((acc, d) => acc + (d.meals || 0), 0) ||
            (analyticsData.top_ngos || []).reduce((acc, n) => acc + (n.meals || 0), 0) ||
            10
          }
          kgDiverted={Math.round(
            ((analyticsData.top_donors || []).reduce((acc, d) => acc + (d.meals || 0), 0) || 10) * 0.45
          )}
          activeNgos={analyticsData.active_ngos || 3}
          verifiedDonors={analyticsData.total_donors || 10}
        />

        {/* Section 1: Donations Over Time (Figma Node 8:32092) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(44, 35, 32, 0.05)',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(44, 35, 32, 0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#2c2320', fontFamily: 'Fraunces, serif' }}>
              Donations Over Time
            </h3>
            <span style={{ fontSize: '12px', color: '#8c7e75', fontWeight: 600 }}>
              {period === '7days' ? 'Last 7 Days (Portions Rescued)' : 'Monthly Trend'}
            </span>
          </div>

          <div style={{ padding: '24px 20px', position: 'relative', overflowX: 'auto' }}>
            <svg width="100%" height="240" viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`} style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Y Axis Grid lines & values (0, 25, 50, 75, 100) */}
              {[100, 75, 50, 25, 0].map((val) => {
                const y = chartHeight - (val / maxY) * (chartHeight - 30) - 10;
                return (
                  <g key={val}>
                    <line
                      x1="45"
                      y1={y}
                      x2={chartWidth - 20}
                      y2={y}
                      stroke="#f3ece7"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                    <text
                      x="32"
                      y={y + 4}
                      textAnchor="end"
                      fill="#9c8e85"
                      fontSize="11"
                      fontFamily="sans-serif"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Gradient Area Fill */}
              {areaD && <path d={areaD} fill="url(#curveGradient)" />}

              {/* The Curved Line */}
              {pathD && (
                <path
                  d={pathD}
                  fill="none"
                  stroke="var(--brand-primary)"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Data points & X Axis Labels */}
              {points.map((pt, i) => {
                const { x, y } = getCoordinates(i, pt.value);
                const isHovered = hoveredPoint === i;

                return (
                  <g key={i}>
                    {/* Data circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 7 : 5}
                      fill="var(--brand-primary)"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <g>
                        <rect
                          x={x - 36}
                          y={y - 34}
                          width="72"
                          height="24"
                          rx="6"
                          fill="#2c2320"
                        />
                        <text
                          x={x}
                          y={y - 18}
                          textAnchor="middle"
                          fill="#ffffff"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {pt.value} meals
                        </text>
                      </g>
                    )}

                    {/* X axis day label */}
                    <text
                      x={x}
                      y={chartHeight + 28}
                      textAnchor="middle"
                      fill="#6b5d56"
                      fontSize="12"
                      fontWeight="500"
                    >
                      {pt.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Section 2: Two Donut Charts in 2-Column Grid (Figma Node 8:32130 & 8:32174) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          
          {/* Donut 1: Food Type Distribution */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(44, 35, 32, 0.05)',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: '100%', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#2c2320', fontFamily: 'Fraunces, serif' }}>
                Food Type Distribution
              </h3>
            </div>

            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '12px 0' }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                {renderDonutSlices(analyticsData.food_type_distribution, 56, 22)}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                  {analyticsData.food_type_distribution.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span style={{ fontSize: '10px', color: '#9c8e85', fontWeight: 600 }}>Portions</span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', marginTop: '16px' }}>
              {analyticsData.food_type_distribution.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b5d56' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color }} />
                  <span>{item.name}</span>
                  <strong style={{ color: '#2c2320' }}>({item.percentage}%)</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Donut 2: Anonymous vs Named Requests */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid rgba(44, 35, 32, 0.05)',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div style={{ width: '100%', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#2c2320', fontFamily: 'Fraunces, serif' }}>
                Anonymous vs Named Requests
              </h3>
            </div>

            <div style={{ position: 'relative', width: '160px', height: '160px', margin: '12px 0' }}>
              <svg width="160" height="160" viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                {renderDonutSlices(analyticsData.anonymous_vs_named, 56, 22)}
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none'
                }}
              >
                <span style={{ fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                  {analyticsData.anonymous_vs_named.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span style={{ fontSize: '10px', color: '#9c8e85', fontWeight: 600 }}>Requests</span>
              </div>
            </div>

            {/* Legends */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
              {analyticsData.anonymous_vs_named.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b5d56' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: item.color }} />
                  <span>{item.name}</span>
                  <strong style={{ color: '#2c2320' }}>({item.percentage}%)</strong>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Section 3: Top Donors (Meals Donated) */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(44, 35, 32, 0.05)',
            boxShadow: '0 4px 20px rgba(44, 35, 32, 0.04)',
            padding: '24px'
          }}
        >
          <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#2c2320', fontFamily: 'Fraunces, serif' }}>
              Top Donors (Meals Donated)
            </h3>
            <span style={{ fontSize: '12px', color: '#9c8e85', fontWeight: 600 }}>Portions Donated</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {((analyticsData.top_donors && analyticsData.top_donors.length > 0)
              ? analyticsData.top_donors
              : (analyticsData.top_ngos || [])
            ).map((donor, idx) => {
              const maxVal = donor.max || 50;
              const percentage = Math.min(100, Math.round((donor.meals / maxVal) * 100));

              return (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 150px) minmax(0, 1fr) auto', alignItems: 'center', gap: '16px' }}>
                  <span
                    title={donor.name}
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#574c45',
                      textAlign: 'right',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {donor.name}
                  </span>
                  <div style={{ background: '#f5f0ec', height: '24px', borderRadius: '12px', overflow: 'hidden', position: 'relative' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.max(percentage, donor.meals > 0 ? 4 : 0)}%`,
                        background: '#10b981',
                        borderRadius: '12px',
                        transition: 'width 0.8s ease'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>
                    {donor.meals.toLocaleString()}
                  </span>
                </div>
              );
            })}

            {/* Dynamic X-axis scale indicators */}
            {(() => {
              const activeList = (analyticsData.top_donors && analyticsData.top_donors.length > 0)
                ? analyticsData.top_donors
                : (analyticsData.top_ngos || []);
              const scaleMax = activeList[0]?.max || 50;
              const step1 = Math.round(scaleMax * 0.25);
              const step2 = Math.round(scaleMax * 0.5);
              const step3 = Math.round(scaleMax * 0.75);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 150px) minmax(0, 1fr) auto', alignItems: 'center', gap: '16px', marginTop: '6px' }}>
                  <div />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9c8e85' }}>
                    <span>0</span>
                    <span>{step1}</span>
                    <span>{step2}</span>
                    <span>{step3}</span>
                    <span>{scaleMax}</span>
                  </div>
                  <div />
                </div>
              );
            })()}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
};

export default Analytics;
