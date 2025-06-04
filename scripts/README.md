# Baseline Data Import Script

This script imports the baseline CSV data provided by the frontend team into the PostgreSQL database for MBI duplicate checking.

## Prerequisites

1. **Database Setup**: You need to have your AWS RDS PostgreSQL database set up and accessible
2. **Environment Variable**: Set the `DATABASE_URL` environment variable
3. **Prisma Client**: The script uses Prisma to interact with the database

## Setting up DATABASE_URL

Set your PostgreSQL connection string as an environment variable:

### Windows PowerShell:
```powershell
$env:DATABASE_URL="postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/database_name"
```

### Bash/Linux:
```bash
export DATABASE_URL="postgresql://username:password@your-rds-endpoint.amazonaws.com:5432/database_name"
```

### Example format:
```
postgresql://saas_user:your_password@saas-plat-db.cluster-xyz.us-east-1.rds.amazonaws.com:5432/saas_platform
```

## Running the Import

1. **Navigate to scripts directory:**
   ```bash
   cd scripts
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Run the import:**
   ```bash
   npm run import-baseline
   ```
   
   Or directly:
   ```bash
   node import-baseline-data.js
   ```

## What the Script Does

1. **Creates a baseline vendor** (if none exists) with code "BASELINE"
2. **Parses the CSV data** embedded in the script
3. **Generates unique MBI numbers** for each patient record
4. **Converts test types** from "IMMUNO" to "IMMUNE" to match the database schema
5. **Handles various date formats** in the CSV data
6. **Creates Lead records** with status "SUBMITTED" for duplicate checking
7. **Provides detailed error reporting** for any failed imports

## Data Structure

The script imports approximately 150+ patient records with:
- First Name, Last Name
- Date of Birth (various formats handled)
- Gender (not stored in Lead model, used for processing only)
- Full Address (street, city, state, zip)
- Phone Number
- Test Type (IMMUNE/NEURO)
- Generated MBI numbers

## Error Handling

The script will:
- Skip records with invalid dates
- Report duplicate MBI generation failures
- Continue processing on individual record errors
- Provide a summary of successful imports vs errors

## Verification

After running the import, you can verify the data was imported by checking:
1. Total lead count in the database
2. Leads with vendor code "BASELINE"
3. Distribution of test types (IMMUNE vs NEURO)

## Next Steps

Once the baseline data is imported:
1. Test the duplicate detection system with new lead submissions
2. Verify alerts are generated for true duplicates
3. Run the bulk duplicate check API endpoint to identify any existing duplicates within the baseline data itself 