import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';

/**
 * Pricing page presenting subscription plans and credit packs. Users can upgrade
 * to Pro via Stripe Checkout or purchase one-time credit packs. A link to
 * the customer portal is also provided for managing subscriptions.
 */
export default function Pricing() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    getSession();
  }, []);

  // Request the backend to create a Stripe Checkout session for the monthly Pro plan.
  const checkoutPro = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const json = await res.json();
      if (json.sessionUrl) {
        window.location.href = json.sessionUrl;
      } else {
        setMessage(json.error || 'Unable to start checkout.');
      }
    } catch (err) {
      setMessage('Unable to start checkout.');
    }
  };

  // Request a credit pack purchase (e.g. 100 credits one-time).
  const purchaseCredits = async () => {
    setMessage('');
    try {
      const res = await fetch('/api/credit-pack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      const json = await res.json();
      if (json.sessionUrl) {
        window.location.href = json.sessionUrl;
      } else {
        setMessage(json.error || 'Unable to start credit purchase.');
      }
    } catch (err) {
      setMessage('Unable to start credit purchase.');
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Pricing</h1>
      {message && <p>{message}</p>}
      <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
        <div style={{ border: '1px solid #ccc', padding: '1rem', maxWidth: '300px' }}>
          <h2>Free</h2>
          <p>5 generations per day</p>
          <p>Access simple music generation</p>
          <p>No credit card required</p>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '1rem', maxWidth: '300px' }}>
          <h2>Pro</h2>
          <p>500 credits per month</p>
          <p>Up to 60&nbsp;s tracks</p>
          <p>Access premium features (2‑track, cover art, fast queue)</p>
          <button onClick={checkoutPro} style={{ marginTop: '1rem' }}>Go Pro</button>
        </div>
        <div style={{ border: '1px solid #ccc', padding: '1rem', maxWidth: '300px' }}>
          <h2>Credit Pack</h2>
          <p>One‑time purchase of extra credits</p>
          <p>Top up your credits whenever you need more</p>
          <button onClick={purchaseCredits} style={{ marginTop: '1rem' }}>Buy 100 Credits</button>
        </div>
      </div>
      {user && (
        <div style={{ marginTop: '2rem' }}>
          <a
            href={`/api/stripe/portal?userId=${user.id}`}
            style={{ textDecoration: 'underline' }}
          >
            Manage Billing
          </a>
        </div>
      )}
    </main>
  );
}
