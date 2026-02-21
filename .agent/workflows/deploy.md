---
description: how to deploy the application to Vercel
---

Follow these steps to deploy your live voting system to production:

### 1. Push Code to GitHub
Ensure all your local changes are committed and pushed to a GitHub repository.

### 2. Configure Supabase Production
1. Log in to your [Supabase Dashboard](https://app.supabase.com).
2. Go to the **SQL Editor** in your project.
3. Copy the contents of `supabase_schema.sql` and run it to set up the production tables and RLS policies.
4. Go to **Project Settings > API** to find your `URL` and `anon public` key.

### 3. Deploy to Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New > Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add the following:
   - `NEXT_PUBLIC_SUPABASE_URL`: (Your Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: (Your Supabase Anon Key)
5. Click **Deploy**.

### 4. Verify the Live Site
Once the build is complete, Vercel will provide a production URL (e.g., `livot-app.vercel.app`).
1. Open the URL.
2. Verify that the **Landing Page** loads.
3. Navigate to `/admin` to ensure you can reach the dashboard.
4. Open `/reveal` on a separate screen to verify real-time connectivity.

### 5. Final Checklist
- [ ] RLS Policies are enabled in Supabase.
- [ ] Realtime is enabled for `app_control`, `votes`, and `contestants` tables.
- [ ] Environment variables match between `.env.local` and Vercel settings.
