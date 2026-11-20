# Deploying to Vercel

How to put the app online with [Vercel](https://vercel.com). The app runs on
Vercel; the database, logins and file storage stay on Supabase.

For first-time Supabase setup (first admin, email templates, roles), see
[FINANCE_SETUP.md](FINANCE_SETUP.md).

## 1. Push the code to GitHub

Vercel deploys from GitHub (`NyxR/YourVotingSystem`). Commit and push your
changes:

- Code on the **production branch** (usually `master`) goes to the live site.
- Every other branch gets its own **preview** URL, which is handy for testing
  before merging.

## 2. Update the database (from your computer)

Run these with `.env.local` pointing at the production Supabase project, before
the first deploy and again whenever new migrations are added:

```bash
npm run db:migrate   # applies pending migrations (prisma migrate deploy)
npm run setup        # creates missing storage buckets (receipts, forum, avatars)
```

Both are safe to re-run. Vercel does **not** run migrations itself.

## 3. Create the Vercel project

1. On vercel.com, open **Add New → Project** and import the GitHub repository.
2. Set **Root Directory** to `frontend`. The app lives in that subfolder.
3. Leave **Framework Preset** (Next.js), **Build Command** and **Install Command**
   as they are. `npm install` runs `prisma generate` automatically (the
   `postinstall` script), because the generated Prisma client is not committed.
4. Add the **Environment Variables** below.
5. Click **Deploy**.

### Environment variables

| Variable                        | Value                                                     | Notes                                   |
| ------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL`                  | as in `.env.local`                                        | Transaction pooler, port 6543: used by the app |
| `DIRECT_URL`                    | as in `.env.local`                                        | Session pooler, port 5432: migrations only |
| `NEXT_PUBLIC_SUPABASE_URL`      | as in `.env.local`                                        |                                         |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | as in `.env.local`                                        |                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | as in `.env.local`                                        | **Secret.** Never prefix with `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL`          | `https://<your-project>.vercel.app` or your own domain    | Used in invite and password-reset links |
| `NEXT_PUBLIC_APP_TIMEZONE`      | `America/Moncton`                                         | Optional, see "Recommended" below       |

Variables starting with `NEXT_PUBLIC_` are baked in at build time: after
changing one, **redeploy** (Deployments → ⋯ → Redeploy). If you only know the
final URL after the first deploy, set `NEXT_PUBLIC_SITE_URL` then and redeploy.

## 4. Point Supabase at the live site

In the Supabase dashboard:

**Authentication → URL Configuration**

- **Site URL**: `https://<your-project>.vercel.app` (or your domain).
- **Redirect URLs**: add `https://<your-project>.vercel.app/**`. Keep
  `http://localhost:3000/**` for development.

**Authentication → Emails → Templates**

- Paste [email-templates/invite.html](email-templates/invite.html) into
  **Invite user** and [email-templates/reset-password.html](email-templates/reset-password.html)
  into **Reset password** (each file starts with its subject line).
- The emails load the logo from `{{ .SiteURL }}/Logo_VOMM.png`, so it only shows
  once the Site URL is the public address.

**Authentication → Emails → SMTP Settings**

- Strongly recommended: Supabase's built-in mailer only sends a few emails per
  hour, which is not enough for inviting members. Use any SMTP provider
  (e.g. your domain's mail, Resend, Brevo, SendGrid).

## 5. Custom domain (optional)

In Vercel, open **Project → Settings → Domains**, add your domain, and follow the
DNS instructions. Then update `NEXT_PUBLIC_SITE_URL` (and redeploy) and the
Supabase **Site URL** / **Redirect URLs** to the new domain.

## Recommended

- **Time zone.** Without `NEXT_PUBLIC_APP_TIMEZONE`, the app uses
  `America/Toronto` (Eastern time). Moncton is on Atlantic time, one hour ahead,
  so set `NEXT_PUBLIC_APP_TIMEZONE=America/Moncton` in Vercel (and in
  `.env.local`). Otherwise transactions entered around midnight can land on the
  wrong day.
- **Database connections.** The app uses Supabase's *transaction* pooler
  (`DATABASE_URL`, port 6543), which is what Supabase recommends for serverless
  hosting; `DIRECT_URL` (session pooler, port 5432) is only used for migrations.
  Make sure `DATABASE_URL` is set in Vercel: without it the app falls back to
  `DIRECT_URL` and can hit "max clients reached" (the session pooler allows
  only 15 connections in total).

## After deploying: quick check

1. Open the Vercel URL and sign in. You should land on the Forum.
2. Open **Overview**: the charts load (database OK).
3. From **Users**, invite yourself at another email address. The email arrives,
   shows the logo, and its link opens **Set password** on the live site.
4. Upload a profile picture in **My profile** (storage OK).
5. Open a forum topic in two browsers and post a reply: it appears live
   (Realtime OK).

## Troubleshooting

| Symptom                                          | Likely cause / fix                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Build fails: `Cannot find module '@/generated/prisma/...'` | Root Directory isn't `frontend`, or the `postinstall` script was removed.                         |
| Invite/reset link goes to `localhost`            | Supabase **Site URL** or `NEXT_PUBLIC_SITE_URL` still points to localhost; fix it and redeploy.          |
| Link says "invalid or expired"                   | It was already used or timed out; send a new one. Check **Redirect URLs** includes the live domain.    |
| Pages error after a deploy with new features     | Migrations not applied: run `npm run db:migrate` against the production database.                      |
| Pictures / forum images don't load               | Buckets missing: run `npm run setup`.                                                                    |
| "Max clients reached" in the logs                | `DATABASE_URL` missing in Vercel (the app fell back to the session pooler). Add it and redeploy.       |
| Emails stop arriving after a few                 | Built-in mailer rate limit: configure SMTP.                                                              |

Logs: Vercel → Project → **Logs** (server errors), Supabase → **Logs**
(auth, database, storage).
