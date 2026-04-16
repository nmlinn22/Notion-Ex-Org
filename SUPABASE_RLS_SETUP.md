# Supabase RLS Policy Setup for Account Creation

## Issue
New account creation was failing because:
1. ✅ AuthForm.tsx had `.eq()` chained after `.upsert()` (FIXED)
2. ✅ server.ts middleware didn't auto-create profiles (FIXED)
3. ❌ **Supabase profiles table missing INSERT RLS policy** (REQUIRES MANUAL SETUP)

## Step-by-Step Fix in Supabase Dashboard

### 1. Go to Supabase Dashboard
- Navigate to: https://app.supabase.com
- Select your project
- Go to **Authentication** → **Policies** (or **SQL Editor**)

### 2. Navigate to profiles Table RLS
- Click on **Tables** → **profiles**
- Select the **Security** tab
- OR use **SQL Editor** for direct policy management

### 3. Add INSERT Policy
Create a new policy with these settings:

**Policy Name:** `Allow INSERT for authenticated users`

**Command:** `INSERT`

**Target Role:** `authenticated`

**USING Expression:** `true` (or `auth.uid() = id` for owner-only)

**WITH CHECK Expression:** `auth.uid() = id`

### 4. SQL Alternative (Recommended)
Run this in SQL Editor:

```sql
-- Enable RLS on profiles table (if not already enabled)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if needed
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- Create INSERT policy for new user registration
CREATE POLICY "profiles_insert_policy" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Ensure SELECT and UPDATE policies exist
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
CREATE POLICY "profiles_select_policy" ON profiles
  FOR SELECT
  USING (auth.uid() = id OR is_admin = true);

DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
CREATE POLICY "profiles_update_policy" ON profiles
  FOR UPDATE
  USING (auth.uid() = id OR is_admin = true)
  WITH CHECK (auth.uid() = id OR is_admin = true);
```

### 5. Verify Setup
- Test new account creation in your app
- Profile should auto-create with role='member'
- Check **Authentication** → **Users** in Supabase Dashboard
- Verify new user appears and profile is created

## Code Changes Made

### AuthForm.tsx (Line 90-96)
**Before:**
```typescript
.upsert({ id: data.user.id, display_name: trimmedUsername }, { onConflict: 'id' })
.eq('id', data.user.id);  // ❌ INVALID - .eq() not used with upsert
```

**After:**
```typescript
.upsert({ id: data.user.id, display_name: trimmedUsername }, { onConflict: 'id' });
// ✅ Removed invalid .eq() call
```

### server.ts (Line 113-122)
**Before:**
```typescript
if (profileError || !profile) {
  return res.status(403).json({ error: "Profile not found." });
}
```

**After:**
```typescript
// Auto-create profile if doesn't exist
if (profileError && profileError.code === 'PGRST116') {
  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({ id: userId, role: 'member', is_admin: false })
    .select()
    .single();
  
  if (createError) {
    console.error("Profile auto-create error:", createError);
    return res.status(500).json({ error: "Failed to create user profile" });
  }
  
  profile = newProfile;
}
```

## Testing Checklist
- [ ] Supabase RLS INSERT policy added to profiles table
- [ ] Restart development server: `npm run dev`
- [ ] Create new account with email + username
- [ ] Verify profile is created automatically
- [ ] Check Server.ts logs for any profile creation errors
- [ ] Verify first login works without middleware errors

## Troubleshooting

### Error: "Profile not found"
- Verify RLS INSERT policy is enabled
- Check that policy allows authenticated users to INSERT

### Error: "Failed to create user profile"
- Check Supabase logs for policy violations
- Ensure service role key has proper permissions

### Users can't login after signup
- Verify both SELECT and INSERT policies are in place
- Check that UPDATE policy exists for profile updates
