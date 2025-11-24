'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/auth/actions';
import { getDeviceInfo } from '@/lib/utils/device-fingerprint';
import Link from 'next/link';

const TEST_USERS = {
  admin: { email: 'demo.admin@test.com', password: 'demo1234' },
  coach: { email: 'demo.coach@test.com', password: 'demo1234' },
  athlete: { email: 'demo.athlete@test.com', password: 'demo1234' },
};

const STORAGE_KEY = 'sports_club_login';

export function SimpleLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { email: savedEmail, password: savedPassword } = JSON.parse(saved);
        setEmail(savedEmail || '');
        setPassword(savedPassword || '');
        setRememberMe(true);
      }
    } catch (err) {
      // Ignore errors
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Get device information for tracking
      const deviceInfo = getDeviceInfo();
      
      const result = await signIn(email, password, deviceInfo);

      if (!result.success) {
        setError(result.error || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // Save or clear credentials based on rememberMe
      if (rememberMe) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ email, password }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }

      // Redirect to /dashboard - middleware will handle role-based routing
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  };

  const fillCredentials = (type: keyof typeof TEST_USERS) => {
    setEmail(TEST_USERS[type].email);
    setPassword(TEST_USERS[type].password);
    setError('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            เข้าสู่ระบบ
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            ระบบจัดการสโมสรกีฬา
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-base font-medium text-gray-700 mb-2">
              อีเมล
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="ใส่อีเมลของท่านที่นี้"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-base font-medium text-gray-700 mb-2">
              รหัสผ่าน
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3.5 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 p-1 touch-manipulation"
                disabled={loading}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <label htmlFor="remember" className="ml-2 text-base text-gray-700">
              จดจำรหัสผ่าน
            </label>
          </div>

          {/* Error Message with Fade-in Animation */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            error ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-base text-red-700 animate-shake">
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-lg bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                กำลังเข้าสู่ระบบ...
              </span>
            ) : (
              'เข้าสู่ระบบ'
            )}
          </button>
        </form>

        {/* Register Link with Hover Effect */}
        <div className="mt-6 text-center text-base text-gray-600">
          ยังไม่มีบัญชี?{' '}
          <Link 
            href="/register-membership" 
            className="text-blue-600 hover:text-blue-700 active:text-blue-700 font-medium touch-manipulation transition-colors duration-200 hover:underline"
          >
            สมัครสมาชิก
          </Link>
        </div>

        {/* Test Credentials with Slide-down Animation */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => setShowTestCredentials(!showTestCredentials)}
            className="w-full text-sm text-gray-500 active:text-gray-700 font-medium py-2 touch-manipulation transition-colors"
          >
            <span className={`inline-block transition-transform duration-200 ${showTestCredentials ? 'rotate-90' : ''}`}>
              ▶
            </span>{' '}
            ข้อมูลทดสอบ
          </button>
          
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showTestCredentials ? 'max-h-96 opacity-100 mt-3' : 'max-h-0 opacity-0'
          }`}>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => fillCredentials('admin')}
                className="w-full px-3 py-3 text-base bg-gray-50 hover:bg-gray-100 active:bg-gray-100 border border-gray-200 rounded-lg transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
              >
                👨‍💼 Admin
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('coach')}
                className="w-full px-3 py-3 text-base bg-gray-50 hover:bg-gray-100 active:bg-gray-100 border border-gray-200 rounded-lg transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🏃‍♂️ Coach
              </button>
              <button
                type="button"
                onClick={() => fillCredentials('athlete')}
                className="w-full px-3 py-3 text-base bg-gray-50 hover:bg-gray-100 active:bg-gray-100 border border-gray-200 rounded-lg transition-all duration-200 touch-manipulation transform hover:scale-[1.02] active:scale-[0.98]"
              >
                🏅 Athlete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
