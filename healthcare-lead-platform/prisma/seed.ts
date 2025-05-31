import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create Admin Role
  const adminRole = await prisma.userRole.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      description: 'System Administrator with full access',
      level: 100,
      isActive: true,
    },
  })

  // Create Manager Role
  const managerRole = await prisma.userRole.upsert({
    where: { name: 'manager' },
    update: {},
    create: {
      name: 'manager',
      description: 'Team Manager with advanced access',
      level: 50,
      isActive: true,
    },
  })

  // Create Agent Role
  const agentRole = await prisma.userRole.upsert({
    where: { name: 'agent' },
    update: {},
    create: {
      name: 'agent',
      description: 'Lead Specialist with standard access',
      level: 25,
      isActive: true,
    },
  })

  // Create Permissions
  const permissions = [
    { name: 'leads.view', resource: 'leads', action: 'view', description: 'View leads' },
    { name: 'leads.create', resource: 'leads', action: 'create', description: 'Create new leads' },
    { name: 'leads.edit', resource: 'leads', action: 'edit', description: 'Edit leads' },
    { name: 'leads.delete', resource: 'leads', action: 'delete', description: 'Delete leads' },
    { name: 'users.view', resource: 'users', action: 'view', description: 'View users' },
    { name: 'users.create', resource: 'users', action: 'create', description: 'Create new users' },
    { name: 'users.edit', resource: 'users', action: 'edit', description: 'Edit users' },
    { name: 'users.delete', resource: 'users', action: 'delete', description: 'Delete users' },
    { name: 'analytics.view', resource: 'analytics', action: 'view', description: 'View analytics' },
    { name: 'campaigns.view', resource: 'campaigns', action: 'view', description: 'View campaigns' },
    { name: 'campaigns.create', resource: 'campaigns', action: 'create', description: 'Create campaigns' },
    { name: 'campaigns.edit', resource: 'campaigns', action: 'edit', description: 'Edit campaigns' },
    { name: 'settings.view', resource: 'settings', action: 'view', description: 'View system settings' },
    { name: 'settings.edit', resource: 'settings', action: 'edit', description: 'Edit system settings' },
  ]

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    })
  }

  // Get all permissions for admin role
  const allPermissions = await prisma.permission.findMany()

  // Assign all permissions to admin role
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    })
  }

  // Hash password for admin user
  const hashedPassword = await bcrypt.hash('MVAAdmin2025!', 12)

  // Create Admin User - George
  const adminUser = await prisma.user.upsert({
    where: { email: 'george@contentkingpins.com' },
    update: {
      password: hashedPassword,
      lastLogin: new Date(),
    },
    create: {
      email: 'george@contentkingpins.com',
      password: hashedPassword,
      firstName: 'George',
      lastName: 'Admin',
      phone: '+1-555-0001',
      department: 'Administration',
      title: 'System Administrator',
      roleId: adminRole.id,
      isActive: true,
    },
  })

  // Create User Preferences for Admin
  await prisma.userPreferences.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      theme: 'light',
      language: 'en',
      timezone: 'America/New_York',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      leadAssignments: true,
      systemAlerts: true,
      weeklyReports: true,
      dashboardLayout: 'comfortable',
      dashboardRefreshInterval: 30,
    },
  })

  // Create Sample Manager User
  const managerPassword = await bcrypt.hash('Manager123!', 12)
  const managerUser = await prisma.user.upsert({
    where: { email: 'sarah.johnson@healthcareleads.com' },
    update: {},
    create: {
      email: 'sarah.johnson@healthcareleads.com',
      password: managerPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      phone: '+1-555-0002',
      department: 'Lead Management',
      title: 'Senior Lead Specialist',
      roleId: managerRole.id,
      isActive: true,
    },
  })

  // Create Sample Agent User
  const agentPassword = await bcrypt.hash('Agent123!', 12)
  const agentUser = await prisma.user.upsert({
    where: { email: 'mike.wilson@healthcareleads.com' },
    update: {},
    create: {
      email: 'mike.wilson@healthcareleads.com',
      password: agentPassword,
      firstName: 'Mike',
      lastName: 'Wilson',
      phone: '+1-555-0003',
      department: 'Lead Management',
      title: 'Lead Specialist',
      roleId: agentRole.id,
      isActive: true,
    },
  })

  // Create Sample Leads
  const sampleLeads = [
    {
      firstName: 'Maria',
      lastName: 'Rodriguez',
      email: 'maria.rodriguez@email.com',
      phone: '+1-555-1001',
      street: '123 Main St',
      city: 'Miami',
      state: 'FL',
      zipCode: '33101',
      medicalConditions: ['Diabetes', 'Hypertension'],
      medications: ['Metformin', 'Lisinopril'],
      allergies: ['Penicillin'],
      urgencyLevel: 'high',
      source: 'website',
      status: 'new',
      priority: 'high',
      score: 85,
      assignedToId: managerUser.id,
    },
    {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@email.com',
      phone: '+1-555-1002',
      street: '456 Oak Ave',
      city: 'Tampa',
      state: 'FL',
      zipCode: '33602',
      medicalConditions: ['Heart Disease'],
      medications: ['Aspirin', 'Statin'],
      allergies: [],
      urgencyLevel: 'medium',
      source: 'referral',
      status: 'contacted',
      priority: 'medium',
      score: 72,
      assignedToId: agentUser.id,
    },
    {
      firstName: 'Emily',
      lastName: 'Davis',
      email: 'emily.davis@email.com',
      phone: '+1-555-1003',
      street: '789 Pine Rd',
      city: 'Orlando',
      state: 'FL',
      zipCode: '32801',
      medicalConditions: ['Arthritis'],
      medications: ['Ibuprofen'],
      allergies: ['Sulfa'],
      urgencyLevel: 'low',
      source: 'social_media',
      status: 'qualified',
      priority: 'medium',
      score: 68,
      assignedToId: agentUser.id,
    },
  ]

  for (const leadData of sampleLeads) {
    await prisma.lead.create({
      data: leadData,
    })
  }

  // Create System Configuration
  const configs = [
    {
      key: 'company_info',
      value: {
        name: 'HealthCare Lead Management',
        address: {
          street: '100 Healthcare Blvd',
          city: 'Miami',
          state: 'FL',
          zipCode: '33101',
          country: 'US',
        },
        phone: '+1-800-HEALTHCARE',
        email: 'info@healthcareleads.com',
        website: 'https://healthcareleads.com',
        timezone: 'America/New_York',
      },
      description: 'Company information and settings',
    },
    {
      key: 'security_settings',
      value: {
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
          expirationDays: 90,
          historyCount: 5,
        },
        sessionTimeout: 480, // 8 hours in minutes
        mfaRequired: false,
        ipWhitelist: [],
        auditLogRetention: 365,
        encryptionLevel: 'AES-256',
      },
      description: 'Security policies and settings',
    },
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log('👤 Admin user created: george@contentkingpins.com / MVAAdmin2025!')
  console.log('👤 Manager user created: sarah.johnson@healthcareleads.com / Manager123!')
  console.log('👤 Agent user created: mike.wilson@healthcareleads.com / Agent123!')
  console.log('📊 Sample leads and data created')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  }) 