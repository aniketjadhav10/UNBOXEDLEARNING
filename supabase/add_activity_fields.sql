-- Add content and url to the activities table to support richer AI-generated activity data
-- like YouTube links, worksheet instructions, etc.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS content text;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS url text;
