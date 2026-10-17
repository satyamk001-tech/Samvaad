import React, { useState } from 'react';
import {
  X,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Upload,
  Sparkles,
  Sliders,
} from 'lucide-react';

export interface ChatWallpaperConfig {
  id: string;
  type: 'PRESET' | 'CUSTOM_URL' | 'CUSTOM_DATA';
  value: string; // CSS background value or image URL
  overlayOpacity: number; // 0 to 0.8
  applyToAll: boolean;
}

interface ChatWallpaperModalProps {
  conversationId: string;
  conversationTitle: string;
  currentWallpaper?: ChatWallpaperConfig | null;
  onSave: (config: ChatWallpaperConfig) => void;
  onReset: () => void;
  onClose: () => void;
}

export const WALLPAPER_PRESETS: Array<{
  id: string;
  name: string;
  sub: string;
  cssBackground: string;
  thumbnail: string;
}> = [
  {
    id: 'default-ivory',
    name: 'संप्रभु आइवरी (Default Sovereign)',
    sub: 'क्लीन व न्यूनतम • Clean & Minimal',
    cssBackground: '#FAF7F2',
    thumbnail: 'linear-gradient(135deg, #FAF7F2 0%, #E8E2D5 100%)',
  },
  {
    id: 'whatsapp-doodle',
    name: 'क्लासिक डूडल (Classic Chat Doodle)',
    sub: 'पारंपरिक चैट पैटर्न • Subtle Indic Doodle',
    cssBackground: `radial-gradient(circle, rgba(197, 154, 88, 0.08) 10%, transparent 11%), radial-gradient(circle, rgba(25, 28, 59, 0.05) 10%, transparent 11%) #FAF7F2`,
    thumbnail: 'radial-gradient(circle, #C59A58 15%, #FAF7F2 16%)',
  },
  {
    id: 'midnight-galaxy',
    name: 'मध्यरात्रि आकाश (Midnight Cosmic)',
    sub: 'गहरा संप्रभु • Deep Navy & Gold',
    cssBackground: 'linear-gradient(135deg, #0B0D1B 0%, #191C3B 50%, #201735 100%)',
    thumbnail: 'linear-gradient(135deg, #0B0D1B 0%, #191C3B 100%)',
  },
  {
    id: 'royal-mandala',
    name: 'शाही रंगोली (Royal Indic Mandala)',
    sub: 'सुवर्ण ज्यामितीय • Golden Heritage',
    cssBackground: 'linear-gradient(135deg, #1C1917 0%, #292524 100%)',
    thumbnail: 'linear-gradient(135deg, #C59A58 0%, #1C1917 100%)',
  },
  {
    id: 'misty-forest',
    name: 'शांत अरण्य (Misty Emerald Forest)',
    sub: 'प्राकृतिक हरित • Calming Pine Green',
    cssBackground: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
    thumbnail: 'linear-gradient(135deg, #064E3B 0%, #047857 100%)',
  },
  {
    id: 'sunset-twilight',
    name: 'संध्या कालीन (Sunset Twilight)',
    sub: 'स्वर्ण एवं लालिमा • Warm Amber Glow',
    cssBackground: 'linear-gradient(135deg, #4C1D95 0%, #831843 50%, #B45309 100%)',
    thumbnail: 'linear-gradient(135deg, #4C1D95 0%, #B45309 100%)',
  },
  {
    id: 'ocean-depths',
    name: 'गहरा सागर (Ocean Depths)',
    sub: 'शांत नील • Deep Sapphire Blue',
    cssBackground: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0369A1 100%)',
    thumbnail: 'linear-gradient(135deg, #0F172A 0%, #0369A1 100%)',
  },
];

export const ChatWallpaperModal: React.FC<ChatWallpaperModalProps> = ({
  conversationId: _conversationId,
  conversationTitle,
  currentWallpaper,
  onSave,
  onReset,
  onClose,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    currentWallpaper?.id || 'default-ivory'
  );
  const [customUrl, setCustomUrl] = useState(
    currentWallpaper?.type === 'CUSTOM_URL' || currentWallpaper?.type === 'CUSTOM_DATA'
      ? currentWallpaper.value
      : ''
  );
  const [overlayOpacity, setOverlayOpacity] = useState<number>(
    currentWallpaper?.overlayOpacity ?? 0.15
  );
  const [applyToAll, setApplyToAll] = useState(currentWallpaper?.applyToAll || false);

  // Compute live preview CSS
  const getPreviewBackground = (): string => {
    if (customUrl) {
      return `url("${customUrl}") center/cover no-repeat`;
    }
    const preset = WALLPAPER_PRESETS.find((p) => p.id === selectedPresetId);
    return preset ? preset.cssBackground : '#FAF7F2';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomUrl(dataUrl);
        setSelectedPresetId('custom');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    const config: ChatWallpaperConfig = {
      id: customUrl ? 'custom' : selectedPresetId,
      type: customUrl
        ? customUrl.startsWith('data:')
          ? 'CUSTOM_DATA'
          : 'CUSTOM_URL'
        : 'PRESET',
      value: customUrl || (WALLPAPER_PRESETS.find((p) => p.id === selectedPresetId)?.cssBackground || '#FAF7F2'),
      overlayOpacity,
      applyToAll,
    };
    onSave(config);
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-3xl h-[85vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E2D5] bg-[#FFFFFF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-lg border border-[#C59A58] shadow-xs">
              पृष्ठ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#191C3B]">
                  चैट वॉलपेपर • Chat Wallpaper
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309]">
                  {conversationTitle}
                </span>
              </div>
              <p className="text-xs text-[#686578]">
                प्रत्येक व्यक्ति व समूह के लिए अलग पृष्ठभूमि चित्र चुनें
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left Controls + Right Live Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Controls Column */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 border-r border-[#E8E2D5]">
            {/* 1. Curated Presets */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#191C3B] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>चयनित संप्रभु थीम • Sovereign Presets</span>
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                {WALLPAPER_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id && !customUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setCustomUrl('');
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'border-[#C59A58] bg-[#FDF8EE] ring-2 ring-[#C59A58]/20 shadow-xs'
                          : 'border-[#E8E2D5] bg-[#FAF7F2] hover:bg-white hover:border-[#C59A58]/50'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex-shrink-0 shadow-inner border border-black/10 relative flex items-center justify-center"
                        style={{ background: preset.thumbnail }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#191C3B] truncate">{preset.name}</p>
                        <p className="text-[10px] text-[#686578] truncate">{preset.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Custom Image Upload / URL */}
            <div className="space-y-3 pt-2 border-t border-[#E8E2D5]">
              <h4 className="text-xs font-bold text-[#191C3B] uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-[#D97706]" />
                <span>कस्टम चित्र अपलोड करें • Custom Wallpaper</span>
              </h4>

              <div className="space-y-3">
                <label className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-[#C59A58] rounded-2xl bg-[#FAF7F2] hover:bg-[#FDF8EE] text-[#191C3B] text-xs font-semibold cursor-pointer transition-all">
                  <ImageIcon className="w-4 h-4 text-[#C59A58]" />
                  <span>डिवाइस से तस्वीर चुनें (Choose Photo from Device)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-[#686578] mb-1">
                    या वेब इमेज URL पेस्ट करें (or Paste Web URL):
                  </label>
                  <input
                    type="url"
                    value={customUrl.startsWith('data:') ? '' : customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      setSelectedPresetId('custom');
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-3 py-2 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                  />
                </div>
              </div>
            </div>

            {/* 3. Readability & Opacity Slider */}
            <div className="space-y-3 pt-2 border-t border-[#E8E2D5]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#191C3B] flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#686578]" />
                  <span>सुपाठ्यता मंदता • Readability Dimming</span>
                </h4>
                <span className="text-xs font-mono text-[#C59A58] font-bold">
                  {Math.round(overlayOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.75"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-full accent-[#C59A58] cursor-pointer"
              />
              <p className="text-[10px] text-[#686578]">
                चित्र के ऊपर हल्का आवरण ताकि चैट संदेश आसानी से पढ़े जा सकें।
              </p>
            </div>

            {/* 4. Scope Selection */}
            <div className="pt-2 border-t border-[#E8E2D5]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  className="rounded text-[#C59A58] focus:ring-[#C59A58]"
                />
                <span className="text-xs font-semibold text-[#191C3B]">
                  सभी चैट के लिए डिफ़ॉल्ट बनाएं (Apply to all conversations)
                </span>
              </label>
            </div>
          </div>

          {/* Live Mock Chat Preview Column */}
          <div className="w-full md:w-80 bg-neutral-900 p-4 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-[#E8E2D5]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/60 mb-2">
              लाइव पूर्वावलोकन • Live Chat Preview
            </span>

            {/* Mock Chat Frame */}
            <div
              className="w-full h-80 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-between p-3"
              style={{
                background: getPreviewBackground(),
              }}
            >
              {/* Dimming Layer */}
              <div
                className="absolute inset-0 bg-black pointer-events-none transition-opacity"
                style={{ opacity: overlayOpacity }}
              />

              {/* Mock Chat Header */}
              <div className="relative z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded-xl flex items-center gap-2 shadow-xs">
                <div className="w-6 h-6 rounded-lg bg-[#191C3B] text-white flex items-center justify-center font-bold text-[10px]">
                  {conversationTitle.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-[#191C3B] truncate">{conversationTitle}</span>
              </div>

              {/* Mock Message Bubbles */}
              <div className="relative z-10 space-y-2">
                {/* Incoming bubble */}
                <div className="bg-white text-[#191C3B] text-[11px] p-2.5 rounded-2xl rounded-tl-xs shadow-xs max-w-[80%] font-medium">
                  नमस्ते! क्या यह नया वॉलपेपर अच्छा लग रहा है?
                </div>
                {/* Outgoing bubble */}
                <div className="bg-[#191C3B] text-white text-[11px] p-2.5 rounded-2xl rounded-tr-xs shadow-xs max-w-[80%] ml-auto font-medium">
                  हाँ, बहुत सुंदर और स्पष्ट दिख रहा है! ✨
                </div>
              </div>

              {/* Mock Input Bar */}
              <div className="relative z-10 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl text-[10px] text-neutral-400">
                संदेश लिखें...
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E8E2D5] bg-[#FFFFFF] flex items-center justify-between flex-shrink-0">
          <button
            type="button"
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-neutral-600 hover:text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>डिफ़ॉल्ट पर रीसेट करें (Reset Default)</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#E8E2D5] text-[#686578] text-xs font-semibold hover:bg-[#FAF7F2] transition-all"
            >
              रद्द करें (Cancel)
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-[#191C3B] text-white text-xs font-semibold hover:bg-[#101226] flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4 text-[#C59A58]" />
              <span>वॉलपेपर लागू करें (Apply Wallpaper)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
