import { useState, useEffect } from 'react';
import supabase from '../lib/supabaseClient';

/**
 * Dashboard page shows a logged-in user's generated tracks. It also
 * demonstrates feature gating: Pro users can access two-track generation,
 * cover art, and faster queue, while free users see upgrade prompts.
 */
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    init();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  // Load profile and tracks when user changes.
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setTracks([]);
      setLoading(false);
      return;
    }
    const load = async () => {
      // load profile
      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('role, credits')
        .eq('id', user.id)
        .single();
      if (!profErr) setProfile(prof);
      // load tracks
      const { data: tracksData } = await supabase
        .from('tracks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setTracks(tracksData || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <p>Loading...</p>;
  if (!user) return <p>Please sign in to view your dashboard.</p>;

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Your Tracks</h1>
      <p>
        Role: <strong>{profile?.role}</strong> | Credits: <strong>{profile?.credits}</strong>
      </p>
      {tracks.length === 0 && <p>You haven't generated any tracks yet.</p>}
      {tracks.map((t) => (
        <div key={t.id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
          <h3>{t.title || 'Untitled'}</h3>
          {t.audio_url ? (
            <audio controls src={t.audio_url} />
          ) : (
            <p>Audio file missing.</p>
          )}
          <p>Generated on {new Date(t.created_at).toLocaleString()}</p>
        </div>
      ))}
      <div style={{ marginTop: '2rem' }}>
        <h2>Premium Features</h2>
        {profile?.role === 'pro' ? (
          <ul>
            <li>Two‑track generation: Coming soon!</li>
            <li>Cover art generation: Coming soon!</li>
            <li>Faster queue: You already enjoy priority!</li>
          </ul>
        ) : (
          <p>
            Upgrade to Pro to unlock two‑track generation, cover art, and faster queue.{' '}
            <a href="/pricing">View plans</a>.
          </p>
        )}
      </div>
    </main>
  );
}
