import React, { useState } from 'react';
import { SmilePlus } from 'lucide-react';

interface MessageReactionsProps {
  reactions?: Array<{ emoji: string; count: number; users: string[] }>;
  currentUsername: string;
  onReact: (emoji: string) => void;
  isMe?: boolean;
}

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions = [],
  currentUsername,
  onReact,
  isMe,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative inline-flex items-center gap-1 mt-1">
      {/* Existing Reactions Badges */}
      {reactions.map((r) => {
        const hasReacted = r.users.includes(currentUsername);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onReact(r.emoji)}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border transition-all ${
              hasReacted
                ? 'bg-[#FDF8EE] border-[#C59A58] text-[#B45309]'
                : isMe
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white border-[#E8E2D5] text-[#191C3B]'
            }`}
            title={`${r.users.join(', ')}`}
          >
            <span>{r.emoji}</span>
            <span className="text-[10px] font-bold">{r.count}</span>
          </button>
        );
      })}

      {/* Quick React Button */}
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`p-1 rounded-full opacity-60 hover:opacity-100 transition-opacity ${
          isMe ? 'text-white hover:bg-white/10' : 'text-[#686578] hover:bg-[#FAF7F2]'
        }`}
        title="प्रतिक्रिया दें • Add reaction"
      >
        <SmilePlus className="w-3.5 h-3.5" />
      </button>

      {/* Quick emoji pill menu */}
      {showPicker && (
        <div
          className={`absolute bottom-6 z-30 flex items-center gap-1 p-1 bg-white border border-[#E8E2D5] rounded-full shadow-lg animate-in fade-in ${
            isMe ? 'right-0' : 'left-0'
          }`}
        >
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                setShowPicker(false);
              }}
              className="w-7 h-7 flex items-center justify-center hover:scale-125 transition-transform text-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
