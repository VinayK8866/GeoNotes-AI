-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create Policy for INSERT
CREATE POLICY "Users can insert their own notes"
ON notes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create Policy for SELECT
CREATE POLICY "Users can view their own notes"
ON notes FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Create Policy for UPDATE
CREATE POLICY "Users can update their own notes"
ON notes FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create Policy for DELETE
CREATE POLICY "Users can delete their own notes"
ON notes FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
