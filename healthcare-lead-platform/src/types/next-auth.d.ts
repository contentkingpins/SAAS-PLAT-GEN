import 'next-auth'
import { Role, UserPermission, UserPreferences } from '@prisma/client'

declare module 'next-auth' {
  interface User {
    id: string
    email: string
    firstName: string
    lastName: string
    name: string
    role?: Role & {
      permissions: Array<{
        permission: {
          id: string
          name: string
          description: string
          resource: string
          action: string
        }
      }>
    }
    permissions?: UserPermission[]
    preferences?: UserPreferences | null
    department?: string | null
    title?: string | null
    phone?: string | null
    avatar?: string | null
  }

  interface Session {
    user: User
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role?: any
    permissions?: any
    preferences?: any
    department?: string
    title?: string
    phone?: string
    avatar?: string
  }
} 