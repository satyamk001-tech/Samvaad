import React, { useEffect, useRef, useState } from 'react';
import { Conversation, Message, User } from '../types';
import { stompService } from '../services/stomp';
import { api } from '../services/api';
import {
  Send,
  Paperclip,
  Phone,
  Video,
  CheckCheck,
  FileText,
  Download,
  Info,
  Mic,
  Shield,
  Languages
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [indicMode, setIndicMode] = useState(false);
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
        setMessages((data.content || []).reverse());
      } catch (err) {
        console.error('Failed to load message history', err);
      }
    }

    loadHistory();
  }, [conversation.id]);

  // 2. Subscribe to STOMP conversation topic for live messages and typing signals
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
          return [...filtered, newMsg];
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

    return () => {
      stompService.unsubscribe(topic);
    };
  }, [conversation.id, currentUser.id, currentUser.username]);

  // 3. Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

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
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const content = inputText.trim();
    const tempId = `temp-${Date.now()}`;
    const payload = {
      conversationId: conversation.id,
      content,
      type: 'TEXT',
      tempId,
    };

    const optimisticMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      sender: currentUser,
      content,
      type: 'TEXT',
      isEdited: false,
      isDeleted: false,
      status: 'SENT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    stompService.send('/app/chat.sendMessage', payload);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setIsTyping(false);
    stompService.send('/app/chat.typing', {
      conversationId: conversation.id,
      isTyping: false,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/attachments/conversations/${conversation.id}`, formData);
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const otherUser = getRecipient();
  const isOnline = otherUser?.isOnline;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FAF7F2] overflow-hidden relative">
      {/* 1. Top Chat Header with Sovereign Indic Title and Controls */}
      <header className="h-16 bg-[#FFFFFF] border-b border-[#E8E2D5] px-6 flex items-center justify-between z-10 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black border border-[#C59A58] shadow-xs">
              {getTitle().charAt(0).toUpperCase()}
            </div>
            {conversation.type === 'DIRECT' && (
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-emerald-500' : 'bg-gray-300'
                }`}
              />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#191C3B] tracking-tight">{getTitle()}</h2>
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-[#B45309] bg-[#FDF8EE] px-1.5 py-0.5 rounded border border-[#EAD9BE]">
                <Shield className="w-2.5 h-2.5" />
                प्रमाणित
              </span>
            </div>
            <p className="text-[11px] text-[#686578]">
              {conversation.type === 'GROUP'
                ? `${conversation.members.length} सदस्य • Members`
                : isOnline
                ? 'सक्रिय (Online)'
                : 'ऑफ़लाइन (Offline)'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onInitiateCall('AUDIO')}
            className="w-9 h-9 rounded-xl text-[#191C3B] bg-[#FAF7F2] border border-[#E8E2D5] hover:bg-[#F5F0E8] hover:border-[#C59A58] flex items-center justify-center transition-all"
            title="ध्वनि कॉल • Audio Call"
          >
            <Phone className="w-4 h-4 text-[#191C3B]" />
          </button>
          <button
            onClick={() => onInitiateCall('VIDEO')}
            className="w-9 h-9 rounded-xl text-[#191C3B] bg-[#FAF7F2] border border-[#E8E2D5] hover:bg-[#F5F0E8] hover:border-[#C59A58] flex items-center justify-center transition-all"
            title="वीडियो कॉल • Video Call"
          >
            <Video className="w-4 h-4 text-[#191C3B]" />
          </button>
          {onToggleDossier && (
            <button
              onClick={onToggleDossier}
              className="w-9 h-9 rounded-xl text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center transition-all"
              title="संपर्क विवरण • Contact Dossier"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* 2. Messages Viewport with Parchment Tone and Indian Date Pill */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Date Divider Pill */}
        <div className="flex items-center justify-center my-2">
          <div className="px-3 py-1 rounded-full bg-[#FFFFFF] border border-[#E8E2D5] shadow-xs text-[10px] font-semibold text-[#686578] tracking-wider uppercase">
            आज • {new Date().toLocaleDateString('hi-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {messages.map((msg) => {
          const isMe = msg.sender.id === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs text-xs md:text-sm ${
                  isMe
                    ? 'bg-[#191C3B] text-white rounded-br-none border border-[#191C3B]'
                    : 'bg-[#FFFFFF] text-[#191C3B] border border-[#E8E2D5] rounded-bl-none shadow-xs'
                }`}
              >
                {!isMe && conversation.type === 'GROUP' && (
                  <span className="block text-[10px] font-bold text-[#D97706] mb-1">
                    {msg.sender.displayName || msg.sender.username}
                  </span>
                )}
                {msg.type !== 'TEXT' ? (
                  <div
                    className={`flex items-center gap-2 p-2 rounded-xl mb-1 ${
                      isMe ? 'bg-white/10' : 'bg-[#FAF7F2]'
                    }`}
                  >
                    <FileText className={`w-5 h-5 flex-shrink-0 ${isMe ? 'text-[#C59A58]' : 'text-[#D97706]'}`} />
                    <span className="text-xs font-medium truncate flex-1">{msg.content}</span>
                    <a
                      href={`/api/v1/attachments/messages/${msg.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-1.5 rounded-lg transition-all ${
                        isMe
                          ? 'bg-white/20 text-white hover:bg-white/30'
                          : 'bg-[#EAD9BE] text-[#B45309] hover:bg-[#D97706] hover:text-white'
                      }`}
                      title="डाउनलोड करें • Download attachment"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ) : (
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                )}
                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                    isMe ? 'text-[#C59A58]' : 'text-[#9E9AA8]'
                  }`}
                >
                  <span>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <CheckCheck className="w-3.5 h-3.5 text-[#C59A58]" />
                  )}
                </div>
              </div>
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

      {/* 3. Input Bar with Indic Script switcher and Warm Parchment styling */}
      <footer className="p-3 md:p-4 bg-[#FFFFFF] border-t border-[#E8E2D5]">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Indic Script Toggle button */}
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

          {/* Paperclip */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-[#686578] hover:text-[#191C3B] hover:border-[#C59A58] flex items-center justify-center transition-all flex-shrink-0"
            title="संलग्नक जोड़ें • Attach File"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Input Icon */}
          <button
            type="button"
            className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-[#686578] hover:text-[#191C3B] hover:border-[#C59A58] flex items-center justify-center transition-all flex-shrink-0"
            title="भाषिणी वॉइस इनपुट • Voice STT"
          >
            <Mic className="w-4 h-4 text-[#D97706]" />
          </button>

          {/* Input field */}
          <input
            type="text"
            value={inputText}
            onChange={handleInputChange}
            placeholder={
              indicMode
                ? 'संदेश लिखें (देवनागरी अथवा रोमन)...'
                : 'Type your message or attach a file...'
            }
            className="flex-1 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#191C3B] placeholder:text-[#9E9AA8] focus:outline-none focus:border-[#C59A58] focus:ring-1 focus:ring-[#C59A58]"
          />

          {/* Send button in Sovereign Navy */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-[#191C3B] text-white flex items-center justify-center hover:bg-[#101226] transition-all shadow-md shadow-[#191C3B]/10 disabled:opacity-40 flex-shrink-0 border border-[#C59A58]/20"
            title="भेजें • Send"
          >
            <Send className="w-4 h-4 text-[#C59A58]" />
          </button>
        </form>
      </footer>
    </div>
  );
};
