import React, { useEffect, useState } from 'react';
import { Call, User } from '../types';
import { api } from '../services/api';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Calendar, Clock, X } from 'lucide-react';

interface CallHistoryModalProps {
  currentUser: User;
  onClose: () => void;
  onCallUser: (userId: string, type: 'AUDIO' | 'VIDEO') => void;
}

export const CallHistoryModal: React.FC<CallHistoryModalProps> = ({
  currentUser,
  onClose,
  onCallUser,
}) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCallHistory() {
      try {
        const data = await api.get<{ content: Call[] }>('/calls/history?page=0&size=50');
        setCalls(data.content || []);
      } catch (e) {
        console.error('Failed to load call history', e);
      } finally {
        setLoading(false);
      }
    }
    loadCallHistory();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <header className="p-4 border-b border-[#E8E2D5] flex items-center justify-between bg-[#FAF7F2]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#191C3B] text-white flex items-center justify-center">
              <Phone className="w-4 h-4 text-[#C59A58]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191C3B]">कॉल इतिहास • Call History</h3>
              <p className="text-[10px] text-[#686578]">Recent incoming, outgoing & missed calls</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#686578] hover:text-[#191C3B] hover:bg-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-xs text-[#686578]">कॉल इतिहास लोड हो रहा है...</div>
          ) : calls.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#686578]">
              कोई हालिया कॉल रिकॉर्ड उपलब्ध नहीं है • No call history records yet
            </div>
          ) : (
            calls.map((c) => {
              const isOutgoing = c.caller.id === currentUser.id;
              const peer = isOutgoing ? c.receiver : c.caller;
              const isMissed = c.status === 'MISSED' || c.status === 'REJECTED';
              const isVideo = c.type === 'VIDEO';

              return (
                <div
                  key={c.id}
                  className="p-3 bg-[#FAF7F2] hover:bg-[#F5F0E8] border border-[#E8E2D5] rounded-2xl flex items-center justify-between transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        isMissed
                          ? 'bg-red-50 text-red-600 border border-red-200'
                          : isOutgoing
                          ? 'bg-blue-50 text-blue-600 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      }`}
                    >
                      {isMissed ? (
                        <PhoneMissed className="w-4 h-4" />
                      ) : isOutgoing ? (
                        <PhoneOutgoing className="w-4 h-4" />
                      ) : (
                        <PhoneIncoming className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#191C3B]">
                          {peer.displayName || peer.username}
                        </span>
                        <span className="text-[10px] uppercase font-semibold text-[#686578]">
                          {isVideo ? 'वीडियो' : 'ऑडियो'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-[#9E9AA8] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(c.startedAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {c.durationSeconds && (
                          <span className="font-mono text-[#D97706]">{c.durationSeconds}s</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onCallUser(peer.id, 'AUDIO')}
                      className="p-2 rounded-xl bg-white border border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B]"
                      title="ऑडियो कॉल करें"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D97706]" />
                    </button>
                    <button
                      onClick={() => onCallUser(peer.id, 'VIDEO')}
                      className="p-2 rounded-xl bg-white border border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B]"
                      title="वीडियो कॉल करें"
                    >
                      <Video className="w-3.5 h-3.5 text-[#C59A58]" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
