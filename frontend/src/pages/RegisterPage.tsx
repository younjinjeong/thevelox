import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/authService';
import { Button, Input } from '@/components/ui';

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordRequirements = [
    { label: 'At least 8 characters', met: formData.password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(formData.password) },
    { label: 'One lowercase letter', met: /[a-z]/.test(formData.password) },
    { label: 'One number', met: /\d/.test(formData.password) },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRequirements.every((req) => req.met)) {
      newErrors.password = 'Password does not meet requirements';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await authService.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      login(response.user, response.accessToken, response.refreshToken);
      toast.success('Account created successfully!');
      navigate('/', { replace: true });
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to create account';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-900">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-600">
            <span className="text-2xl font-bold text-white">V</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Create your account
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Start your journey with Velox
          </p>
        </div>

        {/* Form */}
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              name="name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              leftIcon={<User className="h-4 w-4" />}
              autoComplete="name"
            />

            <Input
              label="Email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              leftIcon={<Mail className="h-4 w-4" />}
              autoComplete="email"
            />

            <div>
              <Input
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleChange}
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
                autoComplete="new-password"
              />

              {/* Password requirements */}
              <div className="mt-3 space-y-1">
                {passwordRequirements.map((req) => (
                  <div
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${
                      req.met ? 'text-green-600 dark:text-green-400' : 'text-slate-400'
                    }`}
                  >
                    <Check
                      className={`h-3 w-3 ${req.met ? 'opacity-100' : 'opacity-30'}`}
                    />
                    {req.label}
                  </div>
                ))}
              </div>
            </div>

            <Input
              label="Confirm password"
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              leftIcon={<Lock className="h-4 w-4" />}
              autoComplete="new-password"
            />

            <Button type="submit" className="w-full" isLoading={isLoading}>
              Create account
            </Button>
          </form>

          {/* Terms */}
          <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="text-primary-600 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-primary-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        {/* Sign in link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
