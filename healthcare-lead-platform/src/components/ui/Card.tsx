'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-2xl bg-white dark:bg-secondary-900 transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'shadow-soft border border-secondary-200 dark:border-secondary-700',
        elevated: 'shadow-medium border border-secondary-200 dark:border-secondary-700',
        outlined: 'border-2 border-secondary-300 dark:border-secondary-600',
        filled: 'bg-secondary-50 dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700',
        gradient: 'bg-gradient-to-br from-white to-secondary-50 dark:from-secondary-900 dark:to-secondary-800 shadow-soft border border-secondary-200 dark:border-secondary-700',
        interactive: 'shadow-soft border border-secondary-200 dark:border-secondary-700 hover:shadow-medium hover:scale-[1.02] cursor-pointer',
        glass: 'backdrop-blur-md bg-white/80 dark:bg-secondary-900/80 border border-white/20 dark:border-secondary-700/50 shadow-lg',
      },
      padding: {
        none: 'p-0',
        xs: 'p-3',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
)

const cardHeaderVariants = cva(
  'flex flex-col space-y-1.5',
  {
    variants: {
      padding: {
        none: 'p-0',
        xs: 'p-3 pb-2',
        sm: 'p-4 pb-3',
        md: 'p-6 pb-4',
        lg: 'p-8 pb-6',
        xl: 'p-10 pb-8',
      },
    },
    defaultVariants: {
      padding: 'md',
    },
  }
)

const cardContentVariants = cva(
  '',
  {
    variants: {
      padding: {
        none: 'p-0',
        xs: 'p-3 pt-0',
        sm: 'p-4 pt-0',
        md: 'p-6 pt-0',
        lg: 'p-8 pt-0',
        xl: 'p-10 pt-0',
      },
    },
    defaultVariants: {
      padding: 'md',
    },
  }
)

const cardFooterVariants = cva(
  'flex items-center',
  {
    variants: {
      padding: {
        none: 'p-0',
        xs: 'p-3 pt-2',
        sm: 'p-4 pt-3',
        md: 'p-6 pt-4',
        lg: 'p-8 pt-6',
        xl: 'p-10 pt-8',
      },
    },
    defaultVariants: {
      padding: 'md',
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
}

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardHeaderVariants> {
  children: React.ReactNode
}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardContentVariants> {
  children: React.ReactNode
}

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardFooterVariants> {
  children: React.ReactNode
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    >
      {children}
    </div>
  )
)

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, padding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardHeaderVariants({ padding, className }))}
      {...props}
    >
      {children}
    </div>
  )
)

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight text-secondary-900 dark:text-secondary-100', className)}
      {...props}
    >
      {children}
    </h3>
  )
)

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-sm text-secondary-600 dark:text-secondary-400', className)}
      {...props}
    >
      {children}
    </p>
  )
)

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, padding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardContentVariants({ padding, className }))}
      {...props}
    >
      {children}
    </div>
  )
)

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, padding, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardFooterVariants({ padding, className }))}
      {...props}
    >
      {children}
    </div>
  )
)

Card.displayName = 'Card'
CardHeader.displayName = 'CardHeader'
CardTitle.displayName = 'CardTitle'
CardDescription.displayName = 'CardDescription'
CardContent.displayName = 'CardContent'
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } 