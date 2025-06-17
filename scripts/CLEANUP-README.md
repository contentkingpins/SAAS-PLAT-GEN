# 🧹 Test Data Cleanup Guide

This guide provides multiple methods to safely remove all test data from the healthcare lead platform database without affecting the application's functionality.

## 🎯 What Gets Cleaned Up

The cleanup process removes:

- ✅ **All leads** (patient records)
- ✅ **Lead alerts** (MBI duplicates, compliance issues)
- ✅ **Contact attempts** and **callbacks**
- ✅ **Compliance checklists**
- ✅ **File uploads** and processing records
- ✅ **Daily metrics** and analytics data
- ✅ **Test vendors** (TEST, DEMO, SAMPLE, BASELINE patterns)
- ✅ **Test users** (non-admin users with test patterns)
- ✅ **Test teams**

## 🛡️ What Gets Preserved

The cleanup process preserves:

- ✅ **Database schema** and structure
- ✅ **Admin users** (especially @healthcare.com accounts)
- ✅ **Production vendors** (real lab partners)
- ✅ **Application functionality**
- ✅ **All API endpoints** and features

---

## 🔧 Cleanup Methods

### Method 1: SQL Script (Recommended for DevOps)

**File:** `scripts/cleanup-test-data.sql`

**Best for:** Direct database access, production environments

**How to use:**
```bash
# Connect to your PostgreSQL database
psql "postgresql://username:password@host:port/database"

# Run the cleanup script
\i scripts/cleanup-test-data.sql
```

**Advantages:**
- ✅ Works directly against the database
- ✅ No dependency issues
- ✅ Transaction-safe with rollback capability
- ✅ Shows before/after data counts

---

### Method 2: API Endpoint (Recommended for Web Interface)

**Endpoint:** `POST /api/admin/cleanup-test-data`

**Best for:** Admin dashboard integration, web-based cleanup

**How to use:**
```javascript
// From admin dashboard or Postman
fetch('/api/admin/cleanup-test-data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => console.log('Cleanup results:', data));
```

**Advantages:**
- ✅ Web-based interface
- ✅ Authentication protected
- ✅ Returns detailed results
- ✅ Can be integrated into admin dashboard

---

### Method 3: Node.js Script (Local Development)

**File:** `scripts/cleanup-test-data.js`

**Best for:** Local development environments (if Prisma engine works)

**How to use:**
```bash
cd scripts
npm run cleanup-test-data
```

**Note:** This method may encounter Prisma engine compatibility issues on some Windows systems. Use Method 1 or 2 if this fails.

---

## 🚀 Recommended Approach

### For Production Deployment:

1. **Use Method 1 (SQL Script)** - Have your DevOps team run the SQL script directly against the production database
2. **Or use Method 2 (API)** - Integrate a cleanup button in the admin dashboard

### For Testing the Cleanup:

1. Use Method 2 (API) on a staging/test environment first
2. Verify the results before running on production

---

## 📊 Expected Results

After cleanup, your database should show:

```
AFTER CLEANUP - Final Database State:
table_name          | record_count
--------------------|-------------
Leads               | 0
FileUploads         | 0
ContactAttempts     | 0
Callbacks           | 0
ComplianceChecklists| 0
LeadAlerts          | 0
DailyMetrics        | 0
Vendors             | X (production vendors only)
Users               | X (admin users only)
Teams               | X (production teams only)
```

---

## ⚠️ Important Safety Notes

1. **Backup First:** Always backup your database before running cleanup
2. **Test Environment:** Test the cleanup on a staging environment first
3. **Verify Results:** Check the before/after counts to ensure expected cleanup
4. **Production Ready:** Your application will be completely clean and ready for production use

---

## 🆘 Troubleshooting

### SQL Script Issues:
- Ensure proper database connection string
- Check PostgreSQL permissions
- Verify table names match your schema

### API Endpoint Issues:
- Ensure admin authentication token is valid
- Check server logs for detailed error messages
- Verify the endpoint is deployed

### Local Script Issues:
- Try regenerating Prisma client: `npx prisma generate`
- Use alternative methods if Prisma engine fails

---

## ✅ Post-Cleanup Verification

After cleanup, verify the system is ready:

1. **Login Check:** Ensure admin users can still log in
2. **Upload Test:** Try uploading a master CSV file
3. **Dashboard Check:** Verify analytics dashboard loads (should show zeros)
4. **Vendor Check:** Confirm production vendors are intact

---

**🎉 Your database is now clean and ready for production use!** 