# Healthcare Lead Platform - Build Instructions

## Prerequisites

Before deploying to AWS Amplify, ensure:

1. **Environment Variables** are set in AWS Amplify Console:
   ```
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   NEXTAUTH_URL=https://yourdomain.com
   NEXTAUTH_SECRET=your-secret-key-here
   NODE_ENV=production
   ```

2. **Database** is accessible from AWS Amplify's build environment

## Known Issues & Solutions

### 1. PostCSS Configuration
- Fixed: PostCSS config now uses correct plugin syntax
- File: `postcss.config.mjs`

### 2. Tailwind CSS Custom Properties
- Fixed: Extended Tailwind config to support CSS variables
- File: `tailwind.config.ts`
- Classes like `border-border`, `bg-background` now work

### 3. Missing Dependencies
- Fixed: Added `@next-auth/prisma-adapter` to package.json
- Always run `npm install` to ensure all dependencies are installed

### 4. TypeScript Type Errors
- Fixed: Added NextAuth type declarations
- File: `src/types/next-auth.d.ts`

### 5. Theme Provider Import
- Fixed: Removed unstable dist import path
- File: `src/components/providers/ThemeProvider.tsx`

## Build Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Generate Prisma Client**
   ```bash
   npx prisma generate
   ```

3. **Build Application**
   ```bash
   npm run build
   ```

## AWS Amplify Configuration

The `amplify.yml` uses monorepo configuration:
```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm install
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: healthcare-lead-platform
```

## Troubleshooting

### Build Fails with Module Not Found
- Check all dependencies are in `package.json`
- Run `npm install` locally and commit `package-lock.json`

### CSS/Tailwind Errors
- Ensure all custom classes are defined in `tailwind.config.ts`
- CSS variables must be mapped to Tailwind colors

### Database Connection Errors
- Verify DATABASE_URL is set in AWS Amplify environment variables
- Ensure database allows connections from AWS Amplify IPs

### Type Errors
- Run `npm run type-check` locally before pushing
- Ensure all TypeScript declarations are committed

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npm run type-check

# Build locally
npm run build
``` 