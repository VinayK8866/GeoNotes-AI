# Deploying Supabase Edge Functions

Follow these steps to deploy the `gemini-proxy` function.

## Prerequisites

1.  **Supabase CLI**: Included in the project dev dependencies.
2.  **Supabase Account**: You must be logged in.

## Steps

### 1. Login to Supabase

Run the following command and follow the instructions to authenticate:

```bash
npx supabase login
```

### 2. Link Project

If you haven't linked your local project to a remote Supabase project:

1.  Get your Reference ID from the Supabase Dashboard (Settings > General > Reference ID).
2.  Run:

```bash
npx supabase link --project-ref <your-project-id>
```

You will need your database password.

### 3. Apply Database Migrations

**IMPORTANT**: Before deploying the Edge Function, you must apply the database migrations:

```bash
npx supabase db push
```

This will apply both migrations:
- `20240601000000_enable_rls.sql` - Enables Row Level Security
- `20240602000000_add_updated_at.sql` - Adds the `updated_at` column with automatic triggers

Alternatively, you can manually run the SQL files in your Supabase Dashboard (SQL Editor):
1. Copy the contents of `supabase/migrations/20240601000000_enable_rls.sql`
2. Copy the contents of `supabase/migrations/20240602000000_add_updated_at.sql`
3. Execute them in order in the SQL Editor

### 4. Set Secrets

The `gemini-proxy` function requires the `GEMINI_API_KEY`. Set it in your remote project:

```bash
npx supabase secrets set GEMINI_API_KEY=<your-gemini-api-key>
```

### 5. Deploy Function

Deploy the function to the edge:

```bash
npx supabase functions deploy gemini-proxy --no-verify-jwt
```

> [!NOTE]
> The `--no-verify-jwt` flag is used here because we are handling CORS in the function and calling it with the anon key from the client. If you want to enforce strict Auth, remove the flag and ensure the client sends the bearer token (which `supabase.functions.invoke` does automatically).

## Verification

After deployment, check the Supabase Dashboard > Edge Functions to see your function status and logs.
