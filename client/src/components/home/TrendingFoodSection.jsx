import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const TrendingFoodSection = ({ posts = [], loading = false }) => {
  const navigate = useNavigate();

  return (
    <section style={{ padding: '40px 24px 90px', background: '#fdf9f6' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary-dark)', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.2px', marginBottom: '8px' }}>
              <span style={{ width: '24px', height: '2px', background: 'var(--brand-primary-dark)' }}></span> LIVE NEAR YOU
            </div>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(30px, 4vw, 40px)', fontWeight: 800, color: '#2c2320', margin: 0 }}>
              Trending food posts
            </h2>
          </div>
          <Link to="/find-food" style={{ textDecoration: 'none', color: 'var(--brand-primary-dark)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Browse all posts <span>→</span>
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ fontSize: '15px', color: '#6b5d56', fontWeight: 600 }}>
              Fetching live food donations from database...
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', background: '#ffffff', borderRadius: '20px' }}>
            <div style={{ fontSize: '15px', color: '#6b5d56', fontWeight: 600 }}>
              No active food posts are available right now.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '22px' }}>
            {posts.map((post) => (
              <div
                key={post.id}
                className="food-card"
                style={{
                  flex: '0 1 calc((100% - 66px) / 4)',
                  minWidth: 'min(100%, 280px)',
                  maxWidth: '380px',
                  background: '#ffffff',
                  borderRadius: '20px',
                  overflow: 'hidden',
                  border: '1px solid rgba(44, 35, 32, 0.07)',
                  boxShadow: '0 8px 24px rgba(44, 35, 32, 0.05)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div className="food-img-wrapper" style={{ position: 'relative', height: '175px', width: '100%', overflow: 'hidden' }}>
                    <img
                      src={post.image}
                      alt={post.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80';
                      }}
                    />
                    <span style={{ position: 'absolute', top: '12px', left: '12px', background: post.tagBg || '#e3f5ea', color: post.tagColor || '#10b981', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800 }}>
                      {post.tag}
                    </span>
                    <span style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.65)', color: '#ffffff', padding: '4px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700, backdropFilter: 'blur(4px)' }}>
                      📍 {post.distance}
                    </span>
                  </div>

                  <div style={{ padding: '18px 18px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ background: post.statusBg || '#fff0ec', color: post.statusColor || 'var(--brand-primary-deep)', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800 }}>
                        {post.status}
                      </span>
                      <span style={{ fontSize: '12px', color: '#888', fontWeight: 600 }}>
                        ⏰ {post.timeLeft}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#2c2320', margin: '0 0 6px' }}>
                      {post.title}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#6b5d56', margin: 0 }}>
                      {post.details}
                    </p>
                  </div>
                </div>

                <div style={{ padding: '0 18px 18px' }}>
                  <button
                    onClick={() => navigate('/find-food')}
                    className="card-btn"
                    style={{
                      width: '100%',
                      background: 'var(--brand-primary)',
                      color: '#ffffff',
                      border: 0,
                      padding: '10px 16px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.25)'
                    }}
                  >
                    Request food →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TrendingFoodSection;
