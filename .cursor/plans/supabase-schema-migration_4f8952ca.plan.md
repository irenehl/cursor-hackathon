---
name: supabase-schema-migration
overview: Create the initial Supabase migration file (0001_init.sql) with all required tables, indexes, and RLS policies for the Pixel Meet.
todos:
  - id: create-migrations-dir
    content: Create supabase/migrations/ directory structure
    status: completed
  - id: create-init-migration
    content: Create 0001_init.sql with all 7 tables (profiles, events, event_sessions, tickets, hand_queue, penalties, pvp_duels)
    status: completed
  - id: add-indexes
    content: "Add all required indexes: tickets(event_id), tickets(assigned_user_id), hand_queue(event_id, status, created_at), penalties(event_id, user_id, until), pvp_duels(session_id, status)"
    status: completed
  - id: enable-rls
    content: Enable RLS on all tables and create policies for profiles, events, tickets, hand_queue, penalties, and pvp_duels
    status: completed
isProject: false
---

# Supabase Schema Migration Implementation

## Overview

Create `supabase/migrations/0001_init.sql` containing all database tables, indexes, and Row Level Security (RLS) policies required for the Pixel Meet.

## File Structure

Create the migrations directory structure:

- `supabase/migrations/0001_init.sql` - Main schema file with tables, indexes, and RLS

## Tables to Create

### 1. profiles

- `user_id` (UUID, PK, references auth.users)
- `display_name` (TEXT, NOT NULL)
- `avatar_id` (INTEGER, NOT NULL)
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

### 2. events

- `id` (UUID, PK, default gen_random_uuid())
- `title` (TEXT, NOT NULL)
- `starts_at` (TIMESTAMPTZ, NOT NULL)
- `duration_minutes` (INTEGER, NOT NULL)
- `capacity` (INTEGER, NOT NULL)
- `host_user_id` (UUID, NOT NULL, references auth.users)
- `status` (TEXT, NOT NULL) - e.g., 'draft', 'open', 'closed'
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

### 3. event_sessions

- `id` (UUID, PK, default gen_random_uuid())
- `event_id` (UUID, NOT NULL, references events(id))
- `status` (TEXT, NOT NULL) - e.g., 'open', 'closed'
- `created_at` (TIMESTAMPTZ, default now())
- `updated_at` (TIMESTAMPTZ, default now())

### 4. tickets

- `code` (TEXT, PK)
- `event_id` (UUID, NOT NULL, references events(id))
- `assigned_user_id` (UUID, NULL, references auth.users)
- `used_at` (TIMESTAMPTZ, NULL)
- `created_at` (TIMESTAMPTZ, default now())

### 5. hand_queue

- `id` (UUID, PK, default gen_random_uuid())
- `event_id` (UUID, NOT NULL, references events(id))
- `user_id` (UUID, NOT NULL, references auth.users)
- `status` (TEXT, NOT NULL) - 'raised' or 'granted'
- `created_at` (TIMESTAMPTZ, default now())

### 6. penalties

- `id` (UUID, PK, default gen_random_uuid())
- `event_id` (UUID, NOT NULL, references events(id))
- `user_id` (UUID, NOT NULL, references auth.users)
- `type` (TEXT, NOT NULL) - 'kick' or 'ban'
- `until` (TIMESTAMPTZ, NOT NULL)
- `created_by` (UUID, NOT NULL, references auth.users)
- `created_at` (TIMESTAMPTZ, default now())

### 7. pvp_duels

- `id` (UUID, PK, default gen_random_uuid())
- `session_id` (UUID, NOT NULL, references event_sessions(id))
- `challenger_id` (UUID, NOT NULL, references auth.users)
- `opponent_id` (UUID, NOT NULL, references auth.users)
- `status` (TEXT, NOT NULL) - 'pending', 'resolved'
- `winner_id` (UUID, NULL, references auth.users)
- `created_at` (TIMESTAMPTZ, default now())
- `resolved_at` (TIMESTAMPTZ, NULL)

## Indexes to Create

1. `tickets(event_id)` - For efficient ticket lookups by event
2. `tickets(assigned_user_id)` - For finding tickets assigned to a user
3. `hand_queue(event_id, status, created_at)` - Composite index for queue queries ordered by creation time
4. `penalties(event_id, user_id, until)` - Composite index for active penalty checks
5. `pvp_duels(session_id, status)` - For finding active duels in a session

## RLS Policies

### profiles

- **SELECT**: Allow authenticated users to read all profiles
- **INSERT**: Allow users to insert their own profile (`user_id = auth.uid()`)
- **UPDATE**: Allow users to update their own profile (`user_id = auth.uid()`)

### events

- **SELECT**: Allow authenticated users to read all events
- **INSERT/UPDATE/DELETE**: Only allow the host (`host_user_id = auth.uid()`)

### tickets

- **SELECT**: Only allow the host of the ticket's event to read tickets
- **INSERT**: Only allow the host of the event to create tickets
- **UPDATE**: Only allow the host of the event to update tickets

### hand_queue

- **SELECT**: Allow hosts to read all queue entries for their events, and users to read their own entries
- **INSERT**: Allow authenticated users to insert their own queue entries
- **UPDATE**: Allow hosts to update queue entries for their events

### penalties

- **SELECT**: Allow hosts to read penalties for their events, and users to read penalties affecting them
- **INSERT**: Only allow hosts to insert penalties (enforced in RPC, but RLS adds defense)

### pvp_duels

- **SELECT**: Allow participants (challenger or opponent) and hosts to read duels
- **INSERT**: Allow authenticated users to create duels (validation in RPC)
- **UPDATE**: Allow participants and hosts to update duels (validation in RPC)

## Implementation Notes

- Use PostgreSQL UUID type with `gen_random_uuid()` for primary keys
- Use `TIMESTAMPTZ` for all timestamp fields to handle timezones properly
- Enable RLS on all tables with `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- Use `SECURITY DEFINER` functions will be created in the next migration (0002_rpc.sql)
- Foreign key constraints should use `ON DELETE CASCADE` or `ON DELETE RESTRICT` as appropriate
- Consider adding check constraints for status enums (e.g., `status IN ('raised', 'granted')`)

## Validation

After creating the migration:

- Verify all tables are created with correct columns and types
- Verify all indexes are created and properly named
- Verify RLS is enabled on all tables
- Verify all policies are created and functional
- Test that policies correctly restrict access based on user roles

