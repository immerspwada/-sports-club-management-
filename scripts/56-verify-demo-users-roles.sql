-- Verify all demo users have correct roles

SELECT 
  au.email,
  ur.role,
  p.full_name,
  p.membership_status,
  CASE 
    WHEN c.user_id IS NOT NULL THEN 'Yes (Club: ' || cl.name || ')'
    ELSE 'No'
  END as is_coach
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN coaches c ON c.user_id = au.id
LEFT JOIN clubs cl ON cl.id = c.club_id
WHERE au.email IN ('demo.admin@test.com', 'demo.coach@test.com', 'demo.athlete@test.com')
ORDER BY 
  CASE 
    WHEN au.email = 'demo.admin@test.com' THEN 1
    WHEN au.email = 'demo.coach@test.com' THEN 2
    WHEN au.email = 'demo.athlete@test.com' THEN 3
  END;
