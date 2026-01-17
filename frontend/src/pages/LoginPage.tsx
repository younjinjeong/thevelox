import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { Button, Input } from '@/components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const from = (location.state as { from?: string })?.from || '/';

  const validateForm = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authService.login({ email, password });
      login(response.user, response.accessToken, response.refreshToken);
      toast.success('Welcome back!');
      navigate(from, { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to sign in';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    window.location.href = authService.getGoogleAuthUrl();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome to Velox
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Sign in to your account to continue
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                leftIcon={<Lock className="h-4 w-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                }
                autoComplete="current-password"
              />
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Sign in
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            <span className="text-sm text-slate-500">or continue with</span>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          {/* Google login */}
          <Button
            variant="secondary"
            className="w-full"
            onClick={handleGoogleLogin}
            leftIcon={
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            }
          >
            Continue with Google
          </Button>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
