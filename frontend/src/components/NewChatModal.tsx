import React, { useState } from 'react';
import { Conversation, User } from '../types';
import { api } from '../services/api';
import { Search, UserPlus, X, Shield, CheckCircle2, Clock } from 'lucide-react';

interface NewChatModalProps {
  currentUser: User;
  onClose: () => void;
  onConversationCreated: (conversation: Conversation) => void;
  existingConversations?: Conversation[];
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  currentUser,
  onClose,
  onConversationCreated,
  existingConversations = [],
}) => {
  const [tab, setTab] = useState<'DIRECT' | 'GROUP'>('DIRECT');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [requestSentUserIds, setRequestSentUserIds] = useState<string[]>([]);

  // Execute Strict Exact Username Search
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let clean = searchQuery.trim();
    if (clean.startsWith('@')) {
      clean = clean.substring(1).trim();
    }
    if (!clean) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    try {
      const url = `/users/search?q=${encodeURIComponent(clean)}`;
      const users = await api.get<User[]>(url);
      setSearchResults((users || []).filter((u) => u.id !== currentUser.id));
    } catch (err) {
      console.error('Search failed', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const getRelationship = (targetUserId: string) => {
    if (requestSentUserIds.includes(targetUserId)) {
      return 'REQUEST_SENT';
    }
    const existing = existingConversations.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.members.some((m) => m.user.id === targetUserId)
    );
    if (!existing) return 'NONE';
    if (existing.status === 'ACCEPTED' || !existing.status) return 'ACCEPTED';
    if (existing.requestedToId === currentUser.id) return 'PENDING_RECEIVED';
    return 'REQUEST_SENT';
  };

  const handleStartDirectChat = async (recipientId: string) => {
    setLoading(true);
    try {
      const conv = await api.post<Conversation>('/conversations/direct', { recipientId });
      setRequestSentUserIds((prev) => [...prev, recipientId]);
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
    if (!groupTitle.trim() || selectedUsers.length === 0) return;

    setLoading(true);
    try {
      const conv = await api.post<Conversation>('/conversations/group', {
        title: groupTitle.trim(),
        memberIds: selectedUsers.map((u) => u.id),
      });
      onConversationCreated(conv);
      onClose();
    } catch (err) {
      console.error('Failed to create group', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
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
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
                नया संवाद सत्र
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#FDF8EE] text-[#B45309] border border-[#EAD9BE] px-1.5 py-0.2 rounded-full">
                <Shield className="w-2.5 h-2.5" />
                Privacy First
              </span>
            </div>
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
            {/* Dedicated Username Search Field */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs font-bold text-[#9E9AA8]">@</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="सटीक उपयोगकर्ता नाम दर्ज करें (Enter exact @username)..."
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                />
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-2 bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>{isSearching ? 'खोज रहे...' : 'खोजें'}</span>
              </button>
            </form>

            <div className="flex-1 overflow-y-auto divide-y divide-[#E8E2D5]/50 border border-[#E8E2D5] rounded-xl p-2 bg-[#FAF7F2]/30">
              {!hasSearched ? (
                <div className="p-8 text-center text-xs text-[#686578] space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center mx-auto text-[#C59A58]">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-[#191C3B]">
                    सटीक उपयोगकर्ता नाम से खोजें
                  </p>
                  <p className="text-[11px] text-[#9E9AA8] max-w-xs mx-auto leading-relaxed">
                    गोपनीयता सुरक्षा के अंतर्गत कोई सार्वजनिक सूची प्रदर्शित नहीं की जाती। किसी से जुड़ने हेतु उनका सटीक @username दर्ज कर 'खोजें' दबाएं।
                  </p>
                </div>
              ) : isSearching ? (
                <div className="p-8 text-center text-xs text-[#686578]">
                  सटीक उपयोगकर्ता की खोज की जा रही है...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#686578]">
                  <p className="font-semibold text-[#191C3B]">कोई उपयोगकर्ता नहीं मिला • No user found</p>
                  <p className="text-[11px] text-[#9E9AA8] mt-1">
                    '@{(searchQuery.startsWith('@') ? searchQuery.substring(1) : searchQuery).trim()}' नाम का कोई खाता नहीं मिला।
                  </p>
                </div>
              ) : (
                searchResults.map((user) => {
                  const rel = getRelationship(user.id);
                  return (
                    <div
                      key={user.id}
                      className="w-full p-3 flex items-center justify-between gap-3 bg-white rounded-xl hover:bg-[#FAF7F2] transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-xs border border-[#C59A58]/30 flex-shrink-0">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-xl object-cover" />
                          ) : (
                            (user.displayName || user.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-[#191C3B] truncate">
                            {user.displayName || user.username}
                          </h4>
                          <p className="text-[11px] text-[#686578] truncate">@{user.username}</p>
                          {user.statusMessage && (
                            <p className="text-[10px] text-[#9E9AA8] truncate">{user.statusMessage}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        {rel === 'ACCEPTED' ? (
                          <button
                            onClick={() => handleStartDirectChat(user.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-[#191C3B] text-white text-xs font-semibold rounded-lg hover:bg-[#101226] transition-all flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>वार्तालाप खोलें</span>
                          </button>
                        ) : rel === 'REQUEST_SENT' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            अनुरोध प्रेषित
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartDirectChat(user.id)}
                            disabled={loading}
                            className="px-3 py-1.5 bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 shadow-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-[#C59A58]" />
                            <span>संदेश अनुरोध भेजें</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
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
                  सदस्य खोजें (Search User by Exact @username)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-[#9E9AA8]">@</span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="सटीक उपयोगकर्ता नाम..."
                      className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSearchSubmit()}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-3 py-1.5 bg-[#191C3B] text-white text-xs font-semibold rounded-xl"
                  >
                    खोजें
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Users Chips */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2 p-1.5 bg-[#FDF8EE] rounded-xl border border-[#EAD9BE]">
                {selectedUsers.map((u) => (
                  <span
                    key={u.id}
                    className="inline-flex items-center gap-1 bg-white border border-[#E8E2D5] px-2 py-0.5 rounded-lg text-xs font-medium text-[#191C3B]"
                  >
                    @{u.username}
                    <button
                      type="button"
                      onClick={() => toggleUserSelection(u)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-[#E8E2D5]/50 border border-[#E8E2D5] rounded-xl p-2 mb-3 bg-[#FAF7F2]/40">
              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#686578]">
                  {hasSearched ? 'कोई उपयोगकर्ता नहीं मिला' : 'सदस्य जोड़ने के लिए उनका सटीक @username खोजें'}
                </div>
              ) : (
                searchResults.map((user) => {
                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUserSelection(user)}
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
                })
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !groupTitle.trim() || selectedUsers.length === 0}
              className="w-full bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 border border-[#C59A58]/20"
            >
              {loading ? 'निर्मित किया जा रहा है...' : `समूह बनाएं • Create Group (${selectedUsers.length} सदस्य)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
