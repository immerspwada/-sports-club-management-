-- Fix all demo user roles

-- Fix demo.athlete@test.com (missing role)
INSERT INTO user_roles (user_id, role)
SELECT au.id, 'athlete'
FROM auth.users au
WHERE au.email = 'demo.athlete@test.com'
ON CONFLICT (user_id) DO UPDATE
SET role = 'athlete';

-- Verify all demo users
SELECT 
  au.email,
  ur.role,
  p.full_name,
  p.membership_status
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN profiles p ON p.id = au.id
WHERE au.email IN ('demo.admin@test.com', 'demo.coach@test.com', 'demo.athlete@test.com')
ORDER BY 
  CASE 
    WHEN au.email = 'demo.admin@test.com' THEN 1
    WHEN au.email = 'demo.coach@test.com' THEN 2
    WHEN au.email = 'demo.athlete@test.com' THEN 3
  END;
