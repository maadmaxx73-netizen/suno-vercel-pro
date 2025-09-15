import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing for the webhook handler because Stripe requires the raw
// request body to validate signatures. Next.js allows disabling the default
// body parser on a per-route basis by setting the api.bodyParser flag to false.
export const config = {
  api: {
    bodyParser: false,
  },
};

/**
 * Stripe webhook handler. Updates user roles and credits based on checkout
 * completions and subscription events. Ensure the endpoint is
 * configured in Stripe and the secret is set in STRIPE_WEBHOOK_SECRET.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method not allowed');
  }
  // Read the raw request body into a Buffer. We can't rely on Next.js to
  // parse the body because Stripe signature verification requires the
  // unchanged raw payload.
  const getRawBody = async (readable) => {
    const chunks = [];
    for await (const chunk of readable) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  };
  const buf = await getRawBody(req);
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { metadata, mode } = session;
      const userId = metadata?.userId;
      if (!userId) break;
      // Store stripe customer id
      const customerId = session.customer;
      if (mode === 'subscription') {
        // New subscription: set user role to pro and give credits
        await supabase
          .from('profiles')
          .update({ role: 'pro', credits: 500, stripe_customer_id: customerId })
          .eq('id', userId);
      } else if (mode === 'payment') {
        // One-time payment (credit pack). Increment credits by 100
        const { data: prof } = await supabase
          .from('profiles')
          .select('credits')
          .eq('id', userId)
          .single();
        const newCredits = (prof?.credits || 0) + 100;
        await supabase
          .from('profiles')
          .update({ credits: newCredits, stripe_customer_id: customerId })
          .eq('id', userId);
      }
      break;
    }
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      // Retrieve customer from invoice to determine user
      const customer = invoice.customer;
      // Find the user by stripe_customer_id
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customer);
      const userId = profiles?.[0]?.id;
      if (userId) {
        await supabase
          .from('profiles')
          .update({ role: 'free', credits: 5 })
          .eq('id', userId);
      }
      break;
    }
    // TODO: handle subscription.updated and canceled events if needed
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  res.json({ received: true });
}
