-- Update adriankwaramba@gmail.com to MASTER_ADMIN
UPDATE user 
SET approval_level = 'MASTER_ADMIN' 
WHERE email = 'adriankwaramba@gmail.com' 
AND approval_level = 'SUPER_ADMIN';

-- Verify the update
SELECT id, email, name, surname, approval_level, status 
FROM user 
WHERE email = 'adriankwaramba@gmail.com';
