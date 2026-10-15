import React, { useState } from 'react';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile, X } from 'lucide-react';

interface MessageEmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export const MessageEmojiPicker: React.FC<MessageEmojiPickerProps> = ({ onEmojiSelect }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all flex-shrink-0 ${
          isOpen
            ? 'bg-[#191C3B] text-white border-[#191C3B]'
            : 'bg-[#FAF7F2] text-[#686578] border-[#E8E2D5] hover:text-[#191C3B] hover:border-[#C59A58]'
        }`}
        title="इमोजी चुनें • Emoji Picker"
      >
        <Smile className="w-4 h-4 text-[#C59A58]" />
      </button>

      {isOpen && (
        <div className="absolute bottom-12 left-0 z-50 shadow-2xl rounded-2xl overflow-hidden border border-[#E8E2D5] animate-in fade-in">
          <div className="bg-white p-1 flex justify-end border-b border-[#E8E2D5]">
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-[#686578] hover:text-[#191C3B] rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={Theme.LIGHT}
            lazyLoadEmojis={true}
            searchPlaceHolder="खोजें • Search emojis..."
            width={320}
            height={380}
          />
        </div>
      )}
    </div>
  );
};
