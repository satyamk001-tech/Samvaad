import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  X,
  Plus,
  Image as ImageIcon,
  Type,
  ChevronLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Send,
  Trash2,
  Eye,
  Palette,
} from 'lucide-react';

export interface UserStatusItem {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  type: 'TEXT' | 'IMAGE';
  content: string; // text or image URL / data URL
  caption?: string;
  backgroundColor: string;
  createdAt: string;
  viewed?: boolean;
}

interface StatusModalProps {
  currentUser: User;
  onClose: () => void;
}

// Preset vibrant gradients for text statuses (WhatsApp / Instagram style)
const STATUS_GRADIENTS = [
  { id: 'sovereign', bg: 'linear-gradient(135deg, #191C3B 0%, #252238 100%)', label: 'संप्रभु (Sovereign)' },
  { id: 'emerald', bg: 'linear-gradient(135deg, #059669 0%, #10B981 100%)', label: 'पन्ना (Emerald)' },
  { id: 'sunset', bg: 'linear-gradient(135deg, #D97706 0%, #F59E0B 100%)', label: 'सूर्योदय (Sunset)' },
  { id: 'royal-purple', bg: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)', label: 'बैंगनी (Purple)' },
  { id: 'crimson', bg: 'linear-gradient(135deg, #DC2626 0%, #EF4444 100%)', label: 'केसरिया (Crimson)' },
  { id: 'ocean-blue', bg: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)', label: 'नील (Ocean)' },
];

// Initial demo status updates from contacts
const INITIAL_STATUSES: UserStatusItem[] = [
  {
    id: 'status-demo-1',
    userId: 'system-bot',
    username: 'samvaad_team',
    displayName: 'संवाद टीम (Samvaad HQ)',
    avatarUrl: '',
    type: 'TEXT',
    content: '🇮🇳 स्वतंत्रता और डेटा संप्रभुता: संवाद का नया संस्करण लाइव है! पूर्णतः सुरक्षित और निजी।',
    backgroundColor: 'linear-gradient(135deg, #191C3B 0%, #C59A58 100%)',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    viewed: false,
  },
  {
    id: 'status-demo-2',
    userId: 'contact-arjun',
    username: 'arjun_verma',
    displayName: 'Arjun Verma',
    avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Arjun',
    type: 'IMAGE',
    content: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop',
    caption: 'Himalayan sunrise! 🏔️ Amazing network on VoLTE call.',
    backgroundColor: 'linear-gradient(135deg, #191C3B 0%, #252238 100%)',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
    viewed: false,
  },
  {
    id: 'status-demo-3',
    userId: 'contact-priya',
    username: 'priya_sharma',
    displayName: 'Priya Sharma',
    avatarUrl: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Priya',
    type: 'TEXT',
    content: '“जहाँ संवाद है, वहीं समझ है।” ✨ शुभ प्रभात!',
    backgroundColor: 'linear-gradient(135deg, #6D28D9 0%, #8B5CF6 100%)',
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
    viewed: false,
  },
];

export const StatusModal: React.FC<StatusModalProps> = ({ currentUser, onClose }) => {
  const [statuses, setStatuses] = useState<UserStatusItem[]>(() => {
    try {
      const saved = localStorage.getItem('samvaad_user_statuses');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_STATUSES;
  });

  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [statusType, setStatusType] = useState<'TEXT' | 'IMAGE'>('TEXT');
  const [textContent, setTextContent] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(STATUS_GRADIENTS[0].bg);

  // Story Viewer state
  const [viewingStatusIndex, setViewingStatusIndex] = useState<number | null>(null);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Persist statuses to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('samvaad_user_statuses', JSON.stringify(statuses));
    } catch {}
  }, [statuses]);

  // Timer loop for story viewer
  useEffect(() => {
    if (viewingStatusIndex === null || isPaused) return;

    const interval = 50; // update progress every 50ms
    const totalDuration = 5000; // 5 seconds per story
    const step = (interval / totalDuration) * 100;

    const timer = setInterval(() => {
      setStoryProgress((prev) => {
        if (prev >= 100) {
          // Advance to next story or close
          if (viewingStatusIndex < statuses.length - 1) {
            setViewingStatusIndex(viewingStatusIndex + 1);
            return 0;
          } else {
            setViewingStatusIndex(null);
            return 0;
          }
        }
        return prev + step;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [viewingStatusIndex, isPaused, statuses.length]);

  // Reset progress when index changes
  useEffect(() => {
    setStoryProgress(0);
  }, [viewingStatusIndex]);

  // Open viewer and mark as viewed
  const handleOpenViewer = (index: number) => {
    setViewingStatusIndex(index);
    setStoryProgress(0);
    // Mark as viewed
    setStatuses((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, viewed: true } : s))
    );
  };

  const handleNextStory = () => {
    if (viewingStatusIndex === null) return;
    if (viewingStatusIndex < statuses.length - 1) {
      setViewingStatusIndex(viewingStatusIndex + 1);
    } else {
      setViewingStatusIndex(null);
    }
  };

  const handlePrevStory = () => {
    if (viewingStatusIndex === null) return;
    if (viewingStatusIndex > 0) {
      setViewingStatusIndex(viewingStatusIndex - 1);
    }
  };

  const handlePostStatus = () => {
    if (statusType === 'TEXT' && !textContent.trim()) return;
    if (statusType === 'IMAGE' && !imageUrl.trim()) return;

    const newStatus: UserStatusItem = {
      id: `status-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      displayName: currentUser.displayName || currentUser.username,
      avatarUrl: currentUser.avatarUrl,
      type: statusType,
      content: statusType === 'TEXT' ? textContent.trim() : imageUrl.trim(),
      caption: statusType === 'IMAGE' ? imageCaption.trim() : undefined,
      backgroundColor: selectedGradient,
      createdAt: new Date().toISOString(),
      viewed: true,
    };

    setStatuses((prev) => [newStatus, ...prev]);
    setIsCreating(false);
    setTextContent('');
    setImageCaption('');
    setImageUrl('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setImageUrl(dataUrl);
        setStatusType('IMAGE');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteStatus = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setStatuses((prev) => prev.filter((s) => s.id !== id));
    if (viewingStatusIndex !== null) {
      setViewingStatusIndex(null);
    }
  };

  // Group statuses: My Statuses vs Others
  const myStatuses = statuses.filter((s) => s.userId === currentUser.id);
  const otherStatuses = statuses.filter((s) => s.userId !== currentUser.id);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} d ago`;
  };

  // ================= 1. IMMERSIVE STORY VIEWER =================
  if (viewingStatusIndex !== null) {
    const active = statuses[viewingStatusIndex];
    if (!active) {
      setViewingStatusIndex(null);
      return null;
    }

    const isMine = active.userId === currentUser.id;

    return (
      <div
        className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center select-none"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Story Progress Bars at Top */}
        <div className="absolute top-4 left-4 right-4 max-w-lg mx-auto flex items-center gap-1.5 z-20">
          {statuses.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-75"
                style={{
                  width:
                    idx < viewingStatusIndex
                      ? '100%'
                      : idx === viewingStatusIndex
                      ? `${storyProgress}%`
                      : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Story Header (Avatar, Name, Time, Close) */}
        <div className="absolute top-8 left-4 right-4 max-w-lg mx-auto flex items-center justify-between z-20 text-white">
          <div className="flex items-center gap-3">
            {active.avatarUrl ? (
              <img
                src={active.avatarUrl}
                alt={active.displayName}
                className="w-10 h-10 rounded-full object-cover border-2 border-[#C59A58]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#191C3B] text-white flex items-center justify-center font-bold text-sm border-2 border-[#C59A58]">
                {active.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="text-sm font-bold leading-tight">{active.displayName}</h4>
              <p className="text-[10px] text-white/70">{formatTimeAgo(active.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isMine && (
              <button
                type="button"
                onClick={(e) => handleDeleteStatus(active.id, e)}
                className="p-2 rounded-full bg-white/10 hover:bg-red-500/80 text-white transition-colors"
                title="डिलीट करें • Delete Status"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewingStatusIndex(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="बंद करें • Close Story"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Story Content Stage */}
        <div
          className="relative w-full max-w-lg h-[80vh] rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center p-8 mx-4"
          style={{
            background: active.type === 'TEXT' ? active.backgroundColor : '#111827',
          }}
        >
          {active.type === 'TEXT' ? (
            <div className="text-center px-6">
              <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed tracking-wide drop-shadow-md whitespace-pre-wrap">
                {active.content}
              </p>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <img
                src={active.content}
                alt="Status Photo"
                className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-lg"
              />
              {active.caption && (
                <div className="absolute bottom-6 left-6 right-6 bg-black/60 backdrop-blur-md px-4 py-2.5 rounded-2xl text-center text-sm font-semibold text-white">
                  {active.caption}
                </div>
              )}
            </div>
          )}

          {/* Left / Right Tap Navigation Areas */}
          <button
            type="button"
            onClick={handlePrevStory}
            className="absolute top-0 bottom-0 left-0 w-1/3 z-10 focus:outline-none"
            aria-label="Previous story"
          />
          <button
            type="button"
            onClick={handleNextStory}
            className="absolute top-0 bottom-0 right-0 w-1/3 z-10 focus:outline-none"
            aria-label="Next story"
          />
        </div>

        {/* Bottom Story Controls */}
        <div className="absolute bottom-6 max-w-lg mx-auto flex items-center justify-between gap-4 text-white/80 z-20">
          <button
            type="button"
            onClick={handlePrevStory}
            disabled={viewingStatusIndex === 0}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-30"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-xs font-mono">
            {viewingStatusIndex + 1} / {statuses.length}
          </span>
          <button
            type="button"
            onClick={handleNextStory}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    );
  }

  // ================= 2. STATUS LIST & CREATION MODAL =================
  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-2xl h-[85vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E2D5] bg-[#FFFFFF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-lg border border-[#C59A58] shadow-xs">
              स्थि
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#191C3B]">स्थिति एवं अपडेट • Status & Stories</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309]">
                  24h Ephemeral
                </span>
              </div>
              <p className="text-xs text-[#686578]">WhatsApp व Telegram जैसी 24-घंटे दृश्य स्थिति</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="px-3.5 py-2 rounded-xl bg-[#191C3B] text-white font-semibold text-xs flex items-center gap-1.5 hover:bg-[#101226] transition-all shadow-sm"
              >
                <Plus className="w-4 h-4 text-[#C59A58]" />
                <span>स्थिति जोड़ें (Add Status)</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Stage */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* ================= A. CREATION FORM ================= */}
          {isCreating ? (
            <div className="p-5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-3xl space-y-5 animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-3">
                <h4 className="text-sm font-bold text-[#191C3B] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D97706]" />
                  <span>नया स्टेटस बनाएं • Create New Status</span>
                </h4>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-[#E8E2D5]">
                  <button
                    type="button"
                    onClick={() => setStatusType('TEXT')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      statusType === 'TEXT' ? 'bg-[#191C3B] text-white shadow-xs' : 'text-[#686578]'
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>टेक्स्ट (Text)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusType('IMAGE')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                      statusType === 'IMAGE' ? 'bg-[#191C3B] text-white shadow-xs' : 'text-[#686578]'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>तस्वीर (Photo)</span>
                  </button>
                </div>
              </div>

              {/* Status Preview Canvas */}
              {statusType === 'TEXT' ? (
                <div className="space-y-4">
                  <div
                    className="w-full h-44 rounded-2xl flex items-center justify-center p-6 text-center shadow-inner relative transition-all"
                    style={{ background: selectedGradient }}
                  >
                    <textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="यहाँ अपना स्टेटस लिखें... (Type what's on your mind...)"
                      maxLength={180}
                      rows={3}
                      className="w-full bg-transparent text-white placeholder-white/60 font-bold text-lg md:text-xl text-center resize-none focus:outline-none drop-shadow-sm"
                    />
                    <span className="absolute bottom-2 right-3 text-[10px] text-white/70 font-mono">
                      {textContent.length}/180
                    </span>
                  </div>

                  {/* Gradient Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-2 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-[#C59A58]" />
                      <span>रंग एवं थीम चुनें (Select Background):</span>
                    </label>
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                      {STATUS_GRADIENTS.map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => setSelectedGradient(g.bg)}
                          className={`w-9 h-9 rounded-xl flex-shrink-0 transition-transform ${
                            selectedGradient === g.bg ? 'scale-110 ring-2 ring-[#191C3B] ring-offset-2' : ''
                          }`}
                          style={{ background: g.bg }}
                          title={g.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {imageUrl ? (
                    <div className="relative w-full h-52 bg-black/90 rounded-2xl overflow-hidden flex items-center justify-center">
                      <img src={imageUrl} alt="Upload preview" className="h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
                        className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-44 border-2 border-dashed border-[#C59A58]/50 rounded-2xl flex flex-col items-center justify-center p-6 bg-white gap-3">
                      <ImageIcon className="w-8 h-8 text-[#C59A58]" />
                      <p className="text-xs text-[#686578] font-medium text-center">
                        फ़ाइल चुनें या छवि URL पेस्ट करें • Choose Photo or Paste URL
                      </p>
                      <label className="px-4 py-2 rounded-xl bg-[#191C3B] text-white font-semibold text-xs cursor-pointer hover:bg-[#101226] transition-all">
                        तस्वीर अपलोड करें (Upload Image)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      कैप्शन जोड़ें (Add Caption):
                    </label>
                    <input
                      type="text"
                      value={imageCaption}
                      onChange={(e) => setImageCaption(e.target.value)}
                      placeholder="तस्वीर के साथ संदेश लिखें..."
                      className="w-full bg-white border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl border border-[#E8E2D5] text-[#686578] text-xs font-semibold hover:bg-white transition-all"
                >
                  रद्द करें (Cancel)
                </button>
                <button
                  type="button"
                  onClick={handlePostStatus}
                  className="px-5 py-2 rounded-xl bg-[#191C3B] text-white text-xs font-semibold hover:bg-[#101226] flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5 text-[#C59A58]" />
                  <span>स्थिति पोस्ट करें (Post Status)</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* ================= B. MY STATUS SECTION ================= */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#686578] uppercase tracking-wider">
              मेरी स्थिति • My Status
            </h4>

            {myStatuses.length > 0 ? (
              <div className="space-y-2">
                {myStatuses.map((st) => {
                  const globalIdx = statuses.findIndex((s) => s.id === st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() => handleOpenViewer(globalIdx)}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E2D5] hover:border-[#C59A58] bg-[#FAF7F2] hover:bg-white cursor-pointer transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center p-1 border-2 border-emerald-500 shadow-xs relative overflow-hidden"
                          style={{
                            background: st.type === 'TEXT' ? st.backgroundColor : '#111827',
                          }}
                        >
                          {st.type === 'TEXT' ? (
                            <span className="text-[10px] text-white font-bold truncate max-w-full">
                              {st.content.substring(0, 10)}...
                            </span>
                          ) : (
                            <img src={st.content} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[#191C3B] group-hover:text-[#C59A58] transition-colors">
                            {st.type === 'TEXT' ? st.content.substring(0, 35) + '...' : st.caption || 'Photo Status'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#686578]">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(st.createdAt)}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                              <Eye className="w-3 h-3" /> सक्रिय (Active)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteStatus(st.id, e)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="हटाएँ • Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div
                onClick={() => setIsCreating(true)}
                className="flex items-center gap-3.5 p-3 rounded-2xl border border-dashed border-[#C59A58] bg-[#FAF7F2] hover:bg-[#FDF8EE] cursor-pointer transition-all"
              >
                <div className="relative">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-[#C59A58]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-2xl bg-[#191C3B] text-white font-serif font-black text-lg flex items-center justify-center border-2 border-[#C59A58]">
                      {(currentUser.displayName || currentUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#191C3B] text-[#C59A58] border-2 border-white flex items-center justify-center font-bold text-xs">
                    +
                  </span>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#191C3B]">अपनी स्थिति जोड़ें • Add to My Status</p>
                  <p className="text-[11px] text-[#686578]">तस्वीर या टेक्स्ट अपडेट साझा करें (24 घंटे सक्रिय)</p>
                </div>
              </div>
            )}
          </div>

          {/* ================= C. RECENT CONTACT STATUSES ================= */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#686578] uppercase tracking-wider">
              हालिया अपडेट • Recent Updates ({otherStatuses.length})
            </h4>

            {otherStatuses.length > 0 ? (
              <div className="space-y-2">
                {otherStatuses.map((st) => {
                  const globalIdx = statuses.findIndex((s) => s.id === st.id);
                  return (
                    <div
                      key={st.id}
                      onClick={() => handleOpenViewer(globalIdx)}
                      className="flex items-center justify-between p-3 rounded-2xl border border-[#E8E2D5] hover:border-[#C59A58] hover:bg-[#FAF7F2] cursor-pointer transition-all shadow-2xs group"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Avatar with colorful story ring */}
                        <div
                          className={`relative p-0.5 rounded-2xl ${
                            st.viewed
                              ? 'border-2 border-gray-300'
                              : 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 p-0.5'
                          }`}
                        >
                          {st.avatarUrl ? (
                            <img
                              src={st.avatarUrl}
                              alt={st.displayName}
                              className="w-11 h-11 rounded-2xl object-cover bg-white"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-[#191C3B] text-white font-serif font-black text-base flex items-center justify-center border border-white">
                              {st.displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-bold text-[#191C3B] group-hover:text-[#C59A58] transition-colors">
                            {st.displayName}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#686578]">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(st.createdAt)}</span>
                            <span>•</span>
                            <span className={st.viewed ? 'text-neutral-400' : 'text-[#D97706] font-semibold'}>
                              {st.viewed ? 'देखा गया (Viewed)' : 'नया स्टेटस (New)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-[#C59A58] group-hover:translate-x-1 transition-transform">
                        <span>देखें</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-neutral-400 text-xs">
                कोई हालिया स्टेटस अपडेट उपलब्ध नहीं है।
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
