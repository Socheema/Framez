# Database Schema Reference

This document describes the expected Supabase database schema for the framez-social app.

## Required Tables

### 1. `profiles` Table
Stores user profile information.

**Columns:**
- `id` (uuid, primary key) - References auth.users(id)
- `username` (text, unique) - User's username
- `full_name` (text) - User's full name
- `avatar_url` (text, nullable) - URL to user's avatar image
- `bio` (text, nullable) - User's bio
- `created_at` (timestamp with time zone) - Account creation timestamp
- `updated_at` (timestamp with time zone) - Last update timestamp

**Notes:**
- The `id` should reference `auth.users(id)` for Supabase Auth integration
- Enable Row Level Security (RLS) policies for user data protection

---

### 2. `posts` Table
Stores user posts with images.

**Columns:**
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, not null) - References profiles(id)
- `caption` (text, not null) - Post caption/text content
- `image_url` (text, not null) - URL to the post image in Supabase Storage
- `created_at` (timestamp with time zone, default: now())
- `updated_at` (timestamp with time zone, default: now())

**Foreign Keys:**
- `user_id` → `profiles(id)` (optional but recommended)

**Indexes:**
- Index on `user_id` for faster user post lookups
- Index on `created_at` for chronological ordering

**RLS Policies:**
- Enable RLS
- Allow all users to read posts
- Only authenticated users can create posts
- Only post owners can update/delete their posts

---

### 3. `likes` Table
Stores post likes/reactions.

**Columns:**
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, not null) - References profiles(id)
- `post_id` (uuid, not null) - References posts(id)
- `created_at` (timestamp with time zone, default: now())

**Foreign Keys:**
- `user_id` → `profiles(id)` (optional)
- `post_id` → `posts(id)` ON DELETE CASCADE (recommended)

**Unique Constraint:**
- Composite unique constraint on (`user_id`, `post_id`) to prevent duplicate likes

**Indexes:**
- Index on `post_id` for counting likes per post
- Index on `user_id` for user's liked posts

**RLS Policies:**
- Enable RLS
- Allow authenticated users to read likes
- Only authenticated users can create likes
- Only like owners can delete their likes

---

### 4. `comments` Table
Stores post comments.

**Columns:**
- `id` (uuid, primary key, default: gen_random_uuid())
- `user_id` (uuid, not null) - References profiles(id)
- `post_id` (uuid, not null) - References posts(id)
- `text` (text, not null) - Comment text content
- `created_at` (timestamp with time zone, default: now())
- `updated_at` (timestamp with time zone, default: now())

**Foreign Keys:**
- `user_id` → `profiles(id)` (optional)
- `post_id` → `posts(id)` ON DELETE CASCADE (recommended)

**Indexes:**
- Index on `post_id` for fetching post comments
- Index on `created_at` for chronological ordering

**RLS Policies:**
- Enable RLS
- Allow all users to read comments
- Only authenticated users can create comments
- Only comment owners can update/delete their comments

---

## Supabase Storage Buckets

### `posts` Bucket
Stores post images uploaded by users.

**Configuration:**
- **Public Access:** Yes (for displaying images)
- **File Size Limit:** 10 MB (recommended)
- **Allowed MIME Types:** image/jpeg, image/png, image/webp
- **Folder Structure:** Flat structure with unique filenames (timestamp-random.ext)

**RLS Policies:**
- Allow authenticated users to upload (INSERT)
- Allow public read access (SELECT)
- Allow users to delete their own uploaded images

---

## Important Notes

### Foreign Key Constraints (Optional)
The current app implementation **does NOT require** foreign key constraints to be set up in Supabase. The queries have been rewritten to:
- Fetch data separately from different tables
- Manually join data in the application layer
- Avoid `profiles!fkey_name` syntax in queries

This approach is more flexible and works even if foreign keys aren't configured.

### If You Want to Add Foreign Keys Later
If you decide to add foreign key constraints for data integrity:

```sql
-- Add foreign key from posts to profiles
ALTER TABLE posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add foreign key from likes to posts
ALTER TABLE likes 
ADD CONSTRAINT likes_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES posts(id) 
ON DELETE CASCADE;

-- Add foreign key from likes to profiles
ALTER TABLE likes 
ADD CONSTRAINT likes_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;

-- Add foreign key from comments to posts
ALTER TABLE comments 
ADD CONSTRAINT comments_post_id_fkey 
FOREIGN KEY (post_id) 
REFERENCES posts(id) 
ON DELETE CASCADE;

-- Add foreign key from comments to profiles
ALTER TABLE comments 
ADD CONSTRAINT comments_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES profiles(id) 
ON DELETE CASCADE;
```

---

## Quick Setup SQL

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create posts table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  caption TEXT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create likes table
CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create comments table
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (customize as needed)
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create posts"
  ON posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create likes"
  ON likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);
```
