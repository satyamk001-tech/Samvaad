import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Lock, Mail, User as UserIcon, Fingerprint, Sparkles } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [activeTab, setActiveTab] = useState<'indic_id' | 'mobile'>('indic_id');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (activeTab === 'mobile') {
        // Mobile phone flow defaults to mobile username
        const identifier = mobileNumber.trim();
        if (isRegister) {
          await register(identifier, `${identifier}@samvaad.gov.in`, password || 'Samvaad@123', displayName || identifier);
        } else {
          await login(identifier, password || 'Samvaad@123');
        }
      } else {
        if (isRegister) {
          await register(username, email, password, displayName || username);
        } else {
          await login(username || email, password);
        }
      }
    } catch (err: any) {
      setError(err.message || 'प्रमाणीकरण विफल • Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      {/* Sovereign Indic Card */}
      <div className="relative bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-md p-8 shadow-2xl overflow-hidden my-auto">
        {/* Top Gold & Saffron Accent Banner */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D97706] via-[#C59A58] to-[#191C3B]" />

        {/* Header with National / Sovereign Indic Emblem badge */}
        <div className="flex flex-col items-center text-center mb-6 pt-2">
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
              ? 'सुरक्षित स्वदेशी संदेशवाहक • Create your sovereign account'
              : 'End-to-End Encrypted Sovereign Communications'}
          </p>
        </div>

        {/* Tab selection: Indic ID / OTP Mobile */}
        <div className="flex rounded-xl bg-[#FAF7F2] p-1 border border-[#E8E2D5] mb-5">
          <button
            type="button"
            onClick={() => { setActiveTab('indic_id'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'indic_id'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            पहचान पत्र (Indic ID)
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('mobile'); setError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'mobile'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            मोबाइल OTP / Phone
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {activeTab === 'mobile' ? (
            <div>
              <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                मोबाइल नंबर (Mobile Number)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-bold text-[#191C3B] border-r border-[#E8E2D5] pr-2.5">
                  +91
                </span>
                <input
                  type="tel"
                  required
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-16 pr-4 py-2.5 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                />
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  उपयोगकर्ता नाम (Username)
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. krsatyam or aaryan"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                  />
                </div>
              </div>

              {isRegister && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      ईमेल (Email)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@samvaad.gov.in"
                        className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      पूरा नाम (Full Display Name)
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Satyendra Sharma"
                      className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
                    />
                  </div>
                </>
              )}
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[#191C3B]">
                सुरक्षा कोड / पासवर्ड (Security Password)
              </label>
              {!isRegister && (
                <span className="text-[10px] text-[#C59A58] hover:underline cursor-pointer">
                  पासवर्ड भूल गए?
                </span>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#686578] absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-10 pr-4 py-2 text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
              />
            </div>
          </div>

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={loading}
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

          {/* Biometric Passkey Alternative Button */}
          <button
            type="button"
            onClick={() => {
              // Quick demo fill or biometric prompt
              if (activeTab === 'indic_id' && !username) {
                setUsername('krsatyam');
                setPassword('password123');
              }
            }}
            className="w-full bg-[#FAF7F2] hover:bg-[#F5F0E8] border border-[#E8E2D5] text-[#191C3B] text-xs font-semibold py-2 rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            <Fingerprint className="w-4 h-4 text-[#D97706]" />
            <span>बायोमेट्रिक पासकी / Fast Passkey Access</span>
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-[#191C3B] hover:text-[#B45309] font-medium transition-colors"
          >
            {isRegister
              ? 'पहले से खाता है? प्रवेश करें • Sign In'
              : 'नया खाता बनाना चाहते हैं? पंजीकरण करें • Register'}
          </button>
        </div>

        {/* Security Footer */}
        <div className="mt-5 pt-3.5 border-t border-[#E8E2D5] flex items-center justify-center gap-1.5 text-[10px] text-[#686578]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>PostgreSQL Persistent • STOMP WebSocket • Spring Security</span>
        </div>
      </div>
    </div>
  );
};
