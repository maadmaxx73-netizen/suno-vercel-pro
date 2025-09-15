# Suno Clone (Vercel‑ready)

This repository contains a stripped‑down Suno clone built with Next.js, Supabase and Stripe. It implements a simple music generation interface with authentication, subscriptions, credits, credit packs and role‑based feature gating. Use it as a starting point for deploying your own music generator on Vercel.

## Features

* **Authentication** – Sign up, sign in and sign out via Supabase Auth.
* **Free vs Pro** – Free users can generate up to five tracks per day. Pro users receive monthly credits (default 500) and can generate longer tracks.
* **Credits & Daily Limits** – Free generation limits are enforced via the `daily_usage` table. Pro users consume credits per generation.
* **Subscriptions** – A `/api/stripe/checkout` endpoint creates a Stripe Checkout session for the monthly Pro plan. A webhook handler updates the user's role and credits when payments complete.
* **Credit Packs** – One‑time credit packs can be purchased via `/api/credit-pack`. Completed purchases add 100 credits to the user's account.
* **Billing Portal** – A `/api/stripe/portal` endpoint opens Stripe’s customer portal so users can manage their subscription.
* **Feature Flags** – The dashboard shows premium features (two‑track generation, cover art and faster queue) only to Pro users.

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone <your fork>
   cd suno-vercel-ready
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in the values:

   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` – from your Supabase project.
   - `SUPABASE_SERVICE_ROLE_KEY` – service role key for server‑side updates (keep it secret!).
   - `STRIPE_SECRET_KEY` – your Stripe secret key.
   - `STRIPE_WEBHOOK_SECRET` – your Stripe webhook signing secret.
   - `STRIPE_PRICE_PRO_MONTHLY` – the price ID for your monthly subscription plan.
   - `STRIPE_PRICE_CREDIT_PACK` – the price ID for your one‑time credit pack.
   - `NEXTAUTH_SECRET` – any long random string used to encrypt JWTs (required for NextAuth if you extend auth).
   - `NEXT_PUBLIC_SITE_URL` – the base URL of your deployment (e.g. `https://yoursite.com`).

3. **Provision your database**

   In the Supabase dashboard, open the SQL editor and run the statements in `supabase.sql`. This creates the `profiles`, `tracks` and `daily_usage` tables, along with row‑level security policies.

4. **Deploy**

   Push the repository to GitHub and import it into Vercel. Set the environment variables in the Vercel dashboard, then deploy. Configure your Stripe account to send webhook events to `/api/stripe/webhook` on your Vercel domain.

## Caveats

* Audio generation is simulated in this example. Integrate a real music generation API (e.g. Suno, Udio or your own model) inside the `handleGenerate` function on the frontend, and store files in Supabase Storage.
* Webhook handling is simplified and does not account for all subscription lifecycle events.
* You may need to adjust policies and triggers to reset free credits daily and monthly resets for Pro accounts.

Feel free to extend this project with richer UIs, additional generation modes or more robust billing logic.
