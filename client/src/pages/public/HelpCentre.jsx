import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';

export const HelpCentre = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Topics', icon: '🔍' },
    { id: 'donor', label: 'For Donors', icon: '🍲' },
    { id: 'ngo', label: 'For NGOs', icon: '🏢' },
    { id: 'receiver', label: 'For Receivers', icon: '🤝' },
    { id: 'account', label: 'Account & Safety', icon: '🛡️' }
  ];

  const faqs = [
    {
      id: 1,
      cat: 'donor',
      q: 'What kind of surplus food can I donate on ShareMeal?',
      a: 'You can donate freshly prepared cooked meals, excess bakery items, fresh fruits and vegetables, and packaged groceries with intact seals. All cooked food must be posted within safe consumption windows (typically prepared within 2-4 hours).'
    },
    {
      id: 2,
      cat: 'donor',
      q: 'How does food pickup coordination work?',
      a: 'When you create a food donation post, verified NGOs and community relief agents receive instant notifications based on proximity. Once an NGO requests to collect, you can approve the collection request and coordinate the exact pickup time.'
    },
    {
      id: 3,
      cat: 'ngo',
      q: 'How does an NGO get verified to collect food?',
      a: 'During NGO registration, organizations upload their government registration certificate or trade license. Our administrative safety team inspects credentials and approves accounts within 24 hours.'
    },
    {
      id: 4,
      cat: 'ngo',
      q: 'What are serving logs and why are they required?',
      a: 'Serving logs allow NGOs to report the quantity of food distributed and the number of individuals nourished. This maintains transparency for donors and fuels our community impact statistics.'
    },
    {
      id: 5,
      cat: 'receiver',
      q: 'How does Anonymous Mode protect my privacy?',
      a: 'When you request meals with Anonymous Mode enabled, your real name, contact number, and NID are cryptographically masked in our database using AES-256 encryption. Donors only see a randomized badge like "Anonymous Receiver #RX".'
    },
    {
      id: 6,
      cat: 'receiver',
      q: 'What is a pickup PIN code and how do I use it?',
      a: 'Whenever your food request is approved, ShareMeal generates a secure 4-digit pickup code in your dashboard. When meeting the volunteer or donor, show this code to verify your identity without sharing personal information.'
    },
    {
      id: 7,
      cat: 'account',
      q: 'What should I do if I forget my password or get locked out?',
      a: 'Click "Request Password Reset" on the Login screen, enter your registered email and a short reason, and save the secret request code you are shown. After an admin approves it, open "Check Reset Message" on the Login screen with your email and code to read your temporary password (the message opens only once). Log in with it and set a new password straight away.'
    },
    {
      id: 8,
      cat: 'account',
      q: 'How do I report a suspicious post or unsafe food?',
      a: 'Click the "Report" button on any post or profile card, select the reason (e.g. expired food, misleading description, spam), and submit. Our moderation team reviews flagged items within 30 minutes.'
    }
  ];

  const filteredFaqs = faqs.filter(item => {
    const matchesCat = activeCategory === 'all' || item.cat === activeCategory;
    const matchesSearch = item.q.toLowerCase().includes(searchQuery.toLowerCase()) || item.a.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#f8fafc', color: '#2c2320' }}>
      <Navbar />

      {/* Hero Header */}
      <section style={{ padding: '64px 24px 48px', textAlign: 'center', background: 'linear-gradient(180deg, #fdf7f2 0%, #f8fafc 100%)', borderBottom: '1px solid rgba(44,35,32,0.06)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--brand-soft)', color: 'var(--brand-primary-deep)', padding: '6px 14px', borderRadius: '100px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px' }}>
            <span>🎧</span> ShareMeal Support &amp; Knowledge Base
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 800, color: '#2c2320', margin: '0 0 16px', lineHeight: 1.2 }}>
            How can we help you today?
          </h1>
          <p style={{ fontSize: '16px', color: '#6b5d56', maxWidth: '620px', margin: '0 auto 32px', lineHeight: 1.6 }}>
            Browse guides, find answers to common questions about donation and collections, or connect directly with our support team.
          </p>

          {/* Search Bar */}
          <div style={{ maxWidth: '540px', margin: '0 auto', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search help articles, topics, or questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '14px 20px 14px 46px',
                borderRadius: '100px',
                border: '1.5px solid #eee5e0',
                background: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(44, 35, 32, 0.05)',
                color: '#2c2320'
              }}
            />
            <span style={{ position: 'absolute', left: '18px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px', color: '#8c7e77' }}>
              🔍
            </span>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '48px 24px 80px', width: '100%', flex: 1 }}>
        
        {/* Categories Pills */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '40px' }}>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '100px',
                border: activeCategory === c.id ? '1.5px solid var(--brand-primary)' : '1px solid #eee5e0',
                background: activeCategory === c.id ? 'var(--brand-primary)' : '#ffffff',
                color: activeCategory === c.id ? '#ffffff' : '#5c504a',
                fontSize: '13.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeCategory === c.id ? '0 4px 12px rgba(var(--brand-primary-rgb), 0.25)' : 'none'
              }}
            >
              <span>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* FAQ Accordion List */}
        <div style={{ display: 'grid', gap: '14px', marginBottom: '60px' }}>
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => {
              const isOpen = expandedFaq === faq.id;
              return (
                <div
                  key={faq.id}
                  style={{
                    background: '#ffffff',
                    border: isOpen ? '1.5px solid var(--brand-primary)' : '1px solid #eee5e0',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: isOpen ? '0 6px 20px rgba(var(--brand-primary-rgb), 0.08)' : '0 2px 8px rgba(44, 35, 32, 0.02)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <button
                    onClick={() => setExpandedFaq(isOpen ? null : faq.id)}
                    style={{
                      width: '100%',
                      padding: '20px 24px',
                      background: 'transparent',
                      border: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: '#2c2320'
                    }}
                  >
                    <span>{faq.q}</span>
                    <span style={{ fontSize: '18px', color: 'var(--brand-primary)', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                      ▼
                    </span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 24px 22px', fontSize: '14px', lineHeight: 1.7, color: '#655750', borderTop: '1px solid #f6f0ed', paddingTop: '16px' }}>
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', background: '#ffffff', borderRadius: '16px', border: '1px dashed #e5deda' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔍</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#2c2320' }}>No matching questions found</h3>
              <p style={{ fontSize: '13.5px', color: '#8c7e77', margin: 0 }}>Try searching with different terms or contact our support team directly.</p>
            </div>
          )}
        </div>

        {/* Support Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <div style={{ background: '#ffffff', padding: '28px', borderRadius: '18px', border: '1px solid #eee5e0', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>✉️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: '#2c2320' }}>Direct Support Email</h3>
            <p style={{ fontSize: '13px', color: '#6b5d56', lineHeight: 1.5, margin: '0 0 16px' }}>
              Reach out to our volunteer and operations response team for account issues or NGO approvals.
            </p>
            <a
              href="mailto:help@sharemeal.org"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '13.5px' }}
            >
              help@sharemeal.org ➔
            </a>
          </div>

          <div style={{ background: '#ffffff', padding: '28px', borderRadius: '18px', border: '1px solid #eee5e0', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🚨</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: '#2c2320' }}>Emergency Food Hotline</h3>
            <p style={{ fontSize: '13px', color: '#6b5d56', lineHeight: 1.5, margin: '0 0 16px' }}>
              For rapid large-scale food rescues from events, banquet halls, or wholesale markets.
            </p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#10b981', fontWeight: 700, fontSize: '13.5px' }}>
              +880 (17) 0000-MEAL (6325)
            </span>
          </div>

          <div style={{ background: '#ffffff', padding: '28px', borderRadius: '18px', border: '1px solid #eee5e0', boxShadow: '0 4px 14px rgba(44,35,32,0.03)' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>🛡️</div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: '0 0 8px', color: '#2c2320' }}>Safety &amp; Compliance</h3>
            <p style={{ fontSize: '13px', color: '#6b5d56', lineHeight: 1.5, margin: '0 0 16px' }}>
              Inspect our comprehensive food hygiene, cold-chain transport, and donor protection guidelines.
            </p>
            <Link
              to="/safety"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 700, fontSize: '13.5px' }}
            >
              View Safety Protocols ➔
            </Link>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
};

export default HelpCentre;
