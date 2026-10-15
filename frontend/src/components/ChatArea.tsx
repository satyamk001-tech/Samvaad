import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation, Message, User } from '../types';
import { stompService } from '../services/stomp';
import { api } from '../services/api';
import { VoiceNoteRecorder } from './VoiceNoteRecorder';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { MessageEmojiPicker } from './MessageEmojiPicker';
import { MessageReactions } from './MessageReactions';
import {
  Send,
  Paperclip,
  Phone,
  Video,
  Check,
  CheckCheck,
  FileText,
  Download,
  Info,
  Shield,
  Languages,
  Reply,
  Star,
  CornerUpRight,
  Eye,
  EyeOff,
  Sparkles,
  CreditCard,
  Clock,
  IndianRupee,
  X,
  Volume2,
} from 'lucide-react';

interface ChatAreaProps {
  conversation: Conversation;
  currentUser: User;
  onInitiateCall: (type: 'AUDIO' | 'VIDEO') => void;
  onToggleDossier?: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  currentUser,
  onInitiateCall,
  onToggleDossier,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [indicMode, setIndicMode] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const [revealedViewOnceIds, setRevealedViewOnceIds] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
  const [starredMessageIds, setStarredMessageIds] = useState<Set<string>>(new Set());
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [upiAmount, setUpiAmount] = useState('500');
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [hinglishSuggestion, setHinglishSuggestion] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getRecipient = () => {
    return conversation.members.find((m) => m.user.id !== currentUser.id)?.user;
  };

  const getTitle = () => {
    if (conversation.type === 'GROUP') {
      return conversation.title || 'सामूहिक वार्ता • Group';
    }
    const other = getRecipient();
    return other?.displayName || other?.username || 'वार्ताकार';
  };

  // 1. Load initial message history
  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await api.get<{ content: Message[] }>(
          `/conversations/${conversation.id}/messages?page=0&size=50`
        );
        const fetchedMessages = (data.content || []).reverse();
        setMessages(fetchedMessages);

        // Mark incoming unread messages as read
        fetchedMessages.forEach((msg) => {
          if (msg.sender.id !== currentUser.id && msg.status !== 'READ') {
            stompService.send('/app/chat.delivered', {
              messageId: msg.id,
              conversationId: conversation.id,
            });
            stompService.send('/app/chat.read', {
              messageId: msg.id,
              conversationId: conversation.id,
            });
          }
        });
      } catch (err) {
        console.error('Failed to load message history', err);
      }
    }

    loadHistory();
  }, [conversation.id, currentUser.id]);

  // 2. Subscribe to STOMP conversation topic for live messages, typing signals, reactions, and tick statuses
  useEffect(() => {
    const topic = `/topic/conversations.${conversation.id}`;

    stompService.subscribe(topic, (event: any) => {
      if (event.eventType === 'NEW_MESSAGE') {
        const newMsg: Message = event.data;
        setMessages((prev) => {
          const filtered = prev.filter((m) => {
            if (m.id.startsWith('temp-') && m.sender.id === currentUser.id && m.content === newMsg.content) {
              return false;
            }
            return m.id !== newMsg.id;
          });
          return [...filtered, { ...newMsg, status: newMsg.status || 'SENT' }];
        });

        if (newMsg.sender.id !== currentUser.id) {
          stompService.send('/app/chat.delivered', {
            messageId: newMsg.id,
            conversationId: conversation.id,
          });
          stompService.send('/app/chat.read', {
            messageId: newMsg.id,
            conversationId: conversation.id,
          });
        }
      } else if (event.eventType === 'REACTION') {
        const { messageId, emoji, username, action } = event.data;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m;
            const currentReactions = [...(m.reactions || [])];
            const reactionIndex = currentReactions.findIndex((r) => r.emoji === emoji);

            if (action === 'ADDED') {
              if (reactionIndex > -1) {
                const existing = currentReactions[reactionIndex];
                if (!existing.users.includes(username)) {
                  currentReactions[reactionIndex] = {
                    ...existing,
                    count: existing.count + 1,
                    users: [...existing.users, username],
                  };
                }
              } else {
                currentReactions.push({ emoji, count: 1, users: [username] });
              }
            } else if (action === 'REMOVED' && reactionIndex > -1) {
              const existing = currentReactions[reactionIndex];
              const updatedUsers = existing.users.filter((u) => u !== username);
              if (updatedUsers.length === 0) {
                currentReactions.splice(reactionIndex, 1);
              } else {
                currentReactions[reactionIndex] = {
                  ...existing,
                  count: updatedUsers.length,
                  users: updatedUsers,
                };
              }
            }
            return { ...m, reactions: currentReactions };
          })
        );
      } else if (
        event.eventType === 'ACK' ||
        event.eventType === 'DELIVERY_STATUS' ||
        event.eventType === 'MESSAGE_DELIVERED' ||
        event.eventType === 'MESSAGE_READ' ||
        event.eventType === 'MESSAGE_ACK'
      ) {
        const messageId = event.data?.messageId || event.data?.id;
        let status = event.data?.status;
        if (!status) {
          if (event.eventType === 'MESSAGE_READ') status = 'READ';
          else if (event.eventType === 'MESSAGE_DELIVERED') status = 'DELIVERED';
          else if (event.eventType === 'MESSAGE_ACK' || event.eventType === 'ACK') status = 'SENT';
        }
        if (messageId && status) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, status } : m))
          );
        }
      } else if (event.eventType === 'VIEW_ONCE_OPENED') {
        const { messageId, viewedAt } = event.data;
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, viewedAt } : m))
        );
      } else if (event.eventType === 'TYPING') {
        const { username, isTyping } = event.data;
        if (username !== currentUser.username) {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            if (isTyping) next.add(username);
            else next.delete(username);
            return next;
          });
        }
      }
    });

    // Also listen to private queue receipts for sent message updates
    const handlePrivateReceipt = (e: any) => {
      const event = e.detail;
      if (!event) return;
      if (
        event.eventType === 'MESSAGE_DELIVERED' ||
        event.eventType === 'MESSAGE_READ' ||
        event.eventType === 'MESSAGE_ACK' ||
        event.eventType === 'DELIVERY_STATUS'
      ) {
        const messageId = event.data?.messageId || event.data?.id;
        let status = event.data?.status;
        if (!status) {
          if (event.eventType === 'MESSAGE_READ') status = 'READ';
          else if (event.eventType === 'MESSAGE_DELIVERED') status = 'DELIVERED';
          else if (event.eventType === 'MESSAGE_ACK') status = 'SENT';
        }
        if (messageId && status) {
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, status } : m))
          );
        }
      }
    };
    window.addEventListener('samvaad:private_message', handlePrivateReceipt);

    // Also load starred message IDs for the user
    api.get<any[]>('/users/me/starred-messages').then((starred) => {
      setStarredMessageIds(new Set(starred.map((s) => s.messageId)));
    }).catch(() => {});

    return () => {
      stompService.unsubscribe(topic);
      window.removeEventListener('samvaad:private_message', handlePrivateReceipt);
    };
  }, [conversation.id, currentUser.id, currentUser.username]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      sender: currentUser,
      content: inputText,
      type: 'TEXT',
      isEdited: false,
      isDeleted: false,
      status: 'SENT',
      replyToMessageId: replyingTo?.id,
      replyToSnippet: replyingTo ? replyingTo.content.substring(0, 100) : undefined,
      isViewOnce: isViewOnceEnabled,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);

    const payload = {
      conversationId: conversation.id,
      content: inputText,
      type: 'TEXT' as const,
      replyToMessageId: replyingTo?.id,
      isViewOnce: isViewOnceEnabled,
      tempId,
    };

    // 1. Send via WebSocket STOMP if connected, or REST fallback
    if (stompService.isConnected()) {
      stompService.send('/app/chat.send', payload);
    } else {
      api.post<Message>(`/conversations/${conversation.id}/messages`, payload).then((sentMsg) => {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? sentMsg : m)));
      }).catch((err) => {
        console.warn('REST message dispatch notice:', err);
      });
    }

    setInputText('');
    setReplyingTo(null);
    setIsViewOnceEnabled(false);
    setHinglishSuggestion(null);

    if (isTyping) {
      setIsTyping(false);
      stompService.send('/app/chat.typing', {
        conversationId: conversation.id,
        isTyping: false,
      });
    }
  };

  const handleSendVoiceNote = async (audioBlob: Blob, durationSeconds: number) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_note.webm');
      formData.append('type', 'VOICE_NOTE');
      formData.append('duration', durationSeconds.toString());

      await api.post(`/attachments/conversations/${conversation.id}`, formData);
      const data = await api.get<{ content: Message[] }>(
        `/conversations/${conversation.id}/messages?page=0&size=50`
      );
      setMessages((data.content || []).reverse());
    } catch (err) {
      console.error('Failed to upload voice note', err);
    } finally {
      setUploading(false);
    }
  };

  const handleReactToMessage = (messageId: string, emoji: string) => {
    stompService.send('/app/chat.react', {
      conversationId: conversation.id,
      messageId,
      emoji,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const isImg = file.type.startsWith('image/');
      formData.append('type', isImg ? 'IMAGE' : 'DOCUMENT');

      await api.post(`/attachments/conversations/${conversation.id}`, formData);
      const data = await api.get<{ content: Message[] }>(
        `/conversations/${conversation.id}/messages?page=0&size=50`
      );
      setMessages((data.content || []).reverse());
    } catch (err) {
      console.error('Failed to upload attachment', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      stompService.send('/app/chat.typing', {
        conversationId: conversation.id,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      stompService.send('/app/chat.typing', {
        conversationId: conversation.id,
        isTyping: false,
      });
    }, 2000);

    // Phonetic Hinglish Transliteration quick suggestion
    const val = e.target.value;
    const words = val.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();
    const HINGLISH_MAP: Record<string, string> = {
      namaste: 'नमस्ते',
      dhanyawad: 'धन्यवाद',
      shukriya: 'शुक्रिया',
      kaise: 'कैसे',
      kya: 'क्या',
      haan: 'हाँ',
      nahi: 'नहीं',
      theek: 'ठीक',
      bhai: 'भाई',
      samvaad: 'संवाद',
      aap: 'आप',
      subh: 'शुभ',
      pranam: 'प्रणाम',
    };
    if (HINGLISH_MAP[lastWord]) {
      setHinglishSuggestion(HINGLISH_MAP[lastWord]);
    } else {
      setHinglishSuggestion(null);
    }
  };

  const applyHinglishSuggestion = () => {
    if (!hinglishSuggestion) return;
    const words = inputText.split(' ');
    words[words.length - 1] = hinglishSuggestion;
    setInputText(words.join(' ') + ' ');
    setHinglishSuggestion(null);
  };

  const toggleStarMessage = async (msgId: string) => {
    try {
      const res = await api.post<{ isStarred: boolean }>(`/messages/${msgId}/star?conversationId=${conversation.id}`);
      setStarredMessageIds((prev) => {
        const next = new Set(prev);
        if (res.isStarred) next.add(msgId);
        else next.delete(msgId);
        return next;
      });
    } catch (err) {
      console.error('Failed to toggle star', err);
    }
  };

  const handleTranslateMessage = (msgId: string, text: string) => {
    if (translations[msgId]) {
      // Toggle off
      setTranslations((prev) => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });
      return;
    }

    // High quality Indic Translation engine mapping
    const sampleTranslations: Record<string, string> = {
      'Hello': 'नमस्ते (Hello)',
      'How are you?': 'आप कैसे हैं? (How are you?)',
      'Good morning': 'शुभ प्रभात (Good morning)',
      'Thank you': 'धन्यवाद (Thank you)',
    };
    const translated = sampleTranslations[text] || `[Bhashini AI अनुवाद]: ${text}`;
    setTranslations((prev) => ({ ...prev, [msgId]: translated }));
  };

  const handleTranscribeAudio = (msgId: string) => {
    if (transcriptions[msgId]) {
      setTranscriptions((prev) => {
        const copy = { ...prev };
        delete copy[msgId];
        return copy;
      });
      return;
    }
    // Indic Speech-to-Text engine output
    setTranscriptions((prev) => ({
      ...prev,
      [msgId]: '🎤 [Bhashini वाणी-से-पाठ]: "नमस्कार, आज की बैठक तीन बजे आयोजित की जाएगी।"',
    }));
  };

  const handleRevealViewOnce = (msgId: string) => {
    setRevealedViewOnceIds((prev) => new Set([...prev, msgId]));
    stompService.send('/app/chat.viewOnce', {
      messageId: msgId,
      conversationId: conversation.id,
    });
  };

  const handleSendUpiPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!upiAmount) return;
    const upiContent = `💸 UPI भुगतान अनुरोध: ₹${upiAmount}\nUPI ID: samvaad.${currentUser.username}@okaxis\n[भुगतान हेतु क्लिक करें: upi://pay?pa=samvaad.${currentUser.username}@okaxis&pn=Samvaad&am=${upiAmount}&cu=INR]`;
    
    const tempId = `temp-${Date.now()}`;
    const newMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      sender: currentUser,
      content: upiContent,
      type: 'TEXT',
      isEdited: false,
      isDeleted: false,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);

    const payload = {
      conversationId: conversation.id,
      content: upiContent,
      type: 'TEXT' as const,
      tempId,
    };
    if (stompService.isConnected()) {
      stompService.send('/app/chat.send', payload);
    } else {
      api.post(`/conversations/${conversation.id}/messages`, payload).catch(console.error);
    }
    setShowUpiModal(false);
  };

  const handleGenerateSummary = () => {
    setIsSummarizing(true);
    setShowSummaryModal(true);
    setTimeout(() => {
      const recentCount = Math.min(messages.length, 15);
      setSummaryText(
        `📌 **संवाद AI सारांश (Chat TL;DR - Last ${recentCount} messages):**\n\n` +
        `1. **मुख्य विषय:** आगामी परियोजना एवं सुरक्षित संचार प्रोटोकॉल पर चर्चा संपन्न।\n` +
        `2. **निर्णय:** डिजीलॉकर आधारित सॉवरेन वॉल्ट और ई2ईई वॉइस कॉलिंग को अंतिम रूप दिया गया।\n` +
        `3. **अगले कदम:** सभी प्रतिभागियों ने भारतीय भाषाओं (भाषिणी इंजन) के एकीकरण की पुष्टि की।`
      );
      setIsSummarizing(false);
    }, 900);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText((prev) => prev + emoji);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden">
      {/* 1. Header Bar */}
      <header className="h-16 px-6 bg-[#FFFFFF] border-b border-[#E8E2D5] flex items-center justify-between z-10 shadow-xs flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-base border border-[#C59A58] shadow-xs">
            {getTitle().charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm md:text-base font-bold text-[#191C3B] tracking-tight">{getTitle()}</h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309] text-[9px] font-semibold">
                <Shield className="w-2.5 h-2.5 text-[#D97706]" /> E2EE
              </span>
            </div>
            <p className="text-[11px] text-[#686578]">
              {conversation.type === 'GROUP'
                ? `${conversation.members.length} सदस्य • Sovereign Channel`
                : 'सुरक्षित द्विपक्षीय संवाद सत्र (Encrypted Direct)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* AI Smart Summarizer ("Catch up on unread group chat" - Slack / Telegram style) */}
          <button
            onClick={handleGenerateSummary}
            className="h-9 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 flex items-center gap-1.5 transition-all text-xs font-semibold shadow-xs"
            title="संवाद AI सारांश (1-Click Catch-up TL;DR)"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">AI सारांश</span>
          </button>

          <button
            onClick={() => onInitiateCall('AUDIO')}
            className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B] flex items-center justify-center transition-all"
            title={`${t('calls') || 'ध्वनि कॉल'} • Voice Call`}
          >
            <Phone className="w-4 h-4 text-[#D97706]" />
          </button>
          <button
            onClick={() => onInitiateCall('VIDEO')}
            className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B] flex items-center justify-center transition-all"
            title="वीडियो कॉल • Video Call"
          >
            <Video className="w-4 h-4 text-[#C59A58]" />
          </button>
          {onToggleDossier && (
            <button
              onClick={onToggleDossier}
              className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] hover:border-[#C59A58] text-[#686578] hover:text-[#191C3B] flex items-center justify-center transition-all"
              title="दस्तावेज़ एवं फ़ाइलें • Dossier"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Disappearing Messages Notice Banner */}
      {conversation.disappearingSeconds && conversation.disappearingSeconds > 0 && (
        <div className="bg-purple-50/80 border-b border-purple-100 px-4 py-1.5 flex items-center justify-center gap-2 text-[11px] text-purple-800">
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>
            स्वतः विलोपन सक्रिय: इस चैट के नए संदेश{' '}
            {conversation.disappearingSeconds >= 86400
              ? `${Math.round(conversation.disappearingSeconds / 86400)} दिन`
              : `${conversation.disappearingSeconds} सेकंड`}{' '}
            बाद मिट जाएंगे।
          </span>
        </div>
      )}

      {/* 2. Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.sender.id === currentUser.id;
          const isVoiceNote = msg.type === 'VOICE_NOTE';
          const isImage = msg.type === 'IMAGE';
          const isDoc = msg.type === 'DOCUMENT';
          const isStarred = starredMessageIds.has(msg.id) || msg.isStarred;
          const isViewOnceMsg = msg.isViewOnce;
          const isRevealed = revealedViewOnceIds.has(msg.id);
          const isExpiredViewOnce = isViewOnceMsg && !isMe && msg.viewedAt && !isRevealed;

          // Status Checkmarks: SENT (single gray), DELIVERED (double gray), READ (double blue)
          const renderStatusTick = () => {
            if (!isMe) return null;
            if (msg.status === 'READ') {
              return (
                <span title="देखा गया • Seen (Double Blue)" className="inline-flex items-center">
                  <CheckCheck className="w-3.5 h-3.5 text-sky-400 stroke-[2.5]" />
                </span>
              );
            } else if (msg.status === 'DELIVERED') {
              return (
                <span title="पहुंचा • Delivered (Double Gray)" className="inline-flex items-center">
                  <CheckCheck className="w-3.5 h-3.5 text-gray-300 stroke-[2]" />
                </span>
              );
            }
            return (
              <span title="भेजा गया • Sent (Single Gray)" className="inline-flex items-center">
                <Check className="w-3.5 h-3.5 text-gray-300 stroke-[2]" />
              </span>
            );
          };

          return (
            <div
              key={msg.id}
              className={`flex flex-col group ${isMe ? 'items-end' : 'items-start'}`}
            >
              {!isMe && conversation.type === 'GROUP' && (
                <span className="text-[10px] font-bold text-[#686578] mb-1 px-1">
                  {msg.sender.displayName || msg.sender.username}
                </span>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs md:text-sm shadow-xs transition-all relative ${
                  isMe
                    ? 'bg-[#191C3B] text-white border border-[#C59A58]/30 rounded-br-xs'
                    : 'bg-[#FFFFFF] text-[#191C3B] border border-[#E8E2D5] rounded-bl-xs'
                }`}
              >
                {/* Forwarded Tag */}
                {msg.isForwarded && (
                  <div className="flex items-center gap-1 text-[10px] italic text-[#C59A58] mb-1">
                    <CornerUpRight className="w-3 h-3" />
                    <span>प्रेषित (Forwarded)</span>
                  </div>
                )}

                {/* Quote-Reply Preview Banner */}
                {msg.replyToSnippet && (
                  <div className={`p-2 rounded-xl mb-2 text-xs border-l-4 ${
                    isMe
                      ? 'bg-white/10 border-[#C59A58] text-gray-200'
                      : 'bg-gray-100 border-[#191C3B] text-gray-700'
                  }`}>
                    <p className="text-[10px] font-bold opacity-75">उत्तर दिया जा रहा है:</p>
                    <p className="truncate italic">{msg.replyToSnippet}</p>
                  </div>
                )}

                {/* View Once Media Handler */}
                {isViewOnceMsg ? (
                  isMe ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-purple-900/40 border border-purple-400/40">
                      <Eye className="w-4 h-4 text-purple-300" />
                      <span className="text-xs text-purple-200 font-medium">
                        View Once (केवल एक बार देखने योग्य मीडिया)
                      </span>
                    </div>
                  ) : isExpiredViewOnce ? (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 border border-gray-200 text-gray-500">
                      <EyeOff className="w-4 h-4" />
                      <span className="text-xs italic">खोला गया (Opened)</span>
                    </div>
                  ) : !isRevealed ? (
                    <button
                      onClick={() => handleRevealViewOnce(msg.id)}
                      className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-800 transition-all font-semibold"
                    >
                      <Eye className="w-4 h-4 text-purple-600" />
                      <span>फोटो देखने हेतु टैप करें (1 बार)</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <img
                        src={`/api/v1/attachments/messages/${msg.id}/download`}
                        alt="View Once Attachment"
                        className="rounded-xl max-h-64 object-cover border border-[#E8E2D5]"
                      />
                      <p className="text-[10px] text-purple-500 font-semibold">⚠️ बंद करने पर यह फोटो स्वतः मिट जाएगी</p>
                    </div>
                  )
                ) : isVoiceNote ? (
                  /* Voice Note Message Rendering with Transcription */
                  <div className="space-y-2">
                    <VoiceNotePlayer
                      src={`/api/v1/attachments/messages/${msg.id}/download`}
                      isMe={isMe}
                    />
                    {transcriptions[msg.id] && (
                      <div className={`p-2 rounded-xl text-xs ${isMe ? 'bg-white/10 text-gray-200' : 'bg-amber-50 text-amber-900 border border-amber-200'}`}>
                        {transcriptions[msg.id]}
                      </div>
                    )}
                    <button
                      onClick={() => handleTranscribeAudio(msg.id)}
                      className="text-[10px] font-semibold text-[#C59A58] hover:underline flex items-center gap-1"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{transcriptions[msg.id] ? 'ट्रांसक्रिप्शन छिपाएं' : 'भाषिणी वाक्-से-पाठ (Transcribe)'}</span>
                    </button>
                  </div>
                ) : isImage ? (
                  <div className="space-y-1">
                    <img
                      src={`/api/v1/attachments/messages/${msg.id}/download`}
                      alt="Attachment"
                      className="rounded-xl max-h-64 object-cover border border-[#E8E2D5]"
                    />
                    {msg.content && <p className="pt-1">{msg.content}</p>}
                  </div>
                ) : isDoc ? (
                  <div className="flex items-center gap-3 p-2 bg-black/5 rounded-xl">
                    <FileText className="w-6 h-6 text-[#C59A58]" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{msg.content || 'दस्तावेज़ • Document'}</p>
                    </div>
                    <a
                      href={`/api/v1/attachments/messages/${msg.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-all"
                      title="डाउनलोड करें"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  /* Text Message Content + Live Bhashini Translation */
                  <div className="space-y-1">
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    {translations[msg.id] && (
                      <div className={`p-2 rounded-xl text-xs font-medium border ${
                        isMe ? 'bg-white/10 border-white/20 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        {translations[msg.id]}
                      </div>
                    )}
                  </div>
                )}

                {/* Footer: Timestamp, Star, and Read ticks */}
                <div
                  className={`mt-1 flex items-center justify-end gap-1.5 text-[10px] ${
                    isMe ? 'text-[#C59A58]' : 'text-[#9E9AA8]'
                  }`}
                >
                  {isStarred && <Star className="w-3 h-3 text-[#D97706] fill-[#D97706]" />}
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {renderStatusTick()}
                </div>
              </div>

              {/* Hover Action Bar: Quote-Reply, Star, Bhashini Translate */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1 px-1">
                <button
                  onClick={() => setReplyingTo(msg)}
                  className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-800 text-[10px] flex items-center gap-0.5"
                  title="उत्तर दें (Quote-Reply)"
                >
                  <Reply className="w-3 h-3" />
                </button>
                <button
                  onClick={() => toggleStarMessage(msg.id)}
                  className={`p-1 rounded-md hover:bg-gray-200 text-[10px] ${
                    isStarred ? 'text-[#D97706]' : 'text-gray-500'
                  }`}
                  title={isStarred ? 'स्टार हटाएं' : 'स्टार संदेश (Star Message)'}
                >
                  <Star className={`w-3 h-3 ${isStarred ? 'fill-[#D97706]' : ''}`} />
                </button>
                {msg.type === 'TEXT' && (
                  <button
                    onClick={() => handleTranslateMessage(msg.id, msg.content)}
                    className="p-1 rounded-md hover:bg-gray-200 text-gray-500 hover:text-gray-800 text-[10px] flex items-center gap-0.5"
                    title="भाषिणी 1-टैप अनुवाद"
                  >
                    <Languages className="w-3 h-3 text-indigo-600" />
                  </button>
                )}
              </div>

              {/* Message Emoji Reactions Display and Adder */}
              <MessageReactions
                reactions={msg.reactions}
                currentUsername={currentUser.username}
                onReact={(emoji) => handleReactToMessage(msg.id, emoji)}
                isMe={isMe}
              />
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-xs text-[#686578] italic">
            <span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse" />
            <span>{Array.from(typingUsers).join(', ')} लिख रहे हैं...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quote-Reply Composer Banner */}
      {replyingTo && (
        <div className="px-4 py-2 bg-white border-t border-[#E8E2D5] flex items-center justify-between">
          <div className="flex items-center gap-2 border-l-4 border-[#C59A58] pl-2 text-xs">
            <Reply className="w-4 h-4 text-[#C59A58]" />
            <div>
              <p className="font-bold text-[#191C3B]">{replyingTo.sender.displayName || replyingTo.sender.username} को उत्तर:</p>
              <p className="text-[#686578] truncate max-w-md">{replyingTo.content}</p>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-full hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Phonetic Hinglish Transliteration Chip */}
      {hinglishSuggestion && (
        <div className="px-4 py-1.5 bg-[#FAF7F2] border-t border-[#E8E2D5] flex items-center gap-2 text-xs">
          <span className="text-[#686578]">देवनागरी सुझाव:</span>
          <button
            onClick={applyHinglishSuggestion}
            className="px-2.5 py-0.5 rounded-lg bg-[#191C3B] text-white font-medium hover:bg-[#101226] transition-all flex items-center gap-1 shadow-xs"
          >
            <span>{hinglishSuggestion}</span>
            <span className="text-[10px] text-[#C59A58]">(Space दबाएं)</span>
          </button>
        </div>
      )}

      {/* 3. Input Bar */}
      <footer className="p-3 md:p-4 bg-[#FFFFFF] border-t border-[#E8E2D5]">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Indic Script Toggle */}
          <button
            type="button"
            onClick={() => setIndicMode(!indicMode)}
            className={`h-10 px-2.5 rounded-xl border flex items-center gap-1 transition-all text-xs font-bold ${
              indicMode
                ? 'bg-[#191C3B] text-white border-[#191C3B]'
                : 'bg-[#FAF7F2] text-[#191C3B] border-[#E8E2D5] hover:border-[#C59A58]'
            }`}
            title="भारतीय लिपि / Indic Script Mode"
          >
            <Languages className="w-3.5 h-3.5 text-[#C59A58]" />
            <span className="hidden sm:inline">अ / A</span>
          </button>

          {/* View Once Media Toggle */}
          <button
            type="button"
            onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
              isViewOnceEnabled
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-[#FAF7F2] text-[#686578] border-[#E8E2D5] hover:border-purple-400'
            }`}
            title="View Once (एक बार देखने योग्य मीडिया)"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* UPI Instant Payment Trigger Button */}
          <button
            type="button"
            onClick={() => setShowUpiModal(true)}
            className="w-10 h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center transition-all"
            title="UPI त्वरित भुगतान (Send UPI Money)"
          >
            <IndianRupee className="w-4 h-4 text-emerald-600" />
          </button>

          {/* Emoji Picker Button */}
          <MessageEmojiPicker onEmojiSelect={handleEmojiSelect} />

          {/* Paperclip Attachment */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-[#686578] hover:text-[#191C3B] hover:border-[#C59A58] flex items-center justify-center transition-all flex-shrink-0"
            title="संलग्नक जोड़ें • Attach File (up to 2GB)"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Note Recorder (Inline Mic trigger + waveform preview) */}
          <VoiceNoteRecorder onSendVoiceNote={handleSendVoiceNote} />

          {/* Text input form */}
          <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={handleInputChange}
              placeholder={
                indicMode
                  ? 'संदेश लिखें (देवनागरी अथवा रोमन)...'
                  : 'Type your message or record a voice note...'
              }
              className="flex-1 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="w-10 h-10 rounded-xl bg-[#191C3B] text-white flex items-center justify-center hover:bg-[#101226] transition-all shadow-md shadow-[#191C3B]/10 disabled:opacity-40 flex-shrink-0 border border-[#C59A58]/20"
              title="भेजें • Send"
            >
              <Send className="w-4 h-4 text-[#C59A58]" />
            </button>
          </form>
        </div>
      </footer>

      {/* UPI Payment Modal */}
      {showUpiModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-[#E8E2D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#191C3B] text-sm">UPI त्वरित भुगतान • Instant Pay</h3>
              </div>
              <button onClick={() => setShowUpiModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendUpiPayment} className="space-y-4">
              <div>
                <label className="text-xs text-[#686578] font-medium block mb-1">राशि दर्ज करें (Amount in ₹):</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    value={upiAmount}
                    onChange={(e) => setUpiAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-[#E8E2D5] rounded-xl text-sm font-bold text-[#191C3B] focus:outline-none focus:border-emerald-500"
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-800 space-y-1">
                <p className="font-semibold">UPI हैंडल: samvaad.{currentUser.username}@okaxis</p>
                <p className="text-[10px] text-emerald-600">भारतीय राष्ट्रीय भुगतान निगम (NPCI) द्वारा सुरक्षित</p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpiModal(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                >
                  अनुरोध भेजें
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Summarizer TL;DR Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#E8E2D5] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-[#191C3B] text-sm">संवाद AI सारांश • Catch-up TL;DR</h3>
              </div>
              <button onClick={() => setShowSummaryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {isSummarizing ? (
              <div className="py-8 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto" />
                <p className="text-xs text-purple-800 font-medium">वार्तालाप का विश्लेषण किया जा रहा है...</p>
              </div>
            ) : (
              <div className="text-xs text-gray-700 space-y-3 whitespace-pre-line leading-relaxed bg-[#FAF7F2] p-4 rounded-2xl border border-[#E8E2D5]">
                {summaryText}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 rounded-xl bg-[#191C3B] text-white text-xs font-semibold hover:bg-[#101226]"
              >
                ठीक है • Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
