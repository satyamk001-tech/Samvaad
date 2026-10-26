import React, { useState, useMemo } from 'react';
import { Conversation, User } from '../types';
import { api } from '../services/api';
import { Search, UserPlus, Phone, Video, MessageSquare, Shield, CheckCircle2, Clock, Users } from 'lucide-react';

interface FriendsViewProps {
  currentUser: User;
  conversations: Conversation[];
  onSelectConversation: (conversation: Conversation) => void;
  onOpenNewChat: () => void;
  onInitiateCall?: (type: 'AUDIO' | 'VIDEO', targetConversation?: Conversation) => void;
  onConversationCreated: (conversation: Conversation) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  conversations,
  onSelectConversation,
  onOpenNewChat,
  onInitiateCall,
  onConversationCreated,
}) => {
  const [exactSearchQuery, setExactSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [localFriendsFilter, setLocalFriendsFilter] = useState('');
  const [requestActionLoading, setRequestActionLoading] = useState(false);
  const [sentRequestSuccess, setSentRequestSuccess] = useState(false);

  // 1. Derive Accepted Friends ONLY (direct conversations where status is ACCEPTED or legacy null)
  const acceptedFriends = useMemo(() => {
    const friendMap = new Map<string, { user: User; conversation: Conversation }>();
    conversations.forEach((conv) => {
      if (conv.type === 'DIRECT' && (conv.status === 'ACCEPTED' || !conv.status)) {
        const other = conv.members.find((m) => m.user.id !== currentUser.id)?.user;
        if (other && !friendMap.has(other.id)) {
          friendMap.set(other.id, { user: other, conversation: conv });
        }
      }
    });
    return Array.from(friendMap.values());
  }, [conversations, currentUser.id]);

  // Filter existing friends locally
  const filteredFriends = useMemo(() => {
    if (!localFriendsFilter.trim()) return acceptedFriends;
    const term = localFriendsFilter.toLowerCase().trim();
    return acceptedFriends.filter(
      (f) =>
        f.user.username.toLowerCase().includes(term) ||
        (f.user.displayName && f.user.displayName.toLowerCase().includes(term))
    );
  }, [acceptedFriends, localFriendsFilter]);

  // Execute Strict Exact Username Search
  const handleExactSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let query = exactSearchQuery.trim();
    if (query.startsWith('@')) {
      query = query.substring(1).trim();
    }
    if (!query) {
      setSearchedUser(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setSentRequestSuccess(false);

    try {
      const results = await api.get<User[]>(`/users/search?q=${encodeURIComponent(query)}`);
      setHasSearched(true);
      if (results && results.length > 0) {
        setSearchedUser(results[0]);
      } else {
        setSearchedUser(null);
      }
    } catch (err: any) {
      console.error('Exact user search error', err);
      setSearchError(err?.message || 'खोज विफल रही • Search failed');
      setSearchedUser(null);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Check relationship status with a searched user
  const getRelationshipStatus = (targetUserId: string) => {
    // 1. Is already an accepted friend?
    const existingAccepted = acceptedFriends.find((f) => f.user.id === targetUserId);
    if (existingAccepted) {
      return { status: 'ACCEPTED', conversation: existingAccepted.conversation };
    }

    // 2. Is there a pending request?
    const pendingConv = conversations.find(
      (c) =>
        c.type === 'DIRECT' &&
        c.status === 'PENDING' &&
        c.members.some((m) => m.user.id === targetUserId)
    );

    if (pendingConv) {
      if (pendingConv.requestedToId === currentUser.id) {
        return { status: 'PENDING_RECEIVED', conversation: pendingConv };
      } else {
        return { status: 'REQUEST_SENT', conversation: pendingConv };
      }
    }

    return { status: 'NONE', conversation: null };
  };

  // Initiate first-contact message request
  const handleSendRequest = async (targetUserId: string) => {
    setRequestActionLoading(true);
    try {
      const conv = await api.post<Conversation>('/conversations/direct', { recipientId: targetUserId });
      onConversationCreated(conv);
      setSentRequestSuccess(true);
    } catch (err) {
      console.error('Failed to send message request', err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  // Accept incoming message request
  const handleAcceptRequest = async (conversationId: string) => {
    setRequestActionLoading(true);
    try {
      const updated = await api.post<Conversation>(`/conversations/requests/${conversationId}/accept`);
      onConversationCreated(updated);
      onSelectConversation(updated);
    } catch (err) {
      console.error('Failed to accept request', err);
    } finally {
      setRequestActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden select-none">
      {/* 1. Header Bar */}
      <div className="p-4 md:p-6 bg-white border-b border-[#E8E2D5] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">
              सत्यापित संबंध • PRIVACY DIRECTORY
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-[#FDF8EE] text-[#B45309] border border-[#EAD9BE] px-1.5 py-0.5 rounded-full">
              <Shield className="w-2.5 h-2.5" />
              Strict Privacy
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#191C3B] tracking-tight mt-0.5 flex items-center gap-2">
            <span>मित्र एवं संपर्क सूची</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#191C3B]/5 text-[#191C3B]">
              {acceptedFriends.length} {acceptedFriends.length === 1 ? 'संपर्क' : 'संपर्क'}
            </span>
          </h1>
          <p className="text-xs text-[#686578] mt-0.5">
            केवल स्वीकृत मित्र ही प्रदर्शित होते हैं। कोई सार्वजनिक उपयोगकर्ता सूची उपलब्ध नहीं है।
          </p>
        </div>

        <button
          onClick={onOpenNewChat}
          className="h-9 px-4 rounded-xl bg-[#191C3B] text-white flex items-center gap-2 hover:bg-[#101226] transition-all shadow-sm shadow-[#191C3B]/10 text-xs font-semibold self-start md:self-auto"
        >
          <UserPlus className="w-4 h-4 text-[#C59A58]" />
          <span>नया संवाद जोड़ें • New Chat</span>
        </button>
      </div>

      {/* 2. Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {/* Exact Username Search Box */}
        <div className="bg-white border border-[#E8E2D5] rounded-2xl p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-[#191C3B] uppercase tracking-wider flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#D97706]" />
              सटीक उपयोगकर्ता नाम खोज (Exact Username Discovery)
            </h3>
            <span className="text-[11px] text-[#686578]">Case-insensitive • Strict Match</span>
          </div>
          <p className="text-xs text-[#686578] mb-3">
            किसी भी उपयोगकर्ता को केवल उनके सटीक उपयोगकर्ता नाम (@username) से खोजा जा सकता है। आंशिक या सुझाव खोजें सुरक्षा कारणों से अक्षम हैं।
          </p>

          <form onSubmit={handleExactSearch} className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs font-bold text-[#9E9AA8]">@</span>
              <input
                type="text"
                value={exactSearchQuery}
                onChange={(e) => setExactSearchQuery(e.target.value)}
                placeholder="सटीक उपयोगकर्ता नाम दर्ज करें (e.g. rahul123)..."
                className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl pl-8 pr-3 py-2 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !exactSearchQuery.trim()}
              className="px-4 py-2 bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              <Search className="w-3.5 h-3.5 text-[#C59A58]" />
              <span>{isSearching ? 'खोज रहे हैं...' : 'खोजें • Search'}</span>
            </button>
          </form>

          {/* Search Result Feedback */}
          {hasSearched && (
            <div className="mt-4 pt-4 border-t border-[#E8E2D5]/60 animate-in fade-in">
              {searchedUser ? (
                (() => {
                  const relationship = getRelationshipStatus(searchedUser.id);
                  return (
                    <div className="bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#191C3B] text-white font-serif font-black text-sm flex items-center justify-center border border-[#C59A58]/30">
                          {searchedUser.avatarUrl ? (
                            <img
                              src={searchedUser.avatarUrl}
                              alt={searchedUser.username}
                              className="w-full h-full rounded-xl object-cover"
                            />
                          ) : (
                            (searchedUser.displayName || searchedUser.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-[#191C3B]">
                              {searchedUser.displayName || searchedUser.username}
                            </h4>
                            <span className="text-xs text-[#686578]">@{searchedUser.username}</span>
                          </div>
                          <p className="text-xs text-[#686578] mt-0.5">
                            {searchedUser.statusMessage || searchedUser.bio || 'संवाद नागरिक'}
                          </p>
                        </div>
                      </div>

                      {/* Relationship Status & Actions */}
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        {relationship.status === 'ACCEPTED' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              स्वीकृत मित्र • Accepted
                            </span>
                            <button
                              onClick={() => relationship.conversation && onSelectConversation(relationship.conversation)}
                              className="px-3 py-1.5 bg-[#191C3B] text-white text-xs font-semibold rounded-lg hover:bg-[#101226] transition-all flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-[#C59A58]" />
                              संदेश • Message
                            </button>
                          </div>
                        ) : relationship.status === 'REQUEST_SENT' || sentRequestSuccess ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            अनुरोध प्रेषित • Request Sent (Pending Acceptance)
                          </span>
                        ) : relationship.status === 'PENDING_RECEIVED' ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-1 rounded-lg">
                              अनुरोध प्राप्त • Pending Acceptance
                            </span>
                            <button
                              onClick={() => relationship.conversation && handleAcceptRequest(relationship.conversation.id)}
                              disabled={requestActionLoading}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-all"
                            >
                              स्वीकार करें • Accept
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSendRequest(searchedUser.id)}
                            disabled={requestActionLoading}
                            className="px-3.5 py-1.5 bg-[#191C3B] hover:bg-[#101226] text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border border-[#C59A58]/30 shadow-xs"
                          >
                            <UserPlus className="w-3.5 h-3.5 text-[#C59A58]" />
                            <span>संदेश अनुरोध भेजें • Send Request</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-4 bg-[#FAF7F2] border border-dashed border-[#E8E2D5] rounded-xl text-center text-xs text-[#686578]">
                  <p className="font-semibold text-[#191C3B]">
                    {searchError || 'कोई उपयोगकर्ता नहीं मिला • No user found'}
                  </p>
                  <p className="mt-0.5 text-[11px]">
                    '@{(exactSearchQuery.startsWith('@') ? exactSearchQuery.substring(1) : exactSearchQuery).trim()}' नाम का कोई खाता उपलब्ध नहीं है। कृपया सही वर्तनी जांचें।
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing Friends Section */}
        <div className="bg-white border border-[#E8E2D5] rounded-2xl p-4 md:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E8E2D5] gap-2 mb-4">
            <div>
              <h2 className="text-xs font-bold text-[#191C3B] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#D97706]" />
                स्थापित संबंध एवं मित्र (Established Connections)
              </h2>
              <span className="text-[11px] text-[#686578]">
                {acceptedFriends.length} स्थापित वार्तालाप साथी
              </span>
            </div>

            {acceptedFriends.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#9E9AA8] absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={localFriendsFilter}
                  onChange={(e) => setLocalFriendsFilter(e.target.value)}
                  placeholder="मित्रों में खोजें • Filter friends..."
                  className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58]"
                />
              </div>
            )}
          </div>

          {/* Friends List or Empty State */}
          {acceptedFriends.length === 0 ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <Users className="w-7 h-7 text-[#C59A58]" />
              </div>
              <h3 className="text-sm font-bold text-[#191C3B]">
                कोई मित्र या संपर्क नहीं है • No Contacts Yet
              </h3>
              <p className="text-xs text-[#686578] mt-1.5 leading-relaxed">
                गोपनीयता के लिए संवाद किसी भी पंजीकृत उपयोगकर्ता की सूची सार्वजनिक रूप से नहीं दिखाता। किसी से संपर्क करने के लिए ऊपर दिए गए खोज बॉक्स में उनका सटीक उपयोगकर्ता नाम (@username) खोजें।
              </p>
              <button
                onClick={() => {
                  const input = document.querySelector('input[placeholder*="सटीक उपयोगकर्ता नाम"]') as HTMLInputElement;
                  if (input) input.focus();
                }}
                className="mt-4 px-4 py-2 bg-[#191C3B] text-white text-xs font-semibold rounded-xl hover:bg-[#101226] transition-all inline-flex items-center gap-1.5 shadow-sm"
              >
                <Search className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>उपयोगकर्ता नाम खोजें • Search Username</span>
              </button>
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#686578]">
              कोई मित्र इस नाम से मेल नहीं खाता • No contacts match your filter
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredFriends.map(({ user, conversation }) => (
                <div
                  key={user.id}
                  className="p-3.5 rounded-xl border border-[#E8E2D5] bg-[#FAF7F2]/50 hover:bg-[#FAF7F2] transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-[#191C3B] text-white font-serif font-black text-xs flex items-center justify-center border border-[#C59A58]/20">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.username}
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          (user.displayName || user.username).charAt(0).toUpperCase()
                        )}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                          user.isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#191C3B] truncate">
                        {user.displayName || user.username}
                      </h4>
                      <p className="text-[11px] text-[#686578] truncate">@{user.username}</p>
                      {user.statusMessage && (
                        <p className="text-[10px] text-[#9E9AA8] truncate mt-0.5">
                          {user.statusMessage}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onSelectConversation(conversation)}
                      className="p-2 rounded-lg bg-white border border-[#E8E2D5] text-[#191C3B] hover:bg-[#191C3B] hover:text-white transition-all shadow-2xs"
                      title="संदेश भेजें • Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {onInitiateCall && (
                      <>
                        <button
                          onClick={() => {
                            onSelectConversation(conversation);
                            onInitiateCall('AUDIO', conversation);
                          }}
                          className="p-2 rounded-lg bg-white border border-[#E8E2D5] text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-2xs"
                          title="ऑडियो कॉल • Voice Call"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            onSelectConversation(conversation);
                            onInitiateCall('VIDEO', conversation);
                          }}
                          className="p-2 rounded-lg bg-white border border-[#E8E2D5] text-purple-700 hover:bg-purple-600 hover:text-white transition-all shadow-2xs"
                          title="वीडियो कॉल • Video Call"
                        >
                          <Video className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
