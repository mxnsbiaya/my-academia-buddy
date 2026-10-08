-- Clean up any broken synthetic entries
DELETE FROM auth.identities WHERE user_id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');
DELETE FROM auth.users WHERE id IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222');

-- Ensure Student A is confirmed and configured
UPDATE auth.users 
SET 
  email_confirmed_at = NOW(),
  is_anonymous = false,
  is_sso_user = false
WHERE email = 'student1791480454426@gmail.com';

-- Create Student B based on working user's template
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, role, aud, is_anonymous, is_sso_user,
  created_at, updated_at
)
SELECT 
  '22222222-2222-2222-2222-222222222222', instance_id, 'student2_test@gmail.com', encrypted_password, NOW(),
  raw_app_meta_data, '{"email": "student2_test@gmail.com", "full_name": "Jordan Taylor (Student B)", "sub": "22222222-2222-2222-2222-222222222222"}'::jsonb, role, aud, false, false,
  NOW(), NOW()
FROM auth.users
WHERE email = 'student1791480454426@gmail.com'
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(),
  '22222222-2222-2222-2222-222222222222',
  '{"email": "student2_test@gmail.com", "sub": "22222222-2222-2222-2222-222222222222"}'::jsonb,
  'email',
  '22222222-2222-2222-2222-222222222222',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider, provider_id) DO NOTHING;
