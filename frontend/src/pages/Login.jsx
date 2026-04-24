import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPassword, resetPassword } from '../services/api';
import { Mail, Lock, LogIn, UserPlus, ArrowLeft, KeyRound } from 'lucide-react';
import PasswordStrengthMeter from '../components/PasswordStrengthMeter';
import FormField from '../components/FormField';
import { validators, validateForm } from '../utils/validation';

const Login = () => {
  const [mode, setMode] = useState('login'); // login, register, forgot, reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setFieldErrors({});

    if (mode === 'register') {
      const { isValid, errors } = validateForm(
        { email, password, confirmPassword, name },
        {
          name: [validators.required, validators.minLength(2)],
          email: [validators.required, validators.email],
          password: [validators.required, validators.minLength(6), validators.passwordStrength],
          confirmPassword: [validators.required, validators.match(password, 'Password')],
        }
      );
      if (!isValid) {
        setFieldErrors(errors);
        return;
      }
      if (!acceptTerms) {
        setError('You must accept the terms and conditions');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/');
      } else if (mode === 'register') {
        await register(email, password, name);
        navigate('/');
      } else if (mode === 'forgot') {
        const result = await forgotPassword(email);
        if (result.token) {
          setResetToken(result.token);
          setMode('reset');
          setSuccess('Reset token generated! Enter your new password below.');
        } else {
          setSuccess('If the email exists, a reset link has been sent.');
        }
      } else if (mode === 'reset') {
        await resetPassword(resetToken, newPassword);
        setSuccess('Password reset successfully! You can now sign in.');
        setMode('login');
        setPassword('');
        setResetToken('');
        setNewPassword('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = () => {
    setEmail('demo@example.com');
    setPassword('demo123');
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError('');
    setSuccess('');
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            {mode === 'forgot' || mode === 'reset' ? (
              <KeyRound className="w-8 h-8 text-blue-600" />
            ) : (
              <Mail className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI Email Triage</h1>
          <p className="text-gray-500 mt-2">
            {mode === 'login' && 'Sign in to your account'}
            {mode === 'register' && 'Create a new account'}
            {mode === 'forgot' && 'Reset your password'}
            {mode === 'reset' && 'Set your new password'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <FormField label="Name" error={fieldErrors.name} required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </FormField>
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
            <FormField label="Email" error={fieldErrors.email} required>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </FormField>
          )}

          {(mode === 'login' || mode === 'register') && (
            <FormField label="Password" error={fieldErrors.password} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {mode === 'register' && <PasswordStrengthMeter password={password} />}
            </FormField>
          )}

          {mode === 'register' && (
            <FormField label="Confirm Password" error={fieldErrors.confirmPassword} required>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Confirm your password"
                  required
                />
              </div>
            </FormField>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">
                I accept the terms and conditions and privacy policy
              </span>
            </label>
          )}

          {mode === 'reset' && (
            <>
              <FormField label="Reset Token">
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paste your reset token"
                  required
                />
              </FormField>
              <FormField label="New Password" required>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter new password"
                    required
                  />
                </div>
                <PasswordStrengthMeter password={newPassword} />
              </FormField>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-5 h-5" />
                Sign In
              </>
            ) : mode === 'register' ? (
              <>
                <UserPlus className="w-5 h-5" />
                Create Account
              </>
            ) : mode === 'forgot' ? (
              <>
                <Mail className="w-5 h-5" />
                Send Reset Token
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Reset Password
              </>
            )}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <div className="mt-3">
              <button
                onClick={() => switchMode('forgot')}
                className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
              >
                Forgot Password?
              </button>
            </div>
            <div className="mt-2">
              <button
                onClick={fillDemoCredentials}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Use Demo Credentials
              </button>
            </div>
          </>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <div className="mt-4">
            <button
              onClick={() => switchMode('login')}
              className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign In
            </button>
          </div>
        )}

        <div className="mt-6 text-center">
          {mode === 'login' && (
            <button
              onClick={() => switchMode('register')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Don't have an account? Sign up
            </button>
          )}
          {mode === 'register' && (
            <button
              onClick={() => switchMode('login')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
