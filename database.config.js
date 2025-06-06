// Database Configuration for Healthcare Lead Platform
// This file contains the database connection settings

const databaseConfig = {
  // PostgreSQL RDS Instance Details
  host: 'healthcare-db.c6ds4c4qok1n.us-east-1.rds.amazonaws.com', // Updated with actual endpoint
  port: 5432,
  database: 'healthcare_db',
  username: 'healthcareapi',
  password: 'HealthcareDB2024!',
  
  // Connection URL for Prisma
  getDatabaseUrl: function() {
    return `postgresql://${this.username}:${this.password}@${this.host}:${this.port}/${this.database}`;
  }
};

// For Prisma (if running from this file)
if (typeof process !== 'undefined' && process.env) {
  process.env.DATABASE_URL = databaseConfig.getDatabaseUrl();
}

module.exports = databaseConfig; 