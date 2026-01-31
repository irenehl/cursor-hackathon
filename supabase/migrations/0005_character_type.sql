-- Add character_type column to profiles table
-- Supports: 'default', 'pink_monster', 'owlet_monster', 'dude_monster'

ALTER TABLE profiles 
ADD COLUMN character_type TEXT NOT NULL DEFAULT 'default';

-- Add check constraint to ensure valid character types
ALTER TABLE profiles
ADD CONSTRAINT profiles_character_type_check 
CHECK (character_type IN ('default', 'pink_monster', 'owlet_monster', 'dude_monster'));
