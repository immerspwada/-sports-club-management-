-- Fix coach role for demo.coach@test.com
-- User ID: 556cf2ae-9046-48b1-98ae-358cbcfcd179

-- Step 1: Check current state
SELECT 
  'Current user_roles' as check_type,
  ur.user_id,
  ur.role,
  au.email
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
WHERE au.email = 'demo.coach@test.com';

-- Step 2: Check for duplicates
SELECT 
  'Duplicate check' as check_type,
  user_id,
  COUNT(*) as count
FROM user_roles
WHERE user_id = '556cf2ae-9046-48b1-98ae-358cbcfcd179'
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 3: Delete all existing roles for this user
DELETE FROM user_roles
WHERE user_id = '556cf2ae-9046-48b1-98ae-358cbcfcd179';

-- Step 4: Insert correct coach role
INSERT INTO user_roles (user_id, role)
VALUES ('556cf2ae-9046-48b1-98ae-358cbcfcd179', 'coach')
ON CONFLICT (user_id) DO UPDATE
SET role = 'coach';

-- Step 5: Verify the fix
SELECT 
  'After fix' as check_type,
  ur.user_id,
  ur.role,
  au.email,
  p.full_name
FROM user_roles ur
JOIN auth.users au ON au.id = ur.user_id
LEFT JOIN profiles p ON p.id = ur.user_id
WHERE au.email = 'demo.coach@test.com';

-- Step 6: Also check and fix profile if needed
UPDATE profiles
SET membership_status = 'active'
WHERE id = '556cf2ae-9046-48b1-98ae-358cbcfcd179'
AND membership_status IS NULL;

-- Step 7: Ensure coach has a club assignment
SELECT 
  'Coach club assignment' as check_type,
  c.user_id,
  c.club_id,
  cl.name as club_name
FROM coaches c
LEFT JOIN clubs cl ON cl.id = c.club_id
WHERE c.user_id = '556cf2ae-9046-48b1-98ae-358cbcfcd179';
