# 🚀 Quick Fix Guide - Follow Button Not Working

## 🎯 Problem
- Follow button changes to "Following" then immediately reverts
- Follower count increases then decreases back to 0
- Console error: `403 Forbidden` and `RLS policy violation (42501)`

## ✅ Solution (5 minutes)

### 1️⃣ Open Supabase Dashboard
👉 https://supabase.com/dashboard → Select your project → SQL Editor

### 2️⃣ Run This SQL (Copy & Paste)
```sql
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read all follows" ON follows;
DROP POLICY IF EXISTS "Users can insert follows as follower" ON follows;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON follows;

CREATE POLICY "Users can read all follows"
ON follows FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert follows as follower"
ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete their own follow relationships"
ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);
```

### 3️⃣ Click "Run" ▶️
You should see: "Success. No rows returned"

### 4️⃣ Verify (Optional)
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'follows';
```
Should show 3 policies.

### 5️⃣ Test in App
1. Refresh your app: `npx expo start -c`
2. Navigate to a user profile
3. Click "Follow" button
4. ✅ Should stay "Following" (not revert!)

## 🎉 Done!

---

## 📚 More Details
- **Full Guide**: `FIX_FOLLOW_BUTTON.md`
- **All SQL**: `FOLLOW_RLS_POLICIES.sql`
- **Verification**: `VERIFY_RLS_POLICIES.sql`

---

## 🆘 Still Not Working?

### Check Authentication
```sql
SELECT auth.uid(); -- Should return your user ID, not NULL
```

### Check Policies Exist
```sql
SELECT COUNT(*) FROM pg_policies WHERE tablename = 'follows';
-- Should return 3
```

### Check Console
Open browser console (F12) → Look for errors when clicking Follow

---

## 💡 Why This Happens

Your code is **correct**! The issue is:
- ✅ Code has optimistic updates (shows "Following" immediately)
- ❌ Database blocks the operation (no RLS policies)
- ⚠️ Code automatically reverts when database fails

Once you add RLS policies:
- ✅ Database allows the operation
- ✅ UI stays updated
- ✅ Everything works!

---

## 🔒 What These Policies Do

1. **SELECT**: Let users see who follows whom (for counts)
2. **INSERT**: Let users follow others (as themselves)
3. **DELETE**: Let users unfollow (their own follows only)

**Security**: Users can't create/delete follows for other people ✅

---

**No code changes needed!** Just run the SQL and you're done. 🎊
