-- Manually confirm a user's email for testing
-- Replace 'you@example.com' with your actual email

update auth.users
set email_confirmed_at = now(),
    confirmed_at = now()
where email = 'you@example.com';
