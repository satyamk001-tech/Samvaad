import React, { useEffect, useState } from 'react';
import { Conversation, User } from '../types';
import { api } from '../services/api';
import { Search, UserPlus, X } from 'lucide-react';

interface NewChatModalProps {
  currentUser: User;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUser,
  onClose,
  onConversationCreated,
}) => {
  const [tab, setTab] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function searchUsers() {
      if (!searchQuery.trim() || searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const url = `/users/search?q=${encodeURIComponent(searchQuery.trim())}`;
        const users = await api.get<User[]>(url);
        setSearchResults((users || []).filter((u) => u.id !== currentUser.id));
      } catch (err) {
        console.error('Search failed', err);
      }
    }

    const timer = setTimeout(searchUsers, 200);
    return () => clearTimeout(timer);
  }, [searchQuery, currentUser.id]);

  const handleStartDirectChat = async (recipientId: string) => {
    setLoading(true);
    try {
      const conv = await api.post<Conversation>('/conversations/direct', { recipientId });
      onConversationCreated(conv);
      onClose();
    } catch (err) {
      console.error('Failed to create direct conversation', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim() || selectedUserIds.length === 0) return;

    setLoading(true);
    try {
      const conv = await api.post<Conversation>('/conversations/group', {
        title: groupTitle.trim(),
        memberIds: selectedUserIds,
      });
      onConversationCreated(conv);
      onClose();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-lg p-6 shadow-2xl flex flex-col max-h-[85vh] relative overflow-hidden">
        {/* Top Gold Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#D97706] via-[#C59A58] to-[#191C3B]" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5] pt-1">
          <div>
            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
              नया संवाद सत्र
            </span>
            <h2 className="text-base font-bold text-[#191C3B] tracking-tight">
              NEW CONVERSATION
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-[#686578] hover:bg-[#FAF7F2] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl mt-4">
          <button
            onClick={() => setTab('DIRECT')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'DIRECT'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            प्रत्यक्ष संदेश (Direct Message)
          </button>
          <button
            onClick={() => setTab('GROUP')}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === 'GROUP'
                ? 'bg-white text-[#191C3B] shadow-xs'
                : 'text-[#686578] hover:text-[#191C3B]'
            }`}
          >
            नया समूह (Create Group)
          </button>
        </div>

        {tab === 'DIRECT' ? (
          <div className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#9E9AA8] absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाम अथवा उपयोगकर्ता खोजें (Search by name or @handle)..."
                className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-9 pr-3 py-2 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E8E2D5]/50">
              {searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#686578]">
                  {searchQuery ? 'कोई उपयोगकर्ता नहीं मिला • No users found' : 'कोई अन्य उपयोगकर्ता पंजीकृत नहीं है'}
                </div>
              ) : (
                searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleStartDirectChat(user.id)}
                    disabled={loading}
                    className="w-full p-3 flex items-center gap-3 hover:bg-[#FAF7F2] transition-all text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-xs border border-[#C59A58]/30">
                      {(user.displayName || user.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-[#191C3B] truncate">
                        {user.displayName || user.username}
                      </h4>
                      <p className="text-[11px] text-[#686578] truncate">@{user.username}</p>
                    </div>
                    <UserPlus className="w-4 h-4 text-[#C59A58]" />
                  </button>
                ))
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateGroup} className="mt-4 flex-1 flex flex-col overflow-hidden">
            <div className="space-y-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  समूह का नाम (Group Title)
                </label>
                <input
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="e.g. नीति समीक्षा दल / Core Team"
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-3 py-2 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                  सदस्य जोड़ें (Select Members)
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-[#9E9AA8] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search users..."
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E8E2D5]/50 border border-[#E8E2D5] rounded-xl p-2 mb-3 bg-[#FAF7F2]/40">
              {searchResults.map((user) => {
                const isSelected = selectedUserIds.includes(user.id);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => toggleUserSelection(user.id)}
                    className={`w-full p-2 flex items-center justify-between rounded-lg transition-all text-left ${
                      isSelected ? 'bg-[#FDF8EE] border border-[#EAD9BE]' : 'hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#191C3B] text-white flex items-center justify-center font-serif font-bold text-xs">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-[#191C3B] block">
                          {user.displayName || user.username}
                        </span>
                        <span className="text-[10px] text-[#686578]">@{user.username}</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      className="rounded accent-[#191C3B]"
                    />
                  </button>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={loading || !groupTitle.trim() || selectedUserIds.length === 0}
              className="w-full bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 border border-[#C59A58]/20"
            >
              {loading ? 'निर्मित किया जा रहा है...' : `समूह बनाएं • Create Group (${selectedUserIds.length} सदस्य)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
