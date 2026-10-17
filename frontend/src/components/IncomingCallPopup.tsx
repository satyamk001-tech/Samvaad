import React, { useEffect } from 'react';
import { Call } from '../types';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { soundService } from '../services/soundService';
import { stompService } from '../services/stomp';

interface IncomingCallPopupProps {
  call: Call;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallPopup: React.FC<IncomingCallPopupProps> = ({
  call,
  onAccept,
  onDecline,
}) => {
  const callerName = call.caller.displayName || call.caller.username;
  const isVideo = call.type === 'VIDEO';

  // Play ringing sound on mount and signal to caller that receiver's device is actively ringing
  useEffect(() => {
    soundService.startIncomingRingtone();

    // Signal RINGING to caller so caller UI updates to "Ringing..."
    stompService.send('/app/call.signal', {
      callId: call.id,
      targetUserId: call.caller.id,
      type: 'RINGING',
      data: null,
    });

    return () => {
      soundService.stopIncomingRingtone();
    };
  }, [call.id, call.caller.id]);

  const handleAcceptClick = () => {
    soundService.stopIncomingRingtone();
    onAccept();
  };

  const handleDeclineClick = () => {
    soundService.stopIncomingRingtone();
    soundService.playCallEndedTone();
    onDecline();
  };

  return (
    <div className="fixed top-6 right-6 z-60 bg-[#191C3B] border-2 border-[#C59A58] rounded-3xl shadow-2xl p-5 w-80 text-white animate-bounce-short">
      <div className="flex items-center gap-4">
        {call.caller.avatarUrl ? (
          <img
            src={call.caller.avatarUrl}
            alt={callerName}
            className="w-14 h-14 rounded-2xl object-cover border-2 border-[#C59A58]"
          />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-[#FAF7F2] text-[#191C3B] font-serif font-black text-2xl flex items-center justify-center border-2 border-[#C59A58]">
            {callerName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase font-bold text-[#D97706] tracking-wider block">
            {isVideo ? 'इनकमिंग वीडियो कॉल' : 'इनकमिंग ऑडियो कॉल'}
          </span>
          <h4 className="text-base font-bold text-white truncate">{callerName}</h4>
          <p className="text-xs text-white/70">कॉल आ रही है... Ringing</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={handleDeclineClick}
          className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          <span>अस्वीकार (Decline)</span>
        </button>

        <button
          type="button"
          onClick={handleAcceptClick}
          className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all animate-pulse"
        >
          {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          <span>स्वीकार (Accept)</span>
        </button>
      </div>
    </div>
  );
};
