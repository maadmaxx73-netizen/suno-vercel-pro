import { createClient } from '@supabase/supabase-js';

// Create a Supabase client with elevated privileges using the service role key.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  // Load the user's profile
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, credits')
    .eq('id', userId)
    .single();
  if (profErr || !profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }
  const now = new Date();
  const today = now.toISOString().substring(0, 10);
  // Free users are limited to 5 generations per day. Track usage in a
  // separate table. Pro users consume credits directly.
  if (profile.role === 'free') {
    // Fetch daily usage entry
    const { data: usage, error: usageErr } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();
    if (usageErr && usageErr.code !== 'PGRST116') {
      // PGRST116 indicates no rows found when using .single()
      return res.status(500).json({ error: 'Unable to fetch daily usage' });
    }
    if (usage && usage.count >= 5) {
      return res.status(403).json({ error: 'Daily limit reached. Upgrade to Pro.' });
    }
    // Update or insert usage row
    if (usage) {
      const { error: updateErr } = await supabase
        .from('daily_usage')
        .update({ count: usage.count + 1 })
        .eq('id', usage.id);
      if (updateErr) {
        return res.status(500).json({ error: 'Unable to update usage' });
      }
    } else {
      const { error: insertErr } = await supabase
        .from('daily_usage')
        .insert({ user_id: userId, date: today, count: 1 });
      if (insertErr) {
        return res.status(500).json({ error: 'Unable to record usage' });
      }
    }
    return res.status(200).json({ success: true });
  }
  // Pro users: check credits
  if (profile.credits <= 0) {
    return res.status(403).json({ error: 'No credits available. Please top up or renew.' });
  }
  // Decrement credit for Pro users
  const { error: upErr } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - 1 })
    .eq('id', userId);
  if (upErr) {
    return res.status(500).json({ error: 'Unable to update credits' });
  }
  return res.status(200).json({ success: true });
}
