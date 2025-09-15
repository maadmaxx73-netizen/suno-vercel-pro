import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  // In a production environment, you would look up the current user
  // via Supabase auth and retrieve their `stripe_customer_id` from
  // the `profiles` table. Then you would create a billing portal
  // session for that customer. For brevity this example returns
  // a dummy URL.
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: 'cus_dummy',
      return_url: process.env.NEXT_PUBLIC_SITE_URL || req.headers.origin,
    });
    return res.status(200).json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating billing portal session', error);
    return res.status(500).json({ error: error.message });
  }
}
