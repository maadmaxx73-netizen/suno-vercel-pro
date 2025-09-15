import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';

/**
 * Home page for the Suno clone. This page implements a simple
 * authentication flow (sign up/sign in/sign out) using Supabase Auth
 * and demonstrates generation gating based on a user's role and
 * available credits. Free users are limited to 5 generations per
 * day, while Pro users consume credits. For brevity, audio
 * generation is simulated rather than producing an actual waveform.
 */
export default function Home() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState('sign-in');

  // Listen for auth changes and update local state.
  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    fetchSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Fetch profile information (role and credits) when user changes.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, credits')
        .eq('id', user.id)
        .single();
      if (error) {
        console.error('Error loading profile', error);
      } else {
        setProfile(data);
      }
    };
    fetchProfile();
  }, [user]);

  // Handle sign-up submission.
  const handleSignUp = async (evt) => {
    evt.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMessage(error.message);
    else setMessage('Check your email to complete sign-up.');
  };

  // Handle sign-in submission.
  const handleSignIn = async (evt) => {
    evt.preventDefault();
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message);
  };

  // Handle sign-out.
  const handleSignOut = async () => {
    setMessage('');
    await supabase.auth.signOut();
  };

  // Simulate audio generation while decrementing credits.
  const handleGenerate = async () => {
    setMessage('');
    if (!profile) {
      setMessage('Please sign in to generate music.');
      return;
    }
    // Free users are limited to 5 generations per day. Credits reflect remaining usage.
    if (profile.role === 'free' && profile.credits <= 0) {
      setMessage('Out of free generations for today. Upgrade to Pro or come back tomorrow.');
      return;
    }
    try {
      const res = await fetch('/api/usage/spend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json();
      if (json.error) {
        setMessage(json.error);
      } else {
        // Ideally here we would call an audio generation API. For this example
        // we simply update the credit count in local state and show a success message.
        setMessage('Your track is being generated! This is a stub.');
        // Refresh credits from the server to reflect consumption.
        const { data } = await supabase
          .from('profiles')
          .select('role, credits')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    } catch (err) {
      setMessage('Something went wrong.');
    }
  };

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Suno Clone</h1>
      {message && <p>{message}</p>}
      {!user && (
        <div style={{ marginTop: '2rem' }}>
          <h2>{authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}</h2>
          <form onSubmit={authMode === 'sign-in' ? handleSignIn : handleSignUp} style={{ display: 'flex', flexDirection: 'column', maxWidth: '300px' }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ marginBottom: '0.5rem' }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ marginBottom: '0.5rem' }}
            />
            <button type="submit">{authMode === 'sign-in' ? 'Sign In' : 'Sign Up'}</button>
          </form>
          <button onClick={() => setAuthMode(authMode === 'sign-in' ? 'sign-up' : 'sign-in')} style={{ marginTop: '1rem' }}>
            {authMode === 'sign-in' ? 'Create an account' : 'Have an account? Sign in'}
          </button>
        </div>
      )}
      {user && profile && (
        <div style={{ marginTop: '2rem' }}>
          <p>
            Logged in as {user.email} | Role: <strong>{profile.role}</strong> | Credits: <strong>{profile.credits}</strong>
          </p>
          <button onClick={handleGenerate} style={{ marginRight: '1rem' }}>
            Generate Music
          </button>
          {profile.role === 'free' && (
            <a href="/pricing" style={{ marginRight: '1rem' }}>
              Upgrade to Pro
            </a>
          )}
          <button onClick={handleSignOut}>Sign Out</button>
        </div>
      )}
    </main>
  );
}
