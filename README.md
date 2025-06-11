# Healthcare Lead Management Platform

A comprehensive healthcare lead management system with vendor portals, patient lead tracking, and multi-role dashboards.

## Features

- **Vendor Portal**: Submit and track healthcare leads
- **Admin Dashboard**: Manage vendors, leads, and system oversight
- **Advocate Portal**: Review and qualify leads for compliance
- **Collections Portal**: Handle collections and product shipping
- **Lead Search**: Real-time search for existing patient records (authentication fix deployed)

## Authentication & Security

- JWT-based authentication with role-based access control
- Secure API endpoints with proper authorization verification
- Lead search restricted to ADMIN, ADVOCATE, and COLLECTIONS roles

## Tech Stack

- **Frontend**: Next.js 14, React, Material-UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Deployment**: AWS Amplify
- **Authentication**: JWT with bcrypt password hashing

## Quick Start

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to access the application.

## Search Functionality

Agents can now search for existing leads by:
- Patient name (first/last)
- Phone number (any format)
- MBI (Medicare Beneficiary Identifier)
- City or state

This enables call center operators to quickly find existing patient records when answering calls.

---
*Last Updated: June 2025 - Authentication fixes deployed*
// Force deployment - Tue Jun 10 21:59:36 PDT 2025
