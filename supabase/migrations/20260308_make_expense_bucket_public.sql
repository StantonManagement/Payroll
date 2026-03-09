-- Make expense-receipts storage bucket public so receipt/signature URLs work.
-- Run this once in the Supabase SQL editor (requires postgres role).
UPDATE storage.buckets SET public = true WHERE id = 'expense-receipts';
