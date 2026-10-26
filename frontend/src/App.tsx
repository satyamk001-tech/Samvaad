import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { ContactDossier } from './components/ContactDossier';
import { LanguageSettings } from './components/LanguageSettings';
import { FriendsView } from './components/FriendsView';
import { NewChatModal } from './components/NewChatModal';
import { CallModal } from './components/CallModal';
import { IncomingCallPopup } from './components/IncomingCallPopup';
import { CallHistoryModal } from './components/CallHistoryModal';
import { ProfileMenu } from './components/ProfileMenu';
import { SettingsModal, SettingsSection } from './components/SettingsModal';
import { StatusModal } from './components/StatusModal';
import { AvatarStudioModal } from './components/AvatarStudioModal';
import { Call, Conversation } from './types';
import { api } from './services/api';
import { stompService } from './services/stomp';
import { soundService } from './services/soundService';
import {
  MessageSquare,
  Phone,
  Users,
  Folder,
  LogOut,
  Languages,
  Shield,
  Plus,
  Check,
  CircleDashed,
  Search,
  MoreVertical,
  Settings,
  Sparkles,
} from 'lucide-react';

type NavView = 'CHATS' | 'CALLS' | 'CONTACTS' | 'VAULT' | 'LANGUAGE';

const INDIC_LANGUAGES = [
  { code: 'hi', label: 'हिन्दी', sub: 'Hindi' },
  { code: 'en', label: 'English', sub: 'Indian English' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', sub: 'Punjabi' },
  { code: 'bn', label: 'বাংলা', sub: 'Bengali' },
  { code: 'ta', label: 'தமிழ்', sub: 'Tamil' },
  { code: 'te', label: 'తెలుగు', sub: 'Telugu' },
  { code: 'mr', label: 'मराठी', sub: 'Marathi' },
  { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati' },
  { code: 'kn', label: 'ಕನ್ನಡ', sub: 'Kannada' },
  { code: 'ml', label: 'മലയാളം', sub: 'Malayalam' },
];

const MainApp: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout, reloadUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const [isCallMinimized, setIsCallMinimized] = useState(false);
  const [isCallHistoryOpen, setIsCallHistoryOpen] = useState(false);
  const [activeView, setActiveView] = useState<NavView>('CHATS');
  const [showDossier, setShowDossier] = useState(false);

  // Quick Language switcher dropdown
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  // Settings & Profile modal state
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection | null>(null);
  // Status / Stories modal state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  // Avatar Studio modal state
  const [isAvatarStudioOpen, setIsAvatarStudioOpen] = useState(false);
  // Mobile home header 3-dots overflow menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Desktop Resizable Sidebar state
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('samvaad_sidebar_width');
      if (saved) return Math.min(550, Math.max(260, parseInt(saved, 10)));
    } catch {}
    return 360;
  });
  const isResizingRef = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const navWidth = window.innerWidth >= 768 ? 80 : 64;
      const newWidth = Math.min(550, Math.max(260, moveEvent.clientX - navWidth));
      setSidebarWidth(newWidth);
      try {
        localStorage.setItem('samvaad_sidebar_width', newWidth.toString());
      } catch {}
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    if (isLangDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isLangDropdownOpen]);

  const switchLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('samvaad_language', code);
    localStorage.setItem('i18nextLng', code);
    setIsLangDropdownOpen(false);
    api.put('/users/me', { languagePreference: code }).catch(() => {});
  };

  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  // Load conversations and pinned list on mount / auth change
  useEffect(() => {
    async function loadConversations() {
      if (!isAuthenticated) return;
      try {
        const [data, pinned] = await Promise.all([
          api.get<Conversation[]>('/conversations'),
          api.get<string[]>('/users/me/pinned-conversations').catch(() => []),
        ]);
        setConversations(data);
        setPinnedIds(pinned || []);
        if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    }

    loadConversations();
  }, [isAuthenticated]);

  const handleTogglePin = async (conversationId: string) => {
    try {
      const res = await api.post<{ isPinned: boolean }>(`/conversations/${conversationId}/pin`);
      setPinnedIds((prev) => {
        if (res.isPinned) {
          return [...prev, conversationId];
        } else {
          return prev.filter((id) => id !== conversationId);
        }
      });
    } catch (err) {
      console.error('Failed to toggle pin', err);
    }
  };

  // Listen for global private notifications (incoming calls, new messages, call cancellations)
  useEffect(() => {
    const handlePrivateMessage = (e: any) => {
      const event = e.detail;
      if (event?.eventType === 'INCOMING_CALL') {
        setIncomingCall(event.data);
      } else if (event?.eventType === 'CALL_SIGNAL') {
        const signal = event.data;
        if (signal?.type === 'END' || signal?.type === 'REJECT' || signal?.type === 'CANCEL') {
          soundService.stopIncomingRingtone();
          setIncomingCall((prev) => (prev && prev.id === signal.callId ? null : prev));
        }
      } else if (event?.eventType === 'NEW_MESSAGE' || event?.eventType === 'CONVERSATION_UPDATE') {
        api.get<Conversation[]>('/conversations').then((data) => setConversations(data)).catch(console.error);
      }
    };

    window.addEventListener('samvaad:private_message', handlePrivateMessage);
    return () => window.removeEventListener('samvaad:private_message', handlePrivateMessage);
  }, []);

  const handleInitiateCall = async (type: 'AUDIO' | 'VIDEO', targetConversation?: Conversation, targetUserId?: string) => {
    if (!user) return;
    const conv = targetConversation || activeConversation;
    let receiverId = targetUserId;

    if (!receiverId && conv) {
      const recipient = conv.members?.find((m) => m.user?.id !== user.id)?.user;
      if (recipient) receiverId = recipient.id;
    }

    if (!receiverId) {
      console.warn('Cannot initiate call: receiver could not be determined');
      return;
    }

    try {
      const call = await api.post<Call>('/calls/initiate', {
        receiverId,
        conversationId: conv?.id,
        type,
      });
      setActiveCall(call);
      setIsCallMinimized(false);
    } catch (err) {
      console.error('Failed to initiate call', err);
    }
  };

  const handleCallUserDirect = async (targetUserId: string, type: 'AUDIO' | 'VIDEO') => {
    try {
      const call = await api.post<Call>('/calls/initiate', {
        receiverId: targetUserId,
        type,
      });
      setActiveCall(call);
      setIsCallMinimized(false);
      setIsCallHistoryOpen(false);
    } catch (err) {
      console.error('Failed to call user directly', err);
    }
  };

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return;
    soundService.stopIncomingRingtone();
    // Warm up AudioContext from user gesture so incoming audio is never blocked by browser autoplay policy
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioCtx.resume().catch(() => {});
      }
    } catch {}
    setActiveCall(incomingCall);
    setIncomingCall(null);
    setIsCallMinimized(false);
  };

  const handleDeclineIncomingCall = async () => {
    if (!incomingCall) return;
    soundService.stopIncomingRingtone();
    soundService.playCallEndedTone();
    const declinedCall = incomingCall;
    setIncomingCall(null);
    try {
      await api.post(`/calls/${declinedCall.id}/reject`).catch(() => {});
      stompService.send('/app/call.signal', {
        callId: declinedCall.id,
        targetUserId: declinedCall.caller.id,
        type: 'REJECT',
        data: null,
      });
    } catch (e) {
      console.error('Failed to reject incoming call', e);
    }
  };

  const handleConversationCreated = (conv: Conversation) => {
    setConversations((prev) => [conv, ...prev.filter((c) => c.id !== conv.id)]);
    setActiveConversation(conv);
    setActiveView('CHATS');
  };

  if (!isAuthenticated || !user) {
    return <AuthModal />;
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full overflow-hidden bg-[#FAF7F2] font-sans text-[#191C3B] select-none">
      {/* 1. Global Sovereign Top Navigation Header - Desktop & Tablet */}
      <header className="hidden md:flex h-14 bg-white border-b border-[#E8E2D5] px-4 md:px-6 items-center justify-between z-30 flex-shrink-0 shadow-xs">
        {/* Brand & Emblem */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-lg border border-[#C59A58] shadow-xs">
              सं
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base tracking-tight text-[#191C3B]">संवाद</span>
                <span className="text-xs text-[#C59A58] font-light">|</span>
                <span className="font-serif font-semibold text-sm text-[#191C3B]">Samvaad</span>
              </div>
              <p className="text-[10px] text-[#D97706] font-semibold tracking-wide">
                {t('tagline') || 'Har baat, ek saath.'}
              </p>
            </div>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1 ml-3 px-2.5 py-0.5 rounded-full bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309] text-[9px] font-semibold tracking-wider uppercase">
            <Shield className="w-2.5 h-2.5 text-[#D97706]" />
            SOVEREIGN ENCRYPTED
          </span>
        </div>

        {/* Global Action Header Items */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Quick Language Switcher Dropdown */}
          <div className="relative" ref={langDropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="px-3 py-1.5 rounded-xl border bg-[#FAF7F2] text-[#191C3B] border-[#E8E2D5] hover:border-[#C59A58] flex items-center gap-1.5 text-xs font-semibold transition-all shadow-xs"
              title="भाषा बदलें • 10 Indian Languages"
            >
              <Languages className="w-3.5 h-3.5 text-[#C59A58]" />
              <span>अ / A</span>
              <span className="text-[10px] text-[#D97706] font-bold uppercase">
                {i18n.language || 'hi'}
              </span>
            </button>

            {isLangDropdownOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-[#E8E2D5] rounded-2xl shadow-xl z-50 p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1.5 border-b border-[#E8E2D5] mb-1">
                  <span className="text-[10px] font-bold uppercase text-[#9E9AA8]">
                    भाषा चुनें • 10 Scheduled Languages
                  </span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-0.5">
                  {INDIC_LANGUAGES.map((lang) => {
                    const isSelected = (i18n.language || 'hi').startsWith(lang.code);
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => switchLanguage(lang.code)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-left transition-colors ${
                          isSelected
                            ? 'bg-[#191C3B] text-white font-bold'
                            : 'hover:bg-[#FAF7F2] text-[#191C3B]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{lang.label}</div>
                          <div className={`text-[10px] ${isSelected ? 'text-[#C59A58]' : 'text-[#686578]'}`}>
                            {lang.sub}
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#C59A58]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Call History Button */}
          <button
            onClick={() => setIsCallHistoryOpen(true)}
            className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B] flex items-center justify-center transition-all"
            title={`${t('calls') || 'कॉल इतिहास'}`}
          >
            <Phone className="w-4 h-4 text-[#D97706]" />
          </button>

          {/* User Display Pill */}
          <div
            onClick={() => setIsAvatarStudioOpen(true)}
            className="flex items-center gap-2 pl-2 border-l border-[#E8E2D5] cursor-pointer hover:opacity-85 transition-opacity"
            title="अवतार स्टूडियो • Open Avatar Studio"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="w-8 h-8 rounded-xl object-cover border border-[#C59A58]"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-xl bg-[#191C3B] text-white font-serif font-bold text-xs flex items-center justify-center border border-[#C59A58]"
              >
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="hidden lg:block text-left leading-tight">
              <span className="text-xs font-bold text-[#191C3B] block truncate max-w-[100px]">
                {user.displayName || user.username}
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold">{t('online') || 'सक्रिय'}</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-8 h-8 rounded-xl text-[#686578] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all"
            title={`${t('signOut') || 'लॉग आउट'}`}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile WhatsApp-Style Home Header - Visible on Mobile when NOT in an active conversation */}
      {!activeConversation && (
        <header className="flex md:hidden h-14 bg-white border-b border-[#E8E2D5] px-4 items-center justify-between z-30 flex-shrink-0 shadow-xs">
          {/* Brand & Emblem */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-base border border-[#C59A58] shadow-xs">
              सं
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-bold text-base tracking-tight text-[#191C3B]">संवाद</span>
                <span className="text-xs text-[#C59A58] font-light">|</span>
                <span className="font-serif font-semibold text-xs text-[#191C3B]">Samvaad</span>
              </div>
            </div>
          </div>

          {/* Mobile Header Actions: Search, Status, Overflow Menu */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (activeView !== 'CHATS') setActiveView('CHATS');
              }}
              className="w-10 h-10 rounded-xl text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center touch-target"
              title="खोजें • Search"
              aria-label="खोजें"
            >
              <Search className="w-5 h-5 text-[#686578]" />
            </button>

            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className="w-10 h-10 rounded-xl text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center relative touch-target"
              title="स्थिति • Status"
              aria-label="Status & Stories"
            >
              <CircleDashed className="w-5 h-5 text-[#C59A58]" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </button>

            {/* Mobile 3-Dots Overflow Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="w-10 h-10 rounded-xl text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center touch-target"
                title="अधिक विकल्प • More Options"
                aria-label="More options"
              >
                <MoreVertical className="w-5 h-5 text-[#686578]" />
              </button>

              {isMobileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-black/20"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-11 w-56 bg-white border border-[#E8E2D5] rounded-2xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsNewChatOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#191C3B] hover:bg-[#FAF7F2] font-medium"
                    >
                      <Plus className="w-4 h-4 text-[#C59A58]" />
                      <span>{t('newConversation') || 'नया संदेश • New Chat'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsCallHistoryOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#191C3B] hover:bg-[#FAF7F2] font-medium"
                    >
                      <Phone className="w-4 h-4 text-[#D97706]" />
                      <span>{t('calls') || 'कॉल इतिहास • Call History'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setIsAvatarStudioOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#191C3B] hover:bg-[#FAF7F2] font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                      <span>अवतार स्टूडियो • Avatar Studio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveSettingsSection('LANGUAGE');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#191C3B] hover:bg-[#FAF7F2] font-medium"
                    >
                      <Languages className="w-4 h-4 text-[#C59A58]" />
                      <span>भाषा एवं लिपियाँ • Language ({i18n.language || 'hi'})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        setActiveSettingsSection('ACCOUNT');
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-[#191C3B] hover:bg-[#FAF7F2] font-medium"
                    >
                      <Settings className="w-4 h-4 text-[#686578]" />
                      <span>सेटिंग्स • Settings</span>
                    </button>

                    <div className="my-1 border-t border-[#E8E2D5]" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 font-medium"
                    >
                      <LogOut className="w-4 h-4 text-red-600" />
                      <span>{t('signOut') || 'लॉग आउट • Sign Out'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
      )}

      {/* 2. Main Workspace Layout */}
      <div className={`flex flex-1 overflow-hidden ${!activeConversation ? 'pb-16 md:pb-0' : ''}`}>
        {/* Left Vertical Navigation Rail - Hidden on Mobile (<768px), Visible on Tablet & Desktop */}
        <aside className="hidden md:flex w-16 md:w-18 bg-white border-r border-[#E8E2D5] flex-col items-center py-4 justify-between z-20 flex-shrink-0">
          <div className="flex flex-col items-center gap-4 w-full">
            {/* Quick New Chat Button */}
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center hover:bg-[#101226] transition-all shadow-md shadow-[#191C3B]/10 group"
              title={`${t('newConversation') || 'नया संदेश'}`}
            >
              <Plus className="w-5 h-5 text-[#C59A58] group-hover:rotate-90 transition-transform" />
            </button>

            {/* Navigation Items */}
            <nav className="flex flex-col items-center gap-3">
              {/* Chats */}
              <button
                onClick={() => setActiveView('CHATS')}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
                  activeView === 'CHATS'
                    ? 'bg-[#191C3B] text-white shadow-sm'
                    : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
                }`}
                title={`${t('chats') || 'वार्तालाप'}`}
              >
                <MessageSquare className="w-4 h-4" />
                {conversations.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                    {conversations.length}
                  </span>
                )}
              </button>

              {/* Status / Stories (WhatsApp & Telegram style) */}
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] transition-all relative group"
                title="स्थिति एवं अपडेट • Status & Stories"
              >
                <CircleDashed className="w-5 h-5 text-[#C59A58] group-hover:rotate-45 transition-transform" />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>

              {/* Calls History */}
              <button
                onClick={() => setIsCallHistoryOpen(true)}
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] transition-all"
                title={`${t('calls') || 'कॉल इतिहास'}`}
              >
                <Phone className="w-4 h-4 text-[#D97706]" />
              </button>

              {/* Contacts / Friends */}
              <button
                onClick={() => {
                  setActiveView('CONTACTS');
                  setActiveConversation(null);
                }}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  activeView === 'CONTACTS'
                    ? 'bg-[#191C3B] text-white shadow-sm'
                    : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
                }`}
                title="मित्र एवं संपर्क सूची • Friends & Contacts"
              >
                <Users className="w-4 h-4" />
              </button>

              {/* Shared Vault */}
              <button
                onClick={() => setShowDossier(!showDossier)}
                className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  showDossier
                    ? 'bg-[#FDF8EE] text-[#B45309] border border-[#EAD9BE]'
                    : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
                }`}
                title={`${t('vault') || 'साझा कोष'}`}
              >
                <Folder className="w-4 h-4" />
              </button>

              {/* Language Architecture Tab */}
              <button
                onClick={() => setActiveSettingsSection('LANGUAGE')}
                className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] transition-all"
                title={`${t('language') || 'भाषा एवं लिपियाँ'}`}
              >
                <Languages className="w-4 h-4 text-[#C59A58]" />
              </button>
            </nav>
          </div>

          {/* Bottom-left corner: User Profile Icon with Dropdown Menu */}
          <div className="flex flex-col items-center gap-3 w-full">
            <ProfileMenu
              currentUser={user}
              onOpenSection={(section) => setActiveSettingsSection(section)}
              onLogout={logout}
            />

            {/* National Sovereign Flag badge */}
            <div className="w-7 h-7 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center shadow-xs text-xs">
              🇮🇳
            </div>
          </div>
        </aside>

        {/* Middle Master-Detail Panels */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Conversation List / Views */}
          {activeView === 'CHATS' && (
            <div
              className={`h-full flex-shrink-0 flex ${
                activeConversation ? 'hidden md:flex' : 'w-full md:w-auto'
              }`}
              style={{
                width: typeof window !== 'undefined' && window.innerWidth >= 768 ? `${sidebarWidth}px` : undefined,
              }}
            >
              <div className="flex-1 h-full overflow-hidden">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversation={activeConversation}
                  onSelectConversation={setActiveConversation}
                  onOpenNewChat={() => setIsNewChatOpen(true)}
                  currentUser={user}
                  onTogglePin={handleTogglePin}
                  pinnedIds={pinnedIds}
                  onOpenStatus={() => setIsStatusModalOpen(true)}
                />
              </div>

              {/* Draggable vertical divider for desktop sidebar */}
              <div
                onMouseDown={startResizing}
                className="hidden md:flex w-1 hover:w-1.5 bg-[#E8E2D5] hover:bg-[#C59A58] cursor-col-resize transition-all select-none z-20 items-center justify-center group flex-shrink-0"
                title="खींचकर चौड़ाई बदलें • Drag to resize sidebar"
              >
                <div className="w-0.5 h-8 bg-gray-300 group-hover:bg-[#C59A58] rounded-full" />
              </div>
            </div>
          )}

          {activeView === 'LANGUAGE' && (
            <div className="w-80 md:w-96 border-r border-[#E8E2D5] bg-white h-full overflow-y-auto">
              <LanguageSettings />
            </div>
          )}

          {activeView === 'CONTACTS' && (
            <div className="flex-1 h-full overflow-hidden flex flex-col">
              <FriendsView
                currentUser={user}
                conversations={conversations}
                onSelectConversation={(conv) => {
                  setActiveConversation(conv);
                  setActiveView('CHATS');
                }}
                onOpenNewChat={() => setIsNewChatOpen(true)}
                onInitiateCall={handleInitiateCall}
                onConversationCreated={(conv) => {
                  setConversations((prev) => {
                    if (prev.some((c) => c.id === conv.id)) {
                      return prev.map((c) => (c.id === conv.id ? conv : c));
                    }
                    return [conv, ...prev];
                  });
                }}
              />
            </div>
          )}

          {/* Active Chat Conversation View */}
          {activeView === 'CHATS' && (activeConversation ? (
            <div className={`flex-1 h-full overflow-hidden flex flex-col ${!activeConversation ? 'hidden md:flex' : 'flex'}`}>
              <ChatArea
                conversation={activeConversation}
                currentUser={user}
                onInitiateCall={handleInitiateCall}
                onToggleDossier={() => setShowDossier(!showDossier)}
                onBack={() => setActiveConversation(null)}
                onDeleteConversation={(deletedId) => {
                  setActiveConversation(null);
                  setConversations((prev) => prev.filter((c) => c.id !== deletedId));
                }}
              />
            </div>
          ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#FAF7F2] p-8 text-center">
              <div className="w-20 h-20 rounded-3xl bg-[#191C3B] text-[#FAF7F2] flex items-center justify-center font-serif font-black text-4xl mb-4 border border-[#C59A58]/30 shadow-xl">
                सं
              </div>
              <h2 className="text-xl font-bold text-[#191C3B] mb-1">
                {t('appName') || 'संवाद'} {t('tagline') ? `• ${t('tagline')}` : ''}
              </h2>
              <p className="text-xs text-[#686578] max-w-sm">
                Select a conversation or start a new encrypted communication channel.
              </p>
              <button
                onClick={() => setIsNewChatOpen(true)}
                className="mt-5 px-5 py-2.5 rounded-xl bg-[#191C3B] text-white text-xs font-semibold hover:bg-[#101226] transition-all flex items-center gap-2 border border-[#C59A58]/20 shadow-md"
              >
                <Plus className="w-4 h-4 text-[#C59A58]" />
                <span>{t('newConversation') || 'नया संदेश प्रारंभ करें'}</span>
              </button>
            </div>
          ))}

          {/* Right Dossier Panel */}
          {showDossier && activeConversation && (
            <ContactDossier
              conversation={activeConversation}
              currentUser={user}
              onClose={() => setShowDossier(false)}
            />
          )}
        </div>
      </div>

      {/* WhatsApp Floating Action Button (FAB) for New Chat on Mobile */}
      {!activeConversation && activeView === 'CHATS' && (
        <button
          type="button"
          onClick={() => setIsNewChatOpen(true)}
          className="md:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-[#191C3B] text-[#C59A58] shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all border border-[#C59A58]/30 touch-target"
          aria-label="नया संवाद"
          title="नया संदेश • New Chat"
        >
          <Plus className="w-6 h-6 text-[#C59A58]" />
        </button>
      )}

      {/* WhatsApp-Style Mobile Bottom Navigation Bar */}
      {!activeConversation && (
        <nav className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E8E2D5] z-30 safe-pb items-center justify-around shadow-lg">
          {/* Chats */}
          <button
            type="button"
            onClick={() => setActiveView('CHATS')}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative touch-target ${
              activeView === 'CHATS' ? 'text-[#191C3B]' : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            <div className="relative">
              <MessageSquare className={`w-5 h-5 ${activeView === 'CHATS' ? 'text-[#191C3B] stroke-[2.5]' : ''}`} />
              {conversations.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center">
                  {conversations.length}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-1 ${activeView === 'CHATS' ? 'font-bold text-[#191C3B]' : 'font-medium'}`}>
              {t('chats') || 'वार्तालाप'}
            </span>
          </button>

          {/* Status */}
          <button
            type="button"
            onClick={() => setIsStatusModalOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative touch-target text-[#686578] hover:text-[#191C3B]"
          >
            <div className="relative">
              <CircleDashed className="w-5 h-5 text-[#C59A58]" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <span className="text-[10px] mt-1 font-medium">
              स्थिति
            </span>
          </button>

          {/* Calls */}
          <button
            type="button"
            onClick={() => setIsCallHistoryOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative touch-target text-[#686578] hover:text-[#191C3B]"
          >
            <Phone className="w-5 h-5 text-[#D97706]" />
            <span className="text-[10px] mt-1 font-medium">
              {t('calls') || 'कॉल'}
            </span>
          </button>

          {/* Contacts / Friends */}
          <button
            type="button"
            onClick={() => {
              setActiveView('CONTACTS');
              setActiveConversation(null);
            }}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative touch-target ${
              activeView === 'CONTACTS' ? 'text-[#191C3B]' : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            <Users className={`w-5 h-5 ${activeView === 'CONTACTS' ? 'text-[#191C3B] stroke-[2.5]' : ''}`} />
            <span className={`text-[10px] mt-1 ${activeView === 'CONTACTS' ? 'font-bold text-[#191C3B]' : 'font-medium'}`}>
              संपर्क
            </span>
          </button>

          {/* Settings / Profile */}
          <button
            type="button"
            onClick={() => setActiveSettingsSection('ACCOUNT')}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors relative touch-target text-[#686578] hover:text-[#191C3B]"
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                className="w-5 h-5 rounded-full object-cover border border-[#C59A58]"
              />
            ) : (
              <Settings className="w-5 h-5" />
            )}
            <span className="text-[10px] mt-1 font-medium">
              सेटिंग्स
            </span>
          </button>
        </nav>
      )}

      {/* Floating / Fullscreen Call Modal (WhatsApp Picture-in-Picture) */}
      {activeCall && (
        <CallModal
          call={activeCall}
          currentUser={user}
          onEndCall={() => setActiveCall(null)}
          isMinimized={isCallMinimized}
          onToggleMinimize={() => setIsCallMinimized(!isCallMinimized)}
        />
      )}

      {/* Incoming Call Popup */}
      {incomingCall && (
        <IncomingCallPopup
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onDecline={handleDeclineIncomingCall}
        />
      )}

      {/* Call History Modal */}
      {isCallHistoryOpen && (
        <CallHistoryModal
          currentUser={user}
          onClose={() => setIsCallHistoryOpen(false)}
          onCallUser={handleCallUserDirect}
        />
      )}

      {/* Settings / Profile Modal */}
      {activeSettingsSection && (
        <SettingsModal
          section={activeSettingsSection}
          currentUser={user}
          onClose={() => setActiveSettingsSection(null)}
          onUserUpdated={() => reloadUser()}
          onLogout={logout}
        />
      )}

      {/* New Chat Modal */}
      {isNewChatOpen && (
        <NewChatModal
          currentUser={user}
          existingConversations={conversations}
          onClose={() => setIsNewChatOpen(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {/* WhatsApp & Telegram Style Status Stories Modal */}
      {isStatusModalOpen && (
        <StatusModal
          currentUser={user}
          onClose={() => setIsStatusModalOpen(false)}
        />
      )}

      {/* Sovereign Avatar Studio Modal */}
      {isAvatarStudioOpen && (
        <AvatarStudioModal
          currentUser={user}
          onUserUpdated={() => reloadUser()}
          onClose={() => setIsAvatarStudioOpen(false)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </BrowserRouter>
  );
}
