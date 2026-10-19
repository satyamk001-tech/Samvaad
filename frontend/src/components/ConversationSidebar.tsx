import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation, User } from '../types';
import { Search, Plus, Users, Shield, Pin, Clock } from 'lucide-react';
import { api } from '../services/api';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  onSelectConversation: (conversation: Conversation) => void;
  currentUser: User;
  onOpenNewChat: () => void;
  onTogglePin?: (conversationId: string) => void;
  pinnedIds?: string[];
  onOpenStatus?: () => void;
}

type FilterCategory = 'ALL' | 'UNREAD' | 'GROUPS' | 'WORK' | 'PERSONAL' | 'REQUESTS';

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversation,
  onSelectConversation,
  currentUser,
  onOpenNewChat,
  onTogglePin,
  pinnedIds = [],
  onOpenStatus,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('ALL');
  const [requests, setRequests] = useState<Conversation[]>([]);

  useEffect(() => {
    api.get<Conversation[]>('/conversations/requests').then((reqs) => {
      setRequests(reqs || []);
    }).catch(() => {});
  }, []);

  // Check if a conversation is pinned
  const isConvPinned = (c: Conversation) => pinnedIds.includes(c.id) || c.isPinned;

  const filteredConversations = conversations
    .filter((c) => {
      // 1. Search term match
      let matchesSearch = true;
      if (searchTerm.trim()) {
        if (c.type === 'GROUP') {
          matchesSearch = (c.title || 'Group').toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          const other = c.members.find((m) => m.user.id !== currentUser.id)?.user;
          const name = (other?.displayName || other?.username || 'Chat').toLowerCase();
          matchesSearch = name.includes(searchTerm.toLowerCase());
        }
      }

      if (!matchesSearch) return false;

      // 2. Filter tabs match
      if (selectedFilter === 'GROUPS') {
        return c.type === 'GROUP';
      }
      if (selectedFilter === 'PERSONAL') {
        return c.type === 'DIRECT';
      }
      if (selectedFilter === 'WORK') {
        return c.folderTag === 'WORK';
      }
      if (selectedFilter === 'UNREAD') {
        return c.lastMessage && c.lastMessage.sender.id !== currentUser.id && c.lastMessage.status !== 'READ';
      }
      return true;
    })
    .sort((a, b) => {
      const aPinned = isConvPinned(a);
      const bPinned = isConvPinned(b);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const getConversationTitle = (c: Conversation) => {
    if (c.type === 'GROUP') {
      return c.title || t('groups') || 'Group';
    }
    const other = c.members.find((m) => m.user.id !== currentUser.id)?.user;
    return other?.displayName || other?.username || t('chats') || 'Conversation';
  };

  const getOtherUser = (c: Conversation) => {
    return c.members.find((m) => m.user.id !== currentUser.id)?.user;
  };

  return (
    <aside className="w-full bg-[#FFFFFF] border-r border-[#E8E2D5] flex flex-col h-full z-10 select-none">
      {/* 1. Header with Sovereign Badge and New Chat Button */}
      <div className="p-4 border-b border-[#E8E2D5] bg-[#FFFFFF]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-[#191C3B] tracking-tight">
                {t('chats') || 'वार्तालाप'}
              </h2>
              <span className="text-[11px] font-semibold text-[#686578] uppercase tracking-wider">
                • {t('messages') || 'MESSAGES'}
              </span>
            </div>
            <p className="text-[11px] text-[#686578]">
              {conversations.length} {t('activeConversations') || 'Active'}
            </p>
          </div>

          <button
            onClick={onOpenNewChat}
            className="h-8 px-3 rounded-xl bg-[#191C3B] text-white flex items-center gap-1.5 hover:bg-[#101226] transition-all shadow-sm shadow-[#191C3B]/10 text-xs font-medium"
            title={`${t('newConversation') || 'New Conversation'}`}
          >
            <Plus className="w-3.5 h-3.5 text-[#C59A58]" />
            <span>{t('newConversation') || 'नया संदेश'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative mt-2">
          <Search className="w-4 h-4 text-[#9E9AA8] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('searchPlaceholder') || 'खोजें or Search conversations...'}
            className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
          />
        </div>

        {/* WhatsApp & Telegram Style Stories / Status Bar */}
        {onOpenStatus && (
          <div className="flex items-center gap-2.5 mt-3 overflow-x-auto pb-1 no-scrollbar border-b border-[#E8E2D5] pb-2.5">
            {/* My Status Button */}
            <div
              onClick={onOpenStatus}
              className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
              title="मेरी स्थिति • My Status"
            >
              <div className="relative">
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.displayName || currentUser.username}
                    className="w-11 h-11 rounded-full object-cover border-2 border-emerald-500 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#191C3B] text-white font-serif font-black text-sm flex items-center justify-center border-2 border-emerald-500 group-hover:scale-105 transition-transform">
                    {(currentUser.displayName || currentUser.username).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#191C3B] text-[#C59A58] border border-white flex items-center justify-center font-bold text-[10px]">
                  +
                </span>
              </div>
              <span className="text-[10px] font-semibold text-[#191C3B] max-w-[48px] truncate text-center">
                मेरी स्थिति
              </span>
            </div>

            {/* Contact Story Circles */}
            <div
              onClick={onOpenStatus}
              className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
              title="संवाद टीम • Status"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 group-hover:scale-105 transition-transform">
                <div className="w-10 h-10 rounded-full bg-[#191C3B] text-white flex items-center justify-center font-bold text-xs border border-white">
                  सं
                </div>
              </div>
              <span className="text-[10px] font-semibold text-[#191C3B] max-w-[48px] truncate text-center">
                संवाद HQ
              </span>
            </div>

            <div
              onClick={onOpenStatus}
              className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
              title="Arjun Verma • Status"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 group-hover:scale-105 transition-transform">
                <img
                  src="https://api.dicebear.com/7.x/adventurer/svg?seed=Arjun"
                  alt="Arjun"
                  className="w-10 h-10 rounded-full object-cover bg-white"
                />
              </div>
              <span className="text-[10px] font-semibold text-[#191C3B] max-w-[48px] truncate text-center">
                Arjun
              </span>
            </div>

            <div
              onClick={onOpenStatus}
              className="flex flex-col items-center gap-1 cursor-pointer group flex-shrink-0"
              title="Priya Sharma • Status"
            >
              <div className="p-0.5 rounded-full bg-gradient-to-tr from-pink-500 to-rose-500 group-hover:scale-105 transition-transform">
                <img
                  src="https://api.dicebear.com/7.x/lorelei/svg?seed=Priya"
                  alt="Priya"
                  className="w-10 h-10 rounded-full object-cover bg-white"
                />
              </div>
              <span className="text-[10px] font-semibold text-[#191C3B] max-w-[48px] truncate text-center">
                Priya
              </span>
            </div>
          </div>
        )}

        {/* Filter Pills: All, Requests, Personal, Work, Groups, Unread */}
        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-0.5 no-scrollbar">
          {[
            { id: 'ALL', label: t('all') || 'सभी' },
            { id: 'REQUESTS', label: `अनुरोध • Requests ${requests.length > 0 ? `(${requests.length})` : ''}` },
            { id: 'PERSONAL', label: 'व्यक्तिगत • Personal' },
            { id: 'WORK', label: t('work') || 'कार्य • Work' },
            { id: 'GROUPS', label: t('groups') || 'समूह • Groups' },
            { id: 'UNREAD', label: t('unread') || 'अपठित • Unread' },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedFilter(pill.id as FilterCategory)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all border ${
                selectedFilter === pill.id
                  ? 'bg-[#191C3B] text-white border-[#191C3B]'
                  : 'bg-[#FAF7F2] text-[#686578] border-[#E8E2D5] hover:border-[#C59A58] hover:text-[#191C3B]'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#E8E2D5]/40">
        {(selectedFilter === 'REQUESTS' ? requests : filteredConversations).length === 0 ? (
          <div className="p-8 text-center text-[#686578] text-xs">
            <p className="font-medium">{selectedFilter === 'REQUESTS' ? 'कोई नया संदेश अनुरोध नहीं है' : 'कोई वार्तालाप नहीं मिला'}</p>
            <p className="text-[11px] text-[#9E9AA8] mt-1">{selectedFilter === 'REQUESTS' ? 'No pending message requests' : 'No conversations matching search or category'}</p>
          </div>
        ) : (
          (selectedFilter === 'REQUESTS' ? requests : filteredConversations).map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const title = getConversationTitle(conv);
            const otherUser = getOtherUser(conv);
            const isOnline = otherUser?.isOnline;
            const pinned = isConvPinned(conv);

            return (
              <div
                key={conv.id}
                className={`w-full p-3 flex items-start gap-3 text-left transition-all hover:bg-[#FAF7F2] cursor-pointer group relative ${
                  isActive
                    ? 'bg-[#FDF8EE] border-l-4 border-[#C59A58]'
                    : 'bg-white'
                }`}
                onClick={() => onSelectConversation(conv)}
              >
                {/* Indic Avatar */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-2xl bg-[#F5F0E8] border border-[#E8E2D5] flex items-center justify-center text-[#191C3B] font-bold text-sm shadow-xs">
                    {conv.type === 'GROUP' ? (
                      <Users className="w-5 h-5 text-[#B45309]" />
                    ) : (
                      <span className="font-serif">
                        {title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {conv.type === 'DIRECT' && (
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                        isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      {pinned && (
                        <Pin className="w-3 h-3 text-[#D97706] fill-[#D97706] flex-shrink-0" />
                      )}
                      <h3 className="text-xs font-bold text-[#191C3B] truncate tracking-tight">
                        {title}
                      </h3>
                    </div>
                    <span className="text-[10px] text-[#9E9AA8] flex-shrink-0">
                      {new Date(conv.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <p className="text-xs text-[#686578] truncate">
                    {conv.lastMessage?.content ||
                      (conv.type === 'GROUP' ? 'नया समूह निर्मित हुआ' : 'बातचीत शुरू करें...')}
                  </p>

                  <div className="mt-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[#B45309] bg-[#FDF8EE] px-1.5 py-0.5 rounded border border-[#EAD9BE]">
                        <Shield className="w-2.5 h-2.5" />
                        E2EE
                      </span>
                      {conv.disappearingSeconds && conv.disappearingSeconds > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200" title="संदेश स्वतः मिट जाएंगे">
                          <Clock className="w-2.5 h-2.5" />
                          {conv.disappearingSeconds >= 86400 ? `${Math.round(conv.disappearingSeconds / 86400)}d` : `${conv.disappearingSeconds}s`}
                        </span>
                      )}
                      {conv.type === 'GROUP' && (
                        <span className="text-[9px] text-[#9E9AA8]">
                          {conv.members.length} सदस्य
                        </span>
                      )}
                    </div>

                    {/* Pin/Unpin Action Button */}
                    {onTogglePin && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(conv.id);
                        }}
                        className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100 ${
                          pinned ? 'text-[#D97706] opacity-100' : 'text-gray-400'
                        }`}
                        title={pinned ? 'Unpin chat' : 'Pin chat (max 5)'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
