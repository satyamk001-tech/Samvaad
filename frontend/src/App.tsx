import React, { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/AuthModal';
import { ConversationSidebar } from './components/ConversationSidebar';
import { ChatArea } from './components/ChatArea';
import { ContactDossier } from './components/ContactDossier';
import { LanguageSettings } from './components/LanguageSettings';
import { NewChatModal } from './components/NewChatModal';
import { CallModal } from './components/CallModal';
import { Call, Conversation } from './types';
import { api } from './services/api';
import {
  MessageSquare,
  Phone,
  Users,
  Folder,
  LogOut,
  Languages,
  Shield,
  Plus
} from 'lucide-react';

type NavView = 'CHATS' | 'CALLS' | 'CONTACTS' | 'VAULT' | 'LANGUAGE';

const MainApp: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeCall, setActiveCall] = useState<Call | null>(null);
  const [activeView, setActiveView] = useState<NavView>('CHATS');
  const [showDossier, setShowDossier] = useState(true);

  // Load conversations on mount / auth change
  useEffect(() => {
    async function loadConversations() {
      if (!isAuthenticated) return;
      try {
        const data = await api.get<Conversation[]>('/conversations');
        setConversations(data);
        if (data.length > 0 && !activeConversation) {
          setActiveConversation(data[0]);
        }
      } catch (err) {
        console.error('Failed to load conversations', err);
      }
    }

    loadConversations();
  }, [isAuthenticated]);

  // Listen for global private notifications (incoming calls, new messages)
  useEffect(() => {
    const handlePrivateMessage = (e: any) => {
      const event = e.detail;
      if (event?.eventType === 'INCOMING_CALL') {
        setActiveCall(event.data);
      } else if (event?.eventType === 'NEW_MESSAGE' || event?.eventType === 'CONVERSATION_UPDATE') {
        api.get<Conversation[]>('/conversations').then((data) => setConversations(data)).catch(console.error);
      }
    };

    window.addEventListener('viora:private_message', handlePrivateMessage);
    return () => window.removeEventListener('viora:private_message', handlePrivateMessage);
  }, []);

  const handleInitiateCall = async (type: 'AUDIO' | 'VIDEO') => {
    if (!activeConversation || !user) return;
    const recipient = activeConversation.members.find((m) => m.user.id !== user.id)?.user;
    if (!recipient) return;

    try {
      const call = await api.post<Call>('/calls/initiate', {
        receiverId: recipient.id,
        conversationId: activeConversation.id,
        type,
      });
      setActiveCall(call);
    } catch (err) {
      console.error('Failed to initiate call', err);
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
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAF7F2] font-sans text-[#191C3B] select-none">
      {/* 1. Global Sovereign Top Navigation Header */}
      <header className="h-14 bg-white border-b border-[#E8E2D5] px-4 md:px-6 flex items-center justify-between z-30 flex-shrink-0 shadow-xs">
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
                Har baat, ek saath.
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
          {/* Quick Language Switcher Pill */}
          <button
            onClick={() => setActiveView(activeView === 'LANGUAGE' ? 'CHATS' : 'LANGUAGE')}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all ${
              activeView === 'LANGUAGE'
                ? 'bg-[#191C3B] text-white border-[#191C3B]'
                : 'bg-[#FAF7F2] text-[#191C3B] border-[#E8E2D5] hover:border-[#C59A58]'
            }`}
            title="भाषा एवं लिपियाँ • Indic Language Architecture"
          >
            <Languages className="w-3.5 h-3.5 text-[#C59A58]" />
            <span>अ / A</span>
            <span className="text-[10px] text-[#D97706] hidden md:inline font-normal">हिन्दी</span>
          </button>

          {/* User Profile Pill */}
          <div className="flex items-center gap-2 pl-2 border-l border-[#E8E2D5]">
            <div
              className="w-8 h-8 rounded-xl bg-[#191C3B] text-white font-serif font-bold text-xs flex items-center justify-center border border-[#C59A58]"
              title={user.displayName || user.username}
            >
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left leading-tight">
              <span className="text-xs font-bold text-[#191C3B] block truncate max-w-[100px]">
                {user.displayName || user.username}
              </span>
              <span className="text-[10px] text-[#10B981] font-semibold">सक्रिय (Online)</span>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className="w-8 h-8 rounded-xl text-[#686578] hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-all"
            title="लॉग आउट • Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Vertical Navigation Rail */}
        <aside className="w-16 md:w-18 bg-white border-r border-[#E8E2D5] flex flex-col items-center py-4 gap-6 z-20 flex-shrink-0">
          {/* Quick New Chat Button */}
          <button
            onClick={() => setIsNewChatOpen(true)}
            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center hover:bg-[#101226] transition-all shadow-md shadow-[#191C3B]/10 group"
            title="नया संदेश • Start New Chat"
          >
            <Plus className="w-5 h-5 text-[#C59A58] group-hover:rotate-90 transition-transform" />
          </button>

          {/* Navigation Items */}
          <nav className="flex-1 flex flex-col items-center gap-3">
            {/* Chats */}
            <button
              onClick={() => setActiveView('CHATS')}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all relative ${
                activeView === 'CHATS'
                  ? 'bg-[#191C3B] text-white shadow-sm'
                  : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
              }`}
              title="वार्तालाप • Chats"
            >
              <MessageSquare className="w-4 h-4" />
              {conversations.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#D97706] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white">
                  {conversations.length}
                </span>
              )}
            </button>

            {/* Calls */}
            <button
              onClick={() => {
                if (activeConversation) {
                  handleInitiateCall('AUDIO');
                } else {
                  setActiveView('CHATS');
                }
              }}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
                activeView === 'CALLS'
                  ? 'bg-[#191C3B] text-white shadow-sm'
                  : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
              }`}
              title="कॉल एवं सम्मेलन • Calls & Conferences"
            >
              <Phone className="w-4 h-4" />
            </button>

            {/* Contacts */}
            <button
              onClick={() => setIsNewChatOpen(true)}
              className="w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] transition-all"
              title="संपर्क सूची • Contacts"
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
              title="साझा कोष • Vault & Dossier"
            >
              <Folder className="w-4 h-4" />
            </button>

            {/* Language Architecture Tab */}
            <button
              onClick={() => setActiveView(activeView === 'LANGUAGE' ? 'CHATS' : 'LANGUAGE')}
              className={`w-10 h-10 md:w-11 md:h-11 rounded-2xl flex flex-col items-center justify-center transition-all ${
                activeView === 'LANGUAGE'
                  ? 'bg-[#191C3B] text-white shadow-sm'
                  : 'text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2]'
              }`}
              title="भाषा एवं क्षेत्रीय प्राथमिकताएं"
            >
              <Languages className="w-4 h-4 text-[#C59A58]" />
            </button>
          </nav>

          {/* Bottom Sovereign Flag / Status Badge */}
          <div className="w-8 h-8 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center shadow-xs text-xs">
            🇮🇳
          </div>
        </aside>

        {/* Dynamic Center Stage */}
        {activeView === 'LANGUAGE' ? (
          <LanguageSettings />
        ) : (
          <>
            {/* Conversations Sidebar (Screen 1 Left) */}
            <ConversationSidebar
              conversations={conversations}
              activeConversation={activeConversation}
              onSelectConversation={(c) => {
                setActiveConversation(c);
                setActiveView('CHATS');
              }}
              currentUser={user}
              onOpenNewChat={() => setIsNewChatOpen(true)}
            />

            {/* Main Chat Area (Screen 1 Center) */}
            {activeConversation ? (
              <ChatArea
                conversation={activeConversation}
                currentUser={user}
                onInitiateCall={handleInitiateCall}
                onToggleDossier={() => setShowDossier(!showDossier)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#FAF7F2]">
                <div className="w-20 h-20 rounded-3xl bg-[#191C3B] text-white shadow-xl shadow-[#191C3B]/10 flex items-center justify-center mb-4 border-2 border-[#C59A58]">
                  <span className="font-serif font-black text-4xl text-[#FAF7F2]">सं</span>
                </div>
                <h2 className="text-2xl font-bold text-[#191C3B] tracking-tight mb-1 flex items-center gap-2">
                  <span>संवाद</span>
                  <span className="text-sm font-light text-[#C59A58]">|</span>
                  <span className="font-serif font-semibold text-xl">Samvaad</span>
                </h2>
                <p className="text-xs font-semibold text-[#D97706] mb-2 tracking-wide">
                  हर बात, ek saath.
                </p>
                <p className="text-xs text-[#686578] max-w-sm">
                  Every connection has a story. अपनी संपर्क सूची अथवा वार्तालाप से चयन करें और संवाद प्रारंभ करें।
                </p>
                <button
                  onClick={() => setIsNewChatOpen(true)}
                  className="mt-5 px-4 py-2 rounded-xl bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-[#191C3B]/10 border border-[#C59A58]/20"
                >
                  <Plus className="w-3.5 h-3.5 text-[#C59A58]" />
                  <span>नया संदेश भेजें • New Chat</span>
                </button>
              </div>
            )}

            {/* Right Contact Dossier & Shared Vault (Screen 1 Right) */}
            {activeConversation && showDossier && (
              <ContactDossier
                conversation={activeConversation}
                currentUser={user}
                onClose={() => setShowDossier(false)}
              />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {isNewChatOpen && (
        <NewChatModal
          currentUser={user}
          onClose={() => setIsNewChatOpen(false)}
          onConversationCreated={handleConversationCreated}
        />
      )}

      {activeCall && (
        <CallModal
          call={activeCall}
          currentUser={user}
          onEndCall={() => setActiveCall(null)}
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
