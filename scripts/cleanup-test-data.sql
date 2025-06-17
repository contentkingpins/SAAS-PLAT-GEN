-- ========================================
-- TEST DATA CLEANUP SCRIPT
-- ========================================
-- This script safely removes all test data from the database
-- without affecting the application structure or functionality.
-- 
-- IMPORTANT: This script should be run by your DevOps team
-- against the production database when ready to clean test data.
-- ========================================

-- Start transaction for safety
BEGIN;

-- Show current data counts before cleanup
SELECT 'BEFORE CLEANUP - Current Database State:' as status;

SELECT 
  'Leads' as table_name, 
  COUNT(*) as record_count 
FROM "Lead"
UNION ALL
SELECT 
  'FileUploads' as table_name, 
  COUNT(*) as record_count 
FROM "FileUpload"
UNION ALL
SELECT 
  'ContactAttempts' as table_name, 
  COUNT(*) as record_count 
FROM "ContactAttempt"
UNION ALL
SELECT 
  'Callbacks' as table_name, 
  COUNT(*) as record_count 
FROM "Callback"
UNION ALL
SELECT 
  'ComplianceChecklists' as table_name, 
  COUNT(*) as record_count 
FROM "ComplianceChecklist"
UNION ALL
SELECT 
  'LeadAlerts' as table_name, 
  COUNT(*) as record_count 
FROM "LeadAlert"
UNION ALL
SELECT 
  'DailyMetrics' as table_name, 
  COUNT(*) as record_count 
FROM "DailyMetrics"
UNION ALL
SELECT 
  'Vendors' as table_name, 
  COUNT(*) as record_count 
FROM "Vendor"
UNION ALL
SELECT 
  'Users' as table_name, 
  COUNT(*) as record_count 
FROM "User"
UNION ALL
SELECT 
  'Teams' as table_name, 
  COUNT(*) as record_count 
FROM "Team";

-- ========================================
-- STEP 1: Delete related data first (respecting foreign key constraints)
-- ========================================

-- Delete lead alerts (child records first)
DELETE FROM "LeadAlert";

-- Delete compliance checklists
DELETE FROM "ComplianceChecklist";

-- Delete contact attempts
DELETE FROM "ContactAttempt";

-- Delete callbacks
DELETE FROM "Callback";

-- Delete file uploads
DELETE FROM "FileUpload";

-- Delete daily metrics
DELETE FROM "DailyMetrics";

-- ========================================
-- STEP 2: Delete all leads
-- ========================================

DELETE FROM "Lead";

-- ========================================
-- STEP 3: Clean up test vendors
-- ========================================

-- Delete test vendors (common test patterns)
DELETE FROM "Vendor" 
WHERE 
  UPPER("code") LIKE '%TEST%' 
  OR UPPER("code") LIKE '%DEMO%' 
  OR UPPER("code") LIKE '%SAMPLE%' 
  OR UPPER("code") LIKE '%BASELINE%' 
  OR UPPER("code") LIKE '%EXAMPLE%'
  OR UPPER("name") LIKE '%TEST%' 
  OR UPPER("name") LIKE '%DEMO%' 
  OR UPPER("name") LIKE '%SAMPLE%' 
  OR UPPER("name") LIKE '%BASELINE%' 
  OR UPPER("name") LIKE '%EXAMPLE%';

-- ========================================
-- STEP 4: Clean up test users (preserve admin users)
-- ========================================

-- Delete test users but preserve important admin accounts
DELETE FROM "User" 
WHERE 
  "role" != 'ADMIN'
  AND (
    "email" LIKE '%test%' 
    OR "email" LIKE '%demo%' 
    OR "email" LIKE '%sample%' 
    OR "email" LIKE '%example%'
    OR "firstName" LIKE '%Test%' 
    OR "lastName" LIKE '%Test%'
  )
  AND "email" NOT LIKE '%@healthcare.com';

-- ========================================
-- STEP 5: Clean up test teams
-- ========================================

-- Delete test teams
DELETE FROM "Team" 
WHERE 
  "name" LIKE '%Test%' 
  OR "name" LIKE '%Demo%' 
  OR "name" LIKE '%Sample%'
  OR "name" LIKE '%Example%';

-- ========================================
-- STEP 6: Reset auto-increment sequences (if any)
-- ========================================

-- Note: PostgreSQL uses sequences for auto-increment, but our schema uses CUID
-- so no sequence resets are needed.

-- Show final data counts after cleanup
SELECT 'AFTER CLEANUP - Final Database State:' as status;

SELECT 
  'Leads' as table_name, 
  COUNT(*) as record_count 
FROM "Lead"
UNION ALL
SELECT 
  'FileUploads' as table_name, 
  COUNT(*) as record_count 
FROM "FileUpload"
UNION ALL
SELECT 
  'ContactAttempts' as table_name, 
  COUNT(*) as record_count 
FROM "ContactAttempt"
UNION ALL
SELECT 
  'Callbacks' as table_name, 
  COUNT(*) as record_count 
FROM "Callback"
UNION ALL
SELECT 
  'ComplianceChecklists' as table_name, 
  COUNT(*) as record_count 
FROM "ComplianceChecklist"
UNION ALL
SELECT 
  'LeadAlerts' as table_name, 
  COUNT(*) as record_count 
FROM "LeadAlert"
UNION ALL
SELECT 
  'DailyMetrics' as table_name, 
  COUNT(*) as record_count 
FROM "DailyMetrics"
UNION ALL
SELECT 
  'Vendors' as table_name, 
  COUNT(*) as record_count 
FROM "Vendor"
UNION ALL
SELECT 
  'Users' as table_name, 
  COUNT(*) as record_count 
FROM "User"
UNION ALL
SELECT 
  'Teams' as table_name, 
  COUNT(*) as record_count 
FROM "Team";

-- Commit the transaction
COMMIT;

-- Success message
SELECT 'SUCCESS: Test data cleanup completed!' as status;
SELECT 'Your database is now clean and ready for production use.' as message; 