# Quick Fix: Add updated_at Column

The migration command failed because RLS policies already exist. You only need to run the second migration to add the `updated_at` column.

## Option 1: Run in Supabase Dashboard (Recommended)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/klqkcniotmefqmwuobmk)
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste this SQL:

```sql
-- Add updated_at column to notes table
ALTER TABLE notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create an index on updated_at for efficient sync queries
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

5. Click **Run** (or press Ctrl+Enter / Cmd+Enter)

## Option 2: Run via Supabase CLI

```bash
npx supabase db execute --file supabase/migrations/20240602000000_add_updated_at.sql
```

## After Running

1. Refresh your browser at `http://localhost:3000`
2. The white screen should be fixed!
