import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  signInWithGoogleFirebase,
  sendFirebasePasswordReset
} from '../services/firebase';
import {
  ShieldCheck,
  ArrowRight,
  Lock,
  Mail,
  User as UserIcon,
  Sparkles,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw,
  KeyRound,
  X,
  Phone
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, loginWithGoogle, loginWithPhone, register } = useAuth();
  const [authMode, setAuthMode] = useState<'username' | 'phone'>('username');
  const [isRegister, setIsRegister] = useState(false);

  // Common identity states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Unified OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [otpAttemptsLeft, setOtpAttemptsLeft] = useState(5);
  const [isVerified, setIsVerified] = useState(false);

  // Forgot password modal
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Resend OTP countdown timer
  useEffect(() => {
    let interval: any;
    if (otpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, resendTimer]);

  const getTargetIdentifier = () => {
    if (authMode === 'phone') {
      const raw = phoneNumber.replace(/[\s-]/g, '');
      return raw.startsWith('+') ? raw : `+91${raw}`;
    }
    return email.trim().toLowerCase();
  };

  const handleSendOtp = async () => {
    const target = getTargetIdentifier();
    if (!target) {
      setError(
        authMode === 'phone'
          ? 'कृपया एक मान्य मोबाइल नंबर दर्ज करें • Please enter mobile number'
          : 'कृपया एक मान्य ईमेल दर्ज करें • Please enter email address'
      );
      return;
    }

    if (authMode === 'phone') {
      const digits = phoneNumber.replace(/\D/g, '');
      if (digits.length < 10) {
        setError('कृपया 10-अंकीय मोबाइल नंबर दर्ज करें • Please enter a valid 10-digit mobile number');
        return;
      }
    } else {
      if (!email.includes('@')) {
        setError('कृपया एक मान्य ईमेल दर्ज करें • Please enter a valid email address');
        return;
      }
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ previewCode?: string; message: string }>('/auth/otp/send', { email: target });
      setOtpSent(true);
      setResendTimer(60);
      setOtpAttemptsLeft(5);
      
      const hint = res.previewCode ? ` (कोड: ${res.previewCode})` : '';
      setSuccessMsg(
        authMode === 'phone'
          ? `6-अंकीय OTP मोबाइल नंबर ${target} पर भेजा गया${hint}`
          : `6-अंकीय OTP ईमेल ${target} पर भेजा गया${hint}`
      );

      // Auto-fill preview code for immediate zero-friction entry
      if (res.previewCode) {
        setOtpCode(res.previewCode);
      }
    } catch (err: any) {
      setError(err.message || 'OTP भेजने में विफल • Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const target = getTargetIdentifier();
    if (!otpCode || otpCode.length !== 6) {
      setError('कृपया 6 अंकों का OTP दर्ज करें • Please enter a 6-digit OTP');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/otp/verify', { email: target, otpCode });
      setIsVerified(true);
      setSuccessMsg('सत्यापन सफल हुआ! • Verification successful!');

      // If logging in via Phone, log in immediately
      if (authMode === 'phone') {
        await loginWithPhone(target, displayName || undefined);
      }
    } catch (err: any) {
      setOtpAttemptsLeft((prev) => Math.max(0, prev - 1));
      setError(err.message || 'अमान्य OTP कोड • Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // 1. Mobile Phone Mode
    if (authMode === 'phone') {
      if (!otpSent) {
        await handleSendOtp();
      } else {
        await handleVerifyOtp();
      }
      return;
    }

    // 2. Registration with Email Verification
    if (isRegister && !isVerified) {
      if (!otpSent) {
        await handleSendOtp();
      } else {
        await handleVerifyOtp();
      }
      return;
    }

    // 3. Username / Email Login or Registration
    setLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), email.trim(), password, displayName.trim() || username.trim());
      } else {
        await login(username.trim() || email.trim(), password);
      }
    } catch (err: any) {
      setError(err.message || 'प्रमाणीकरण विफल • Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const googleUser = await signInWithGoogleFirebase();
      await loginWithGoogle(
        googleUser.idToken,
        googleUser.email,
        googleUser.displayName,
        googleUser.photoURL
      );
    } catch (err: any) {
      console.error('Google Sign-In failed', err);
      setError(err.message || 'Google प्रमाणीकरण विफल • Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setError(null);
    try {
      await sendFirebasePasswordReset(forgotEmail);
      setForgotSuccess(true);
    } catch (err: any) {
      setError(err.message || 'पासवर्ड रीसेट लिंक भेजने में त्रुटि हुई • Error sending reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Sovereign Indic Auth Card */}
      <div className="relative bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-md p-8 shadow-2xl overflow-hidden my-auto">
        {/* Top Gold & Saffron Accent Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D97706] via-[#C59A58] to-[#191C3B]" />

        {/* Header with National Sovereign Emblem */}
        <div className="flex flex-col items-center text-center mb-5 pt-2">
          <div className="relative mb-3">
            <div className="w-16 h-16 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center shadow-lg shadow-[#191C3B]/20 border border-[#C59A58]/30">
              <span className="font-serif font-black text-3xl tracking-wider text-[#FAF7F2]">सं</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center shadow-xs">
              <span className="text-[11px] font-bold text-[#D97706]">🇮🇳</span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309] text-[10px] font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-[#D97706]" />
            <span>संप्रभु संलेख • SOVEREIGN PROTOCOL V2.4</span>
          </div>

          <h1 className="text-2xl font-bold text-[#191C3B] tracking-tight flex items-center justify-center gap-2">
            <span>संवाद</span>
            <span className="text-sm font-light text-[#C59A58]">|</span>
            <span className="font-serif font-semibold text-xl">Samvaad</span>
          </h1>
          <p className="text-xs font-semibold text-[#D97706] mt-0.5 tracking-wide">
            हर बात, ek saath.
          </p>
          <p className="text-[11px] text-[#686578] mt-1 max-w-xs">
            {isRegister
              ? 'सुरक्षित स्वदेशी संदेशवाहक • Create your verified account'
              : 'End-to-End Encrypted Sovereign Communications'}
          </p>
        </div>

        {/* Tab Selection: Username / Indic ID vs Mobile OTP */}
        <div className="flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E8E2D5] mb-4">
          <button
            type="button"
            onClick={() => {
              setAuthMode('username');
              setError(null);
              setOtpSent(false);
              setIsVerified(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              authMode === 'username'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            पहचान पत्र (Username / ID)
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('phone');
              setError(null);
              setOtpSent(false);
              setIsVerified(false);
            }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
              authMode === 'phone'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            <Phone className="w-3 h-3 text-[#D97706]" />
            <span>मोबाइल OTP (Phone)</span>
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full mb-4 bg-white hover:bg-neutral-50 border border-[#E8E2D5] text-[#191C3B] text-xs font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2.5 shadow-xs transition-all hover:border-[#C59A58]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>गूगल से प्रवेश करें • Sign in with Google</span>
        </button>

        <div className="relative flex py-1 items-center mb-4">
          <div className="flex-grow border-t border-[#E8E2D5]"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#9E9AA8] tracking-widest">
            अथवा • OR
          </span>
          <div className="flex-grow border-t border-[#E8E2D5]"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {authMode === 'phone' ? (
            /* PHONE AUTHENTICATION VIEW */
            <>
              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  मोबाइल नंबर (Mobile Phone Number)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-[#191C3B] border-r border-[#E8E2D5] pr-2.5">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    disabled={otpSent}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-16 pr-4 py-2.5 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Display Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  पूरा नाम (Full Name - Optional)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Satyendra Sharma"
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                />
              </div>

              {/* 6-Digit Phone OTP Input Step */}
              {otpSent && (
                <div className="p-3 bg-[#FDF8EE] border border-[#EAD9BE] rounded-2xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#B45309]">
                      6-अंकीय OTP दर्ज करें:
                    </span>
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="text-[10px] text-[#C59A58] hover:underline"
                    >
                      नंबर बदलें
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="flex-1 bg-white border border-[#E8E2D5] rounded-xl px-3 py-1.5 text-center font-mono font-bold tracking-widest text-base text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={loading || otpCode.length !== 6}
                      className="px-4 py-1.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all disabled:opacity-40"
                    >
                      सत्यापित करें
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#191C3B] hover:bg-[#101226] text-white font-medium text-sm py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-[#C59A58]/20"
              >
                <span>
                  {loading
                    ? 'सत्यापन जारी...'
                    : !otpSent
                    ? 'OTP भेजें (Send OTP)'
                    : 'सत्यापित करें एवं प्रवेश करें (Sign In)'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#C59A58]" />
              </button>
            </>
          ) : (
            /* USERNAME / EMAIL VIEW */
            <>
              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  उपयोगकर्ता नाम या ईमेल (Username or Email)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="उपयोगकर्ता नाम या ईमेल दर्ज करें (e.g. tarush or user@example.com)"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                  />
                </div>
              </div>

              {/* Registration Extra Fields */}
              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      पूरा नाम (Full Display Name)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Tarush Verma"
                      className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#191C3B]">
                        ईमेल (Email Address)
                      </label>
                      {isVerified && (
                        <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> सत्यापित (Verified)
                        </span>
                      )}
                    </div>
                    <div className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
                        <input
                          type="email"
                          required
                          disabled={isVerified}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@example.com"
                          className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58] disabled:opacity-60"
                        />
                      </div>
                      {!isVerified && (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={loading || (otpSent && resendTimer > 0)}
                          className="px-3 py-2 bg-[#FAF7F2] hover:bg-[#F5F0E8] border border-[#E8E2D5] rounded-xl text-xs font-semibold text-[#191C3B] transition-all whitespace-nowrap disabled:opacity-50"
                        >
                          {otpSent && resendTimer > 0 ? `${resendTimer}s` : 'OTP भेजें'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6-Digit Email OTP Input Step */}
                  {otpSent && !isVerified && (
                    <div className="p-3 bg-[#FDF8EE] border border-[#EAD9BE] rounded-2xl space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#B45309]">
                          ईमेल पर भेजा गया 6-अंकीय OTP:
                        </span>
                        <span className="text-[10px] text-[#686578]">
                          {otpAttemptsLeft} प्रयास शेष
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="123456"
                          className="flex-1 bg-white border border-[#E8E2D5] rounded-xl px-3 py-1.5 text-center font-mono font-bold tracking-widest text-base text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={loading || otpCode.length !== 6}
                          className="px-4 py-1.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all disabled:opacity-40"
                        >
                          सत्यापित करें
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Password with Show/Hide toggle */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#191C3B]">
                    पासवर्ड (Password)
                  </label>
                  {!isRegister && (
                    <button
                      type="button"
                      onClick={() => setIsForgotPasswordOpen(true)}
                      className="text-[10px] text-[#C59A58] hover:underline"
                    >
                      पासवर्ड भूल गए? • Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-10 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-[#686578] hover:text-[#191C3B] transition-colors"
                    title={showPassword ? 'पासवर्ड छुपाएं' : 'पासवर्ड दिखाएं'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-[#C59A58]" />}
                  </button>
                </div>
              </div>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading || (isRegister && !isVerified)}
                className="w-full mt-2 bg-[#191C3B] hover:bg-[#101226] text-white font-medium text-sm py-2.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-[#C59A58]/20"
              >
                <span>
                  {loading
                    ? 'प्रमाणीकरण जारी...'
                    : isRegister
                    ? 'खाता बनाएं (Create Account)'
                    : 'प्रवेश करें (Sign In)'}
                </span>
                <ArrowRight className="w-4 h-4 text-[#C59A58]" />
              </button>
            </>
          )}
        </form>

        {/* Toggle Login / Register */}
        {authMode === 'username' && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setSuccessMsg(null);
                setIsVerified(false);
                setOtpSent(false);
              }}
              className="text-xs text-[#191C3B] hover:text-[#B45309] font-medium transition-colors"
            >
              {isRegister
                ? 'पहले से खाता है? प्रवेश करें • Sign In'
                : 'नया खाता बनाना चाहते हैं? पंजीकरण करें • Register'}
            </button>
          </div>
        )}

        {/* Security Footer */}
        <div className="mt-5 pt-3.5 border-t border-[#E8E2D5] flex items-center justify-center gap-1.5 text-[10px] text-[#686578]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>PostgreSQL Persistent • STOMP WebSocket • Spring Security</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-60 animate-in fade-in">
          <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsForgotPasswordOpen(false);
                setForgotSuccess(false);
              }}
              className="absolute top-4 right-4 text-[#686578] hover:text-[#191C3B]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-[#FDF8EE] border border-[#EAD9BE] text-[#D97706] flex items-center justify-center mb-3">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-[#191C3B]">पासवर्ड पुनर्प्राप्ति</h3>
            <p className="text-xs text-[#686578] mt-1 mb-4">
              Forgot your password? Enter your email address to receive a secure recovery link.
            </p>

            {forgotSuccess ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-medium space-y-2">
                <p>✓ पासवर्ड रीसेट लिंक आपके ईमेल पर भेज दिया गया है। कृपया अपना इनबॉक्स जांचें।</p>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="w-full mt-2 py-2 bg-emerald-600 text-white rounded-xl font-bold"
                >
                  ठीक है (Close)
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                />
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all flex items-center justify-center gap-2"
                >
                  {forgotLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>रीसेट लिंक भेजें • Send Reset Link</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
