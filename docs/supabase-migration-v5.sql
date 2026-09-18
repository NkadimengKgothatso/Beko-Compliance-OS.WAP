-- ═══════════════════════════════════════════════════════
-- Beko ComplianceOS — Supabase Migration v5
-- Adds document type tagging (used to match uploads to
-- outstanding requirements) and hardens the documents
-- storage bucket with file size and MIME type limits.
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ═══════════════════════════════════════════════════════

-- 1. Tag documents with the requirement they satisfy.
--    NULL means a general upload not tied to a checklist item.
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS doc_type TEXT;

CREATE INDEX IF NOT EXISTS idx_documents_user_doc_type
    ON public.documents (user_id, doc_type);

-- 2. Bucket-level upload controls (defence in depth on top of
--    the client-side extension/size validation):
--    - 10 MB maximum file size
--    - allowlisted MIME types for the accepted document formats
--      (application/octet-stream covers browsers that cannot
--      detect a type for legacy .doc/.xls files)
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'image/jpeg',
        'image/png',
        'application/octet-stream'
    ]
WHERE id = 'documents';
