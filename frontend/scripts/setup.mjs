// One-time setup for the finance app. Safe to re-run.
//
//   npm run setup -- --email you@example.org --name "Your Name" --password "a-strong-password"
//
// 1. Creates the private `receipts` Supabase Storage bucket (if missing).
// 2. Seeds default income/expense categories (only when there are none).
// 3. Creates (or promotes) an admin who can sign in with that email/password.
//    Omit --email to skip this step.
//
// Requires the database migration to be applied first: npx prisma migrate deploy

import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const { values: args } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
  },
});

for (const key of ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'DIRECT_URL']) {
  if (!process.env[key]) {
    console.error(`Missing ${key}. Run with: node --env-file=.env.local scripts/setup.mjs`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const db = new pg.Client({ connectionString: process.env.DIRECT_URL });
await db.connect();

try {
  // ── 1. Receipts bucket ────────────────────────────────────
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;
  if (buckets.some((b) => b.name === 'receipts')) {
    console.log('✓ Storage bucket "receipts" already exists');
  } else {
    const { error } = await supabase.storage.createBucket('receipts', {
      public: false,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    });
    if (error) throw error;
    console.log('✓ Created private storage bucket "receipts"');
  }

  // ── 2. Default categories ─────────────────────────────────
  const { rows: [{ count }] } = await db.query('SELECT COUNT(*)::int AS count FROM "Category"');
  if (count > 0) {
    console.log(`✓ ${count} categories already exist, not seeding`);
  } else {
    const defaults = {
      INCOME: ['Donations', 'Membership dues', 'Fundraising', 'Grants', 'Other income'],
      EXPENSE: ['Rent & utilities', 'Supplies', 'Salaries & honoraria', 'Events', 'Bank fees', 'Other expenses'],
    };
    for (const [type, names] of Object.entries(defaults)) {
      for (const name of names) {
        await db.query(
          'INSERT INTO "Category" (id, name, type) VALUES ($1, $2, $3::"TransactionType")',
          [randomUUID(), name, type],
        );
      }
    }
    console.log('✓ Seeded default categories');
  }

  // ── 3. First admin ────────────────────────────────────────
  if (args.email) {
    const email = args.email.trim().toLowerCase();
    const name = args.name?.trim() || email.split('@')[0];
    if (!args.password || args.password.length < 8) {
      throw new Error('--password is required (at least 8 characters) when using --email');
    }

    // Find or create the Supabase Auth login.
    let authUser;
    for (let page = 1; !authUser; page++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      authUser = data.users.find((u) => u.email?.toLowerCase() === email);
      if (data.users.length < 1000) break;
    }
    if (authUser) {
      const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
        password: args.password,
        email_confirm: true,
      });
      if (error) throw error;
      console.log(`✓ Updated password for existing login ${email}`);
    } else {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: args.password,
        email_confirm: true,
        user_metadata: { username: name },
      });
      if (error) throw error;
      authUser = data.user;
      console.log(`✓ Created login ${email}`);
    }

    // Create or promote the app profile.
    const { rows } = await db.query('SELECT id FROM "User" WHERE lower(email) = $1', [email]);
    if (rows.length) {
      await db.query(
        'UPDATE "User" SET "authId" = $1, role = \'admin\', "updatedAt" = now() WHERE id = $2',
        [authUser.id, rows[0].id],
      );
      console.log(`✓ ${email} is now an admin`);
    } else {
      await db.query(
        'INSERT INTO "User" (id, "authId", username, email, role) VALUES ($1, $2, $3, $4, \'admin\')',
        [randomUUID(), authUser.id, name, email],
      );
      console.log(`✓ Created admin profile for ${email}`);
    }
  }

  console.log('\nDone. Start the app with `npm run dev` and sign in at /login.');
} catch (error) {
  console.error('\n✗ Setup failed:', error.message ?? error);
  process.exitCode = 1;
} finally {
  await db.end();
}
