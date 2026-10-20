import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import NgoLayout from '../../components/ngo/NgoLayout';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';
import RichTextEditor from '../../components/common/RichTextEditor';

export const BlogManagement = () => {
  const { user, token } = useAuth();

  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState(null);
  const [previewStory, setPreviewStory] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showUrlFallback, setShowUrlFallback] = useState(false);

  const fileInputRef = useRef(null);

  // Form fields
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    category: 'Volunteer',
    tag_color: 'var(--brand-primary-deep)',
    tag_bg: 'var(--brand-soft)',
    tag_icon: '🤝',
    read_time: '4 min read',
    summary: '',
    image: '',
    banner_image: '',
    author: user?.name || 'NGO Partner',
    author_role: 'Community Lead',
    quote: '',
    paragraphs_before_quote: ['', ''],
    content_html: '',
    is_featured: false
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchStories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stories/admin/all`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStories();
  }, [token]);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  const handleOpenCreate = () => {
    setEditingStory(null);
    setShowUrlFallback(false);
    setFormData({
      title: '',
      slug: '',
      category: 'Volunteer',
      tag_color: 'var(--brand-primary-deep)',
      tag_bg: 'var(--brand-soft)',
      tag_icon: '🤝',
      read_time: '4 min read',
      summary: '',
      image: '',
      banner_image: '',
      author: user?.name || 'NGO Partner',
      author_role: 'Community Lead',
      quote: '',
      paragraphs_before_quote: ['', ''],
      content_html: '',
      is_featured: false
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (story) => {
    setEditingStory(story);
    setShowUrlFallback(false);

    let paras = [];
    if (Array.isArray(story.paragraphs_before_quote) && story.paragraphs_before_quote.length > 0) {
      paras = [...story.paragraphs_before_quote];
    } else if (story.content) {
      paras = story.content.split('\n\n').slice(0, 2);
    }
    while (paras.length < 2) {
      paras.push('');
    }

    const belowQuoteHtml = story.content_html || (story.content ? story.content.split('\n\n').slice(2).join('\n\n') : '');

    setFormData({
      title: story.title || '',
      slug: story.slug || '',
      category: story.category || 'Volunteer',
      tag_color: story.tag_color || 'var(--brand-primary-deep)',
      tag_bg: story.tag_bg || 'var(--brand-soft)',
      tag_icon: story.tag_icon || '🤝',
      read_time: story.read_time || '4 min read',
      summary: story.summary || '',
      image: story.image || story.banner_image || '',
      banner_image: story.banner_image || story.image || '',
      author: story.author || '',
      author_role: story.author_role || '',
      quote: story.quote || '',
      paragraphs_before_quote: paras,
      content_html: belowQuoteHtml,
      is_featured: Boolean(story.is_featured)
    });
    setModalOpen(true);
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show immediate local preview
    const previewUrl = URL.createObjectURL(file);
    setFormData(prev => ({ ...prev, image: previewUrl, banner_image: previewUrl }));

    setUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);

      const res = await fetch(`${API_BASE_URL}/stories/upload-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: uploadFormData
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({
          ...prev,
          image: data.imageUrl,
          banner_image: data.imageUrl
        }));
        showFeedback('Image uploaded successfully!');
      } else {
        // Fallback to Base64 Data URL if upload failed
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            image: reader.result,
            banner_image: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error('Image upload error:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          image: reader.result,
          banner_image: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const updateParagraph = (index, value) => {
    const updated = [...(formData.paragraphs_before_quote || ['', ''])];
    updated[index] = value;
    setFormData(prev => ({ ...prev, paragraphs_before_quote: updated }));
  };

  const addParagraph = () => {
    setFormData(prev => ({
      ...prev,
      paragraphs_before_quote: [...(prev.paragraphs_before_quote || ['', '']), '']
    }));
  };

  const removeParagraph = (index) => {
    const updated = (formData.paragraphs_before_quote || ['', '']).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, paragraphs_before_quote: updated.length > 0 ? updated : [''] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingStory
        ? `${API_BASE_URL}/stories/${editingStory.id}`
        : `${API_BASE_URL}/stories`;
      const method = editingStory ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        paragraphs_before_quote: formData.paragraphs_before_quote,
        content_html: formData.content_html,
        content: [...formData.paragraphs_before_quote, formData.content_html].filter(Boolean).join('\n\n')
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showFeedback(editingStory ? 'Story updated successfully!' : 'Story created and published!');
        setModalOpen(false);
        fetchStories();
      } else {
        const data = await res.json().catch(() => ({}));
        showFeedback(data.message || 'Error saving story');
      }
    } catch (err) {
      console.error(err);
      showFeedback('Network error saving story');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/stories/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        showFeedback('Story removed.');
        setDeleteConfirmId(null);
        fetchStories();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Reordering functions
  const handleMove = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stories.length) return;

    const newStories = [...stories];
    const temp = newStories[index];
    newStories[index] = newStories[targetIndex];
    newStories[targetIndex] = temp;

    setStories(newStories);

    try {
      const orderedIds = newStories.map((s) => s.id);
      await fetch(`${API_BASE_URL}/stories/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ orderedIds })
      });
      showFeedback('Story display order updated on Homepage!');
    } catch (err) {
      console.error(err);
      fetchStories(); // rollback on error
    }
  };

  return (
    <NgoLayout title="Home Blog & Stories">
      <div style={{ maxWidth: '1060px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Header Bar */}
        <div style={{ background: '#ffffff', borderRadius: '20px', padding: '24px 28px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 20px rgba(44,35,32,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📰</span> Home Page Blog &amp; Story Management
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#6b5d56' }}>
              Publish, edit, delete, and reorder community stories that appear on the ShareMeal homepage and /stories.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenCreate}
            style={{
              background: 'var(--brand-primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '10px 24px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(var(--brand-primary-rgb), 0.35)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = 'var(--brand-primary-dark)')}
            onMouseOut={(e) => (e.currentTarget.style.background = 'var(--brand-primary)')}
          >
            <span>+</span> Create New Story
          </button>
        </div>

        {feedback && (
          <div
            style={{
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#047857',
              padding: '12px 18px',
              borderRadius: '12px',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>✓</span> {feedback}
          </div>
        )}

        {/* Stories List Table */}
        <div style={{ background: '#ffffff', borderRadius: '20px', border: '1px solid rgba(44,35,32,0.06)', boxShadow: '0 4px 20px rgba(44,35,32,0.03)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(44,35,32,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b5d56' }}>
              Total Stories: {stories.length}
            </span>
            <span style={{ fontSize: '12px', color: '#9c8e85' }}>
              Tip: Use ▲ / ▼ to reorder which stories appear first on the homepage.
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#faf6f3', height: '44px', fontSize: '12px', color: '#786d66', fontWeight: 700, borderBottom: '1px solid rgba(44,35,32,0.06)' }}>
                  <th style={{ paddingLeft: '24px', width: '90px' }}>Order</th>
                  <th style={{ width: '80px' }}>Image</th>
                  <th>Title &amp; URL Slug</th>
                  <th style={{ width: '120px' }}>Category</th>
                  <th style={{ width: '140px' }}>Author</th>
                  <th style={{ paddingRight: '24px', textAlign: 'right', width: '180px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stories.map((story, index) => {
                  const isFirst = index === 0;
                  const isLast = index === stories.length - 1;

                  return (
                    <tr
                      key={story.id}
                      style={{
                        height: '76px',
                        borderBottom: '1px solid rgba(44,35,32,0.05)',
                        fontSize: '13px',
                        background: '#ffffff'
                      }}
                    >
                      {/* Order & Reorder Arrows */}
                      <td style={{ paddingLeft: '24px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              background: '#f4f0ec',
                              color: '#2c2320',
                              fontWeight: 800,
                              fontSize: '11px',
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {index + 1}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                              type="button"
                              disabled={isFirst}
                              onClick={() => handleMove(index, -1)}
                              title="Move Up"
                              style={{
                                border: 'none',
                                background: isFirst ? 'transparent' : '#f0eae5',
                                color: isFirst ? '#ccc' : '#2c2320',
                                cursor: isFirst ? 'default' : 'pointer',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                fontSize: '10px'
                              }}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={isLast}
                              onClick={() => handleMove(index, 1)}
                              title="Move Down"
                              style={{
                                border: 'none',
                                background: isLast ? 'transparent' : '#f0eae5',
                                color: isLast ? '#ccc' : '#2c2320',
                                cursor: isLast ? 'default' : 'pointer',
                                borderRadius: '4px',
                                padding: '2px 5px',
                                fontSize: '10px'
                              }}
                            >
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Thumbnail */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <img
                          src={story.image || 'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=120&q=80'}
                          alt={story.title}
                          style={{ width: '56px', height: '42px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #f0e8e4' }}
                        />
                      </td>

                      {/* Title & Slug */}
                      <td style={{ verticalAlign: 'middle', paddingRight: '16px' }}>
                        <div style={{ fontWeight: 800, color: '#2c2320', fontSize: '14px', marginBottom: '2px' }}>
                          {story.title}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--brand-primary-dark)', fontWeight: 600 }}>
                          🔗 /stories/{story.slug || story.id}
                        </div>
                      </td>

                      {/* Category Tag */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <span
                          style={{
                            background: story.tag_bg || 'var(--brand-soft)',
                            color: story.tag_color || 'var(--brand-primary-deep)',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          {story.tag_icon || '🏷️'} {story.category}
                        </span>
                      </td>

                      {/* Author */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#2c2320', fontSize: '12px' }}>
                          {story.author}
                        </div>
                        <div style={{ fontSize: '11px', color: '#9c8e85' }}>
                          {story.read_time}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ paddingRight: '24px', textAlign: 'right', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <a
                            href={`/stories/${story.slug || story.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View "${story.title}" on public blog`}
                            style={{
                              textDecoration: 'none',
                              background: '#fff3ee',
                              border: '1.5px solid #ffd4c6',
                              color: 'var(--brand-primary-deep)',
                              padding: '6px 13px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 700,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                          >
                            👁️ View Story ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(story)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #e0d8d3',
                              color: '#2c2320',
                              padding: '5px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(story.id)}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #fecaca',
                              color: '#dc2626',
                              padding: '5px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Story Live Preview Modal */}
      {previewStory && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 25, 23, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setPreviewStory(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#f8fafc',
              borderRadius: '24px',
              maxWidth: '820px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* Modal Header Bar */}
            <div style={{ padding: '16px 24px', background: '#ffffff', borderBottom: '1px solid #f0e8e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📰</span>
                <span style={{ fontWeight: 800, fontSize: '14px', color: '#2c2320' }}>
                  Story Live Preview
                </span>
                <span style={{ background: previewStory.tag_bg || 'var(--brand-soft)', color: previewStory.tag_color || 'var(--brand-primary-deep)', padding: '3px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 800 }}>
                  {previewStory.tag_icon || '🏷️'} {previewStory.category || 'Story'}
                </span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <a
                  href={`/stories/${previewStory.slug || previewStory.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  Open Live Page ↗
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewStory(null)}
                  style={{
                    background: '#f4f0ec',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    color: '#6b5d56'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Story Look & Feel */}
            <div style={{ padding: '28px 32px' }}>
              {/* Cover Banner */}
              {(previewStory.banner_image || previewStory.image) && (
                <div style={{ width: '100%', height: '260px', borderRadius: '16px', overflow: 'hidden', marginBottom: '24px' }}>
                  <img
                    src={previewStory.banner_image || previewStory.image}
                    alt={previewStory.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}

              {/* Title & Metadata */}
              <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: '28px', fontWeight: 800, color: '#2c2320', lineHeight: 1.3, margin: '0 0 12px' }}>
                {previewStory.title}
              </h1>

              {previewStory.summary && (
                <p style={{ fontSize: '15px', color: '#6b5d56', lineHeight: 1.6, margin: '0 0 18px', fontStyle: 'italic' }}>
                  {previewStory.summary}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', borderTop: '1px solid #f0e8e4', borderBottom: '1px solid #f0e8e4', padding: '12px 0', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>
                  ✍️ {previewStory.author} {previewStory.author_role && `(${previewStory.author_role})`}
                </div>
                <div style={{ fontSize: '12px', color: '#9c8e85' }}>
                  ⏱️ {previewStory.read_time || '4 min read'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--brand-primary-dark)', fontWeight: 600 }}>
                  🔗 Public URL: <code>/stories/{previewStory.slug || previewStory.id}</code>
                </div>
              </div>

              {/* Narrative Paragraphs */}
              {(Array.isArray(previewStory.paragraphs_before_quote) ? previewStory.paragraphs_before_quote : []).map((p, i) => (
                <p key={i} style={{ fontSize: '15px', lineHeight: 1.8, color: '#2c2320', margin: '0 0 16px' }} dangerouslySetInnerHTML={{ __html: p }} />
              ))}

              {/* Quote */}
              {previewStory.quote && (
                <div style={{ background: '#ffffff', borderLeft: '4px solid var(--brand-primary)', borderRadius: '12px', padding: '18px 22px', margin: '24px 0', boxShadow: '0 4px 14px rgba(44,35,32,0.04)' }}>
                  <p style={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontWeight: 600, fontSize: '16px', color: '#2c2320', margin: 0, lineHeight: 1.5 }}>
                    "{previewStory.quote}"
                  </p>
                </div>
              )}

              {/* Rich Content HTML */}
              {previewStory.content_html ? (
                <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#2c2320' }} dangerouslySetInnerHTML={{ __html: previewStory.content_html }} />
              ) : previewStory.content ? (
                <p style={{ fontSize: '15px', lineHeight: 1.8, color: '#2c2320', whiteSpace: 'pre-wrap' }}>{previewStory.content}</p>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', background: '#ffffff', borderTop: '1px solid #f0e8e4', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  const s = previewStory;
                  setPreviewStory(null);
                  handleOpenEdit(s);
                }}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e0d8d3',
                  padding: '8px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#2c2320'
                }}
              >
                ✏️ Edit This Story
              </button>
              <button
                type="button"
                onClick={() => setPreviewStory(null)}
                style={{
                  background: '#2c2320',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 25, 23, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              maxWidth: '720px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: '30px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: '#f4f0ec',
                border: 'none',
                borderRadius: '50%',
                width: '34px',
                height: '34px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#6b5d56'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px', paddingRight: '36px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#2c2320' }}>
                {editingStory ? 'Edit Home Page Story' : 'Create New Story / Blog'}
              </h3>
              {editingStory && (
                <a
                  href={`/stories/${editingStory.slug || editingStory.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: 'var(--brand-primary-deep)',
                    fontWeight: 700,
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: '#fff3ee',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid #ffd4c6'
                  }}
                >
                  View Live Story ↗
                </a>
              )}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Title & Slug */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                  Story Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. How a Tuesday-night surplus fed 40 families"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                  URL Slug (Blog Name in URL)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', background: '#faf6f3', border: '1px solid #e0d8d3', borderRadius: '10px', padding: '0 12px' }}>
                  <span style={{ fontSize: '12px', color: '#9c8e85', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    http://localhost:5001/stories/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="how-a-tuesday-night-surplus-fed-40-families"
                    style={{ width: '100%', padding: '10px 6px', border: 'none', background: 'transparent', fontSize: '13px', outline: 'none', color: '#2c2320', fontWeight: 600 }}
                  />
                </div>
                <span style={{ fontSize: '11px', color: '#9c8e85' }}>
                  Leave blank to auto-generate from title.
                </span>
              </div>

              {/* Category & Read Time */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const cat = e.target.value;
                      let tag_color = 'var(--brand-primary-deep)';
                      let tag_bg = 'var(--brand-soft)';
                      let tag_icon = '🤝';
                      if (cat === 'NGO') { tag_color = 'var(--brand-primary-dark)'; tag_bg = 'var(--brand-soft)'; tag_icon = '🏢'; }
                      else if (cat === 'Impact') { tag_color = '#15803d'; tag_bg = '#dcfce7'; tag_icon = '🌱'; }
                      setFormData({ ...formData, category: cat, tag_color, tag_bg, tag_icon });
                    }}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                  >
                    <option value="Volunteer">Volunteer</option>
                    <option value="NGO">NGO Network</option>
                    <option value="Impact">Impact &amp; Environment</option>
                    <option value="Community">Community Story</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                    Read Time
                  </label>
                  <input
                    type="text"
                    value={formData.read_time}
                    onChange={(e) => setFormData({ ...formData, read_time: e.target.value })}
                    placeholder="e.g. 5 min read"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* Cover Image Upload Field (Instead of Image Link) */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '6px' }}>
                  Story Cover Image
                </label>
                
                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileChange}
                  style={{ display: 'none' }}
                />

                {formData.image ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: '#faf6f3', borderRadius: '12px', border: '1px solid #e0d8d3' }}>
                    <img
                      src={formData.image}
                      alt="Story preview"
                      style={{ width: '110px', height: '74px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e0d8d3' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#2c2320' }}>
                        {uploadingImage ? 'Uploading image...' : 'Image selected'}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            background: 'var(--brand-primary)',
                            color: '#fff',
                            border: 'none',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Change Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, image: '', banner_image: '' })}
                          style={{
                            background: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #e0d8d3',
                      borderRadius: '12px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: '#fffaf8',
                      transition: 'border-color 0.2s ease'
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--brand-primary)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = '#e0d8d3')}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>📷</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#2c2320' }}>
                      {uploadingImage ? 'Uploading image file...' : 'Click or drop to upload story image'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9c8e85', marginTop: '4px' }}>
                      Supports JPG, PNG, and WEBP formats up to 5MB
                    </div>
                  </div>
                )}

                {/* Optional toggle for manual URL */}
                <div style={{ marginTop: '6px', textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setShowUrlFallback(!showUrlFallback)}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    {showUrlFallback ? 'Hide URL input' : 'Or paste image URL directly'}
                  </button>
                </div>

                {showUrlFallback && (
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value, banner_image: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    style={{ width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e0d8d3', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                )}
              </div>

              {/* Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                  Short Summary (shown on Home cards)
                </label>
                <textarea
                  rows={2}
                  required
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Brief 1-2 sentence description of the impact story..."
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box', resize: 'vertical' }}
                />
              </div>

              {/* Author Info */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    placeholder="e.g. Nusrat Jahan"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#2c2320', marginBottom: '5px' }}>
                    Author Role
                  </label>
                  <input
                    type="text"
                    value={formData.author_role}
                    onChange={(e) => setFormData({ ...formData, author_role: e.target.value })}
                    placeholder="e.g. Community Lead"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>

              {/* ========================================================
                  STRUCTURED CONTENT: TOP PARAGRAPHS (ABOVE QUOTE)
              ======================================================== */}
              <div style={{ borderTop: '1px solid #eee5df', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#2c2320' }}>
                      Top Paragraphs (Above Quote)
                    </h4>
                    <span style={{ fontSize: '11px', color: '#9c8e85' }}>
                      Per-paragraph rich text editor with H1-H6, P, Link, Bold, Italic, and Underline.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={addParagraph}
                    style={{
                      background: '#fff3ee',
                      border: '1px solid #ffd4c6',
                      color: 'var(--brand-primary-deep)',
                      borderRadius: '8px',
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    + Add Paragraph
                  </button>
                </div>

                {formData.paragraphs_before_quote?.map((para, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#6b5d56' }}>
                        Top Paragraph {idx + 1}
                      </span>
                      {formData.paragraphs_before_quote.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeParagraph(idx)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#dc2626',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <RichTextEditor
                      value={para}
                      onChange={(newHtml) => updateParagraph(idx, newHtml)}
                      placeholder={`Write top paragraph ${idx + 1}...`}
                      minHeight="90px"
                    />
                  </div>
                ))}
              </div>

              {/* ========================================================
                  KEY QUOTE / PULLQUOTE
              ======================================================== */}
              <div style={{ borderTop: '1px solid #eee5df', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#2c2320', marginBottom: '4px' }}>
                  Key Quote / Pullquote
                </label>
                <span style={{ display: 'block', fontSize: '11px', color: '#9c8e85', marginBottom: '8px' }}>
                  Featured highlighted quotation card between top paragraphs and narrative.
                </span>
                <textarea
                  rows={2}
                  value={formData.quote}
                  onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                  placeholder='"It is easy to assume surplus is just scraps. In reality, this was a five-star meal..."'
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e0d8d3', fontSize: '13px', boxSizing: 'border-box', fontStyle: 'italic', resize: 'vertical' }}
                />
              </div>

              {/* ========================================================
                  BELOW QUOTE CONTENT: RICH TEXT
              ======================================================== */}
              <div style={{ borderTop: '1px solid #eee5df', paddingTop: '16px' }}>
                <RichTextEditor
                  label="Content Below Quote (Rich Text)"
                  description="Format subheadings (H1-H6), paragraphs, links, bold, underline, italic."
                  value={formData.content_html}
                  onChange={(newHtml) => setFormData({ ...formData, content_html: newHtml })}
                  placeholder="Continue the story narrative below the quote with headings, paragraphs, and links..."
                  minHeight="160px"
                />
              </div>

              {/* Featured toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '8px' }}>
                <input
                  type="checkbox"
                  id="is_featured"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                />
                <label htmlFor="is_featured" style={{ fontSize: '13px', fontWeight: 600, color: '#2c2320', cursor: 'pointer' }}>
                  Feature as spotlight headline story on /stories
                </label>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{ background: '#f4f0ec', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    background: 'var(--brand-primary)',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px 24px',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#ffffff',
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(var(--brand-primary-rgb), 0.35)'
                  }}
                >
                  {submitting ? 'Saving...' : editingStory ? 'Save Changes' : 'Publish Story →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(28, 25, 23, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '400px',
              width: '100%',
              padding: '26px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
            }}
          >
            <h4 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 800, color: '#dc2626' }}>
              Delete Story?
            </h4>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b5d56' }}>
              Are you sure you want to remove this story? It will no longer appear on the home page or stories gallery.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                style={{ background: '#f4f0ec', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                style={{ background: '#dc2626', border: 'none', borderRadius: '10px', padding: '9px 18px', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </NgoLayout>
  );
};

export default BlogManagement;

