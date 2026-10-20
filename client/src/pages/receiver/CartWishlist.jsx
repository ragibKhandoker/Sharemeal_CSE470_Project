import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import CaptchaWidget from '../../components/common/CaptchaWidget';
import Notice from '../../components/common/Notice';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../utils/constants';

const authHeaders = (token, json = false) => ({
  ...(json ? { 'Content-Type': 'application/json' } : {}),
  Authorization: `Bearer ${token}`
});

const mealName = (item) => item.food_name || item.title || `${item.food_type || 'Meal'} portions`;

// Server returns this wording when a cart meal already has an active purchase request.
const isDuplicateRequest = (text) => /already have a request|request for one of these meals already exists/i.test(text);

export default function CartWishlist() {
  const { token, user } = useAuth();
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [captcha, setCaptcha] = useState({ captchaId: '', captchaAnswer: '', isValid: false });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadItems = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cartResponse, wishlistResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/receiver-commerce/cart`, { headers: authHeaders(token) }),
        fetch(`${API_BASE_URL}/receiver-commerce/wishlist`, { headers: authHeaders(token) })
      ]);
      const [cartData, wishlistData] = await Promise.all([cartResponse.json(), wishlistResponse.json()]);
      if (!cartResponse.ok) throw new Error(cartData.message || 'Could not load your cart.');
      if (!wishlistResponse.ok) throw new Error(wishlistData.message || 'Could not load your wishlist.');
      setCart(cartData.data || []);
      setWishlist(wishlistData.data || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + Number(item.receiver_price_bdt || 0) * Number(item.quantity || 0), 0), [cart]);

  const updateQuantity = async (item, quantity) => {
    if (quantity < 1) return removeCartItem(item.id);
    setBusyId(item.id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/receiver-commerce/cart/${item.id}`, {
        method: 'PATCH', headers: authHeaders(token, true), body: JSON.stringify({ quantity })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not update this cart item.');
      await loadItems();
    } catch (updateError) { setError(updateError.message); }
    finally { setBusyId(null); }
  };

  const removeCartItem = async (id) => {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/receiver-commerce/cart/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not remove this cart item.');
      await loadItems();
    } catch (removeError) { setError(removeError.message); }
    finally { setBusyId(null); }
  };

  const moveWishlistItemToCart = async (item) => {
    setBusyId(item.id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/receiver-commerce/cart`, {
        method: 'POST', headers: authHeaders(token, true),
        body: JSON.stringify({ food_post_id: item.food_post_id, quantity: 1 })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not add this meal to your cart.');
      await loadItems();
    } catch (moveError) { setError(moveError.message); }
    finally { setBusyId(null); }
  };

  const removeWishlistItem = async (id) => {
    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/receiver-commerce/wishlist/${id}`, { method: 'DELETE', headers: authHeaders(token) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not remove this meal from your wishlist.');
      await loadItems();
    } catch (removeError) { setError(removeError.message); }
    finally { setBusyId(null); }
  };

  const placePurchaseRequest = async (event) => {
    event.preventDefault();
    if (user?.verification_status !== 'verified') {
      setError('Verify your receiver profile before placing a purchase request.');
      return;
    }
    if (!captcha.captchaId || !captcha.captchaAnswer) {
      setError('Complete the security check to continue.');
      return;
    }
    setBusyId('checkout');
    setError('');
    try {
      const response = await fetch(`${API_BASE_URL}/receiver-commerce/checkout`, {
        method: 'POST', headers: authHeaders(token, true),
        body: JSON.stringify({ captchaId: captcha.captchaId, captchaAnswer: captcha.captchaAnswer })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not place your purchase request.');
      setCart([]);
      setMessage(`${data.message} Order total: ৳${Number(data.data?.total_bdt || 0).toFixed(2)}.`);
      setCaptcha({ captchaId: '', captchaAnswer: '', isValid: false });
    } catch (checkoutError) { setError(checkoutError.message); }
    finally { setBusyId(null); }
  };

  return (
    <ReceiverLayout title="Cart & Wishlist">
      <div style={{ maxWidth: 620, margin: '0 auto', display: 'grid', gap: 12 }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, color: '#2c2320' }}>Your cart & wishlist</h2>
            <p style={{ margin: '6px 0 0', color: '#786d66' }}>Review NGO meal prices and send a purchase request.</p>
          </div>
          <Link to="/receiver/find-food" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>Browse meals</Link>
        </header>

        {error && (isDuplicateRequest(error) ? (
          <Notice tone="warning" title="Already requested" action={{ to: '/receiver/my-requests', label: 'View my requests' }} onClose={() => setError('')}>
            {error} Remove it from your cart or check its status in My Requests.
          </Notice>
        ) : (
          <Notice tone="error" onClose={() => setError('')}>{error}</Notice>
        ))}
        {message && (
          <Notice tone="success" title="Request sent" action={{ to: '/receiver/my-requests', label: 'View requests' }} onClose={() => setMessage('')}>
            {message}
          </Notice>
        )}
        {loading ? <p>Loading your saved meals...</p> : (
          <>
            <section style={{ background: '#fff', border: '1px solid #eee5df', borderRadius: 16, padding: 16 }}>
              <h3 style={{ margin: '0 0 12px', color: '#2c2320' }}>Cart ({cart.length})</h3>
              {cart.length === 0 ? <p style={{ color: '#786d66' }}>Your cart is empty.</p> : <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'grid', gap: 6, maxHeight: 250, overflowY: 'auto', paddingRight: 4 }}>
                {cart.map((item) => (
                  <article key={item.id} style={{ display: 'grid', gridTemplateColumns: '48px minmax(0, 1fr) auto', alignItems: 'center', gap: 8, borderBottom: '1px solid #eee5df', padding: '5px 0' }}>
                    {item.image_url ? <img src={item.image_url} alt="" style={{ width: 48, height: 42, objectFit: 'cover', borderRadius: 10 }} /> : <div aria-hidden="true" style={{ width: 48, height: 42, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#f7f1eb', fontSize: 26 }}>🍲</div>}
                    <div>
                      <strong>{mealName(item)}</strong>
                      <div style={{ color: '#786d66', fontSize: 13 }}>{item.ngo_name || 'NGO'} · {item.pickup_point_name || 'NGO pickup point'}</div>
                      <div style={{ marginTop: 4, color: '#166534', fontWeight: 800 }}>৳{Number(item.receiver_price_bdt).toFixed(2)} per portion</div>
                    </div>
                    <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button type="button" aria-label="Decrease quantity" disabled={busyId === item.id} onClick={() => updateQuantity(item, Number(item.quantity) - 1)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', padding: 0, fontSize: 17, lineHeight: 1 }}> &minus; </button>
                        <strong>{item.quantity}</strong>
                        <button type="button" aria-label="Increase quantity" disabled={busyId === item.id} onClick={() => updateQuantity(item, Number(item.quantity) + 1)}>+</button>
                      </div>
                      <strong>৳{(Number(item.receiver_price_bdt) * Number(item.quantity)).toFixed(2)}</strong>
                      <button type="button" onClick={() => removeCartItem(item.id)} disabled={busyId === item.id} style={{ border: 0, background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}>Remove</button>
                    </div>
                  </article>
                ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}><span>Order total</span><span>৳{cartTotal.toFixed(2)}</span></div>
                <p style={{ margin: 0, color: '#786d66', fontSize: 13 }}>This sends a purchase request to the NGO. No online payment is taken here; arrange payment with the NGO.</p>
                <form onSubmit={placePurchaseRequest} style={{ display: 'grid', gap: 8 }}>
                  <CaptchaWidget compact onCaptchaChange={setCaptcha} label="Confirm purchase request" />
                  <button type="submit" disabled={busyId === 'checkout' || cart.length === 0} style={{ border: 0, borderRadius: 10, padding: 10, background: 'var(--brand-primary)', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                    {busyId === 'checkout' ? 'Sending request...' : 'Place purchase request'}
                  </button>
                </form>
              </div>}
            </section>

            <section style={{ background: '#fff', border: '1px solid #eee5df', borderRadius: 18, padding: 18, boxShadow: '0 8px 24px rgba(44, 35, 32, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span aria-hidden="true" style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#fdecec', color: '#e11d48', fontSize: 17 }}>♥</span>
                <h3 style={{ margin: 0, color: '#2c2320', fontSize: 19 }}>Wishlist</h3>
                <span style={{ padding: '2px 10px', borderRadius: 999, background: '#f7f1eb', color: '#786d66', fontSize: 13, fontWeight: 700 }}>
                  {wishlist.length} {wishlist.length === 1 ? 'meal' : 'meals'}
                </span>
              </div>
              {wishlist.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '22px 12px', borderRadius: 14, background: '#fcf9f6', border: '1px dashed #e7dbd2' }}>
                  <div aria-hidden="true" style={{ fontSize: 30 }}>🤍</div>
                  <p style={{ margin: '6px 0 10px', color: '#786d66' }}>You have no saved meals yet.</p>
                  <Link to="/receiver/find-food" style={{ color: 'var(--brand-primary)', fontWeight: 700 }}>Find meals to save</Link>
                </div>
              ) : <div style={{ display: 'grid', gap: 10 }}>
                {wishlist.map((item) => {
                  const price = Number(item.receiver_price_bdt || 0);
                  const isBusy = busyId === item.id;
                  const location = [item.thana, item.district].filter(Boolean).join(', ');
                  return (
                    <article key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: 12, borderRadius: 14, background: '#fcf9f6', border: '1px solid #f1e8e1', opacity: isBusy ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                      {item.image_url
                        ? <img src={item.image_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 12, flexShrink: 0 }} />
                        : <div aria-hidden="true" style={{ width: 64, height: 64, display: 'grid', placeItems: 'center', borderRadius: 12, background: '#f3e8de', fontSize: 30, flexShrink: 0 }}>🍲</div>}
                      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                        <strong style={{ display: 'block', color: '#2c2320', fontSize: 16, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mealName(item)}</strong>
                        <div style={{ marginTop: 2, color: '#786d66', fontSize: 13 }}>
                          {item.ngo_name || 'NGO'}{location && ` · ${location}`}
                        </div>
                        {price > 0
                          ? <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 999, background: '#dcfce7', color: '#166534', fontSize: 13, fontWeight: 800 }}>৳{price.toFixed(2)} <span style={{ fontWeight: 600 }}>/ portion</span></span>
                          : <span style={{ display: 'inline-block', marginTop: 6, padding: '3px 10px', borderRadius: 999, background: '#f3f4f6', color: '#6b7280', fontSize: 13, fontWeight: 700 }}>Price not set yet</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                        <button
                          type="button"
                          onClick={() => moveWishlistItemToCart(item)}
                          disabled={isBusy || price <= 0}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, border: 0, borderRadius: 10, padding: '9px 14px', background: 'var(--brand-primary)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: isBusy || price <= 0 ? 'not-allowed' : 'pointer', opacity: price <= 0 ? 0.5 : 1 }}
                        >
                          <span aria-hidden="true">🛒</span> Add to cart
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${mealName(item)} from wishlist`}
                          onClick={() => removeWishlistItem(item.id)}
                          disabled={isBusy}
                          style={{ border: '1px solid #f3c4c4', borderRadius: 10, padding: '9px 12px', background: '#fff', color: '#b91c1c', fontWeight: 700, fontSize: 14, cursor: isBusy ? 'not-allowed' : 'pointer' }}
                        >
                          Remove
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>}
            </section>
          </>
        )}
      </div>
    </ReceiverLayout>
  );
}


