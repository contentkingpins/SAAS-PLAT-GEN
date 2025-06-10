'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Link,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useStore from '@/store/useStore';
import { UserRole } from '@/types';
import { apiClient, TEST_CREDENTIALS } from '@/lib/api/client';

// Validation schema
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the new API client for login
      const result = await apiClient.login(data.email, data.password);

      if (result.success && result.user && result.token) {
        // Update store with user data
        const user = {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.role.toLowerCase() as UserRole,
          createdAt: new Date(), // Backend doesn't send timestamps in auth response
          updatedAt: new Date(), // Backend doesn't send timestamps in auth response
          isActive: result.user.isActive,
          vendorId: result.user.vendorId || undefined,
          teamId: result.user.teamId || undefined,
        };

        login(user, result.token);

        // Redirect based on role
        switch (user.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'vendor':
            router.push('/vendor/dashboard');
            break;
          case 'advocate':
            router.push('/advocate/dashboard');
            break;
          case 'collections':
            router.push('/collections/dashboard');
            break;
          default:
            router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={6} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Typography component="h1" variant="h4" fontWeight="bold">
              Welcome Back
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Healthcare Lead Management Platform
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              autoComplete="email"
              autoFocus
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2, py: 1.5 }}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Sign In'
              )}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link href="/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Box>
          </Box>

          {/* Development Test Credentials */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                Test Credentials (Development Only):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Object.entries(TEST_CREDENTIALS).map(([role, creds]) => (
                  <Button
                    key={role}
                    size="small"
                    variant="text"
                    onClick={() => {
                      // Auto-fill the form
                      document.getElementById('email')?.setAttribute('value', creds.email);
                      document.getElementById('password')?.setAttribute('value', creds.password);
                    }}
                  >
                    {role}
                  </Button>
                ))}
              </Box>
            </Box>
          )}
        </Paper>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
          © 2024 Healthcare Lead Management. All rights reserved.
        </Typography>
      </Box>
    </Container>
  );
}
