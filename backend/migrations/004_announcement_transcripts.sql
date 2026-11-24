-- Announcements had no place for a transcript, so the frontend could only say
-- "A transcript hasn't been added yet". This adds an optional text column for it.
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS transcript TEXT;
