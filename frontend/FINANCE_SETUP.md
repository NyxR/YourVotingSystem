# Finance app: setup

One-time steps to get the finance dashboard, login and user management running.

## 1. Apply the database migration

Adds the `Category` and `Transaction` tables and links `User` to Supabase Auth
(`authId`). It is additive: no existing data is changed or removed.

```bash
npm run db:migrate        # = prisma migrate deploy (uses DIRECT_URL)
```

## 2. Run the setup script

Creates the private `receipts` and `forum` storage buckets, seeds default categories, and
creates your first admin login:

```bash
npm run setup -- --email you@example.org --name "Your Name" --password "choose-a-strong-one"
```

It is safe to re-run. Without `--email` it only does the buckets and categories.

## 3. Configure Supabase Auth (dashboard)

**Authentication → URL Configuration**

- **Site URL**: your app's URL, e.g. `http://localhost:3000` in development.
- **Redirect URLs**: add `http://localhost:3000/**` and your production URL `https://<your-domain>/**`.

**Authentication → Emails → Templates**: recommended, so invite and reset
links work in any browser. Replace the link in each template:

| Template       | Link                                                                                      |
| -------------- | ----------------------------------------------------------------------------------------- |
| Invite user    | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/set-password`   |
| Reset password | `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/set-password` |

The default templates also work, through a client-side fallback at `/auth/callback`.

Ready-made, branded French emails (subject line included at the top of each
file) are in `email-templates/`: paste `invite.html` into "Invite user" and
`reset-password.html` into "Reset password".

**SMTP**: Supabase's built-in email service only sends a few emails per hour.
For real use, set up custom SMTP under **Project Settings → Authentication → SMTP**.

## 4. Optional environment variables (`.env.local`)

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain   # base URL for links in emails (defaults to the request origin)
NEXT_PUBLIC_APP_TIMEZONE=America/Toronto   # decides what "today" / "this month" means
```

## Roles

| Role      | Can do                                                        |
| --------- | ------------------------------------------------------------- |
| Admin     | Invite, edit and remove users; moderate the forum; finance is read-only |
| Treasurer | Everything an Admin can do, plus add, edit and delete transactions, receipts and categories |
| Viewer    | Read-only access to the finance pages and CSV export          |

Users from before this change (no login yet) show as **Not invited** on the
Users page. Use **Resend invitation** to send them an invite email. The old
`agent` role is treated as **Viewer**.
