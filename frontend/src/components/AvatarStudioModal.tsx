import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import {
  X,
  Sparkles,
  Dices,
  Upload,
  Check,
  User as UserIcon,
  Bot,
  Smile,
  Save,
} from 'lucide-react';

interface AvatarStudioModalProps {
  currentUser: User;
  onUserUpdated: (user: User) => void;
  onClose: () => void;
}

type AvatarCategory = 'ADVENTURER' | 'BOTTTS' | 'FUN_EMOJI' | 'LORELEI' | 'SOVEREIGN' | 'UPLOAD';

// Curated sovereign preset avatars with high-resolution vector styles
const CURATED_PRESETS: Array<{ id: string; url: string; label: string; style: string }> = [
  {
    id: 'sovereign-1',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SamvaadRishi&backgroundColor=b6e3f4,c0aede,d1d4f9',
    label: 'विद्वान (Scholar)',
    style: 'ADVENTURER',
  },
  {
    id: 'sovereign-2',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BharatPioneer&backgroundColor=ffd5dc,ffdfbf',
    label: 'अन्वेषक (Explorer)',
    style: 'ADVENTURER',
  },
  {
    id: 'sovereign-3',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aaradhya&backgroundColor=c0aede,d1d4f9',
    label: 'शालीन (Grace)',
    style: 'LORELEI',
  },
  {
    id: 'sovereign-4',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Vikramaditya&backgroundColor=b6e3f4,ffd5dc',
    label: 'राजसी (Royal)',
    style: 'LORELEI',
  },
  {
    id: 'bot-1',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AryabhataBot&backgroundColor=c0aede,d1d4f9',
    label: 'आर्यभट बोट (Cyber Bot)',
    style: 'BOTTTS',
  },
  {
    id: 'bot-2',
    url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SovereignAI&backgroundColor=ffd5dc,ffdfbf',
    label: 'प्रज्ञान (Pragyan)',
    style: 'BOTTTS',
  },
  {
    id: 'emoji-1',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=SmilingJoy&backgroundColor=ffd5dc',
    label: 'प्रसन्न (Joy)',
    style: 'FUN_EMOJI',
  },
  {
    id: 'emoji-2',
    url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolChamp&backgroundColor=b6e3f4',
    label: 'उत्साही (Cool)',
    style: 'FUN_EMOJI',
  },
  {
    id: 'adv-3',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=MeeraExplorer',
    label: 'मीरा (Meera)',
    style: 'ADVENTURER',
  },
  {
    id: 'adv-4',
    url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KabirArtist',
    label: 'कबीर (Kabir)',
    style: 'ADVENTURER',
  },
  {
    id: 'lor-3',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=DeviHero',
    label: 'देवी (Devi)',
    style: 'LORELEI',
  },
  {
    id: 'lor-4',
    url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=RohanInnovator',
    label: 'रोहन (Rohan)',
    style: 'LORELEI',
  },
];

export const AvatarStudioModal: React.FC<AvatarStudioModalProps> = ({
  currentUser,
  onUserUpdated,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<AvatarCategory>('ADVENTURER');
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string>(currentUser.avatarUrl || '');
  const [customSeed, setCustomSeed] = useState(currentUser.username || 'samvaad');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [customWebUrl, setCustomWebUrl] = useState('');

  // Generate random seed
  const handleRandomize = () => {
    const randomWords = ['Arya', 'Vikram', 'Ananya', 'Surya', 'Rishi', 'Kavya', 'Indra', 'Chanakya', 'Tara', 'Veer'];
    const randomNum = Math.floor(Math.random() * 1000);
    const newSeed = `${randomWords[Math.floor(Math.random() * randomWords.length)]}${randomNum}`;
    setCustomSeed(newSeed);

    let style = 'adventurer';
    if (selectedCategory === 'BOTTTS') style = 'bottts';
    else if (selectedCategory === 'FUN_EMOJI') style = 'fun-emoji';
    else if (selectedCategory === 'LORELEI') style = 'lorelei';

    const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${newSeed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
    setCurrentAvatarUrl(url);
  };

  const handleSelectPreset = (url: string) => {
    setCurrentAvatarUrl(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentAvatarUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApplyWebUrl = () => {
    if (customWebUrl.trim()) {
      setCurrentAvatarUrl(customWebUrl.trim());
    }
  };

  const handleSaveAvatar = async () => {
    setSaving(true);
    setSuccess(false);
    try {
      const updated = await api.put<User>('/users/me', {
        avatarUrl: currentAvatarUrl,
      });
      onUserUpdated(updated);
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to save avatar', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setSaving(true);
    try {
      const updated = await api.put<User>('/users/me', {
        avatarUrl: '',
      });
      onUserUpdated(updated);
      setCurrentAvatarUrl('');
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to remove avatar', err);
    } finally {
      setSaving(false);
    }
  };

  const displayName = currentUser.displayName || currentUser.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50 animate-in fade-in duration-150">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-3xl h-[85vh] shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E2D5] bg-[#FFFFFF] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-lg border border-[#C59A58] shadow-xs">
              चित्र
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#191C3B]">
                  अवतार स्टूडियो • Sovereign Avatar Studio
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309]">
                  AI & Custom
                </span>
              </div>
              <p className="text-xs text-[#686578]">
                अपना व्यक्तिगत डिजिटल अवतार चुनें, उत्पन्न करें या अपनी तस्वीर अपलोड करें
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

        {/* Studio Content Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Column: Style Categories & Gallery */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 border-r border-[#E8E2D5]">
            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ADVENTURER')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  selectedCategory === 'ADVENTURER'
                    ? 'bg-[#191C3B] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#686578] hover:bg-[#FDF8EE]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>अन्वेषक (Adventurer)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('LORELEI')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  selectedCategory === 'LORELEI'
                    ? 'bg-[#191C3B] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#686578] hover:bg-[#FDF8EE]'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>शालीन (Lorelei)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('BOTTTS')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  selectedCategory === 'BOTTTS'
                    ? 'bg-[#191C3B] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#686578] hover:bg-[#FDF8EE]'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>साइबर बोट्स (Bottts)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('FUN_EMOJI')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  selectedCategory === 'FUN_EMOJI'
                    ? 'bg-[#191C3B] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#686578] hover:bg-[#FDF8EE]'
                }`}
              >
                <Smile className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>इमोजी (Emoji)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedCategory('UPLOAD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all flex-shrink-0 ${
                  selectedCategory === 'UPLOAD'
                    ? 'bg-[#191C3B] text-white shadow-xs'
                    : 'bg-[#FAF7F2] text-[#686578] hover:bg-[#FDF8EE]'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#C59A58]" />
                <span>अपलोड (Upload)</span>
              </button>
            </div>

            {/* Randomizer Toolbar */}
            {selectedCategory !== 'UPLOAD' && (
              <div className="p-3 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl flex items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-[#191C3B]">
                    AI जनरेटर बीज (Seed Word):
                  </p>
                  <input
                    type="text"
                    value={customSeed}
                    onChange={(e) => {
                      setCustomSeed(e.target.value);
                      const style = selectedCategory === 'BOTTTS' ? 'bottts' : selectedCategory === 'FUN_EMOJI' ? 'fun-emoji' : selectedCategory === 'LORELEI' ? 'lorelei' : 'adventurer';
                      setCurrentAvatarUrl(`https://api.dicebear.com/7.x/${style}/svg?seed=${e.target.value}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`);
                    }}
                    placeholder="कोई भी नाम या शब्द लिखें..."
                    className="w-full bg-white border border-[#E8E2D5] rounded-lg px-2.5 py-1 text-xs text-[#191C3B] mt-1 focus:outline-none focus:border-[#C59A58]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleRandomize}
                  className="px-3.5 py-2.5 rounded-xl bg-[#191C3B] text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#101226] transition-all shadow-xs flex-shrink-0 mt-3"
                  title="रैंडम नया अवतार बनाएं • Generate Random"
                >
                  <Dices className="w-4 h-4 text-[#C59A58]" />
                  <span>रैंडमाइज़ करें</span>
                </button>
              </div>
            )}

            {/* Content for Upload Tab */}
            {selectedCategory === 'UPLOAD' ? (
              <div className="space-y-4">
                <label className="w-full h-40 border-2 border-dashed border-[#C59A58] rounded-3xl flex flex-col items-center justify-center p-6 bg-[#FAF7F2] hover:bg-[#FDF8EE] cursor-pointer transition-all gap-2 text-center">
                  <Upload className="w-8 h-8 text-[#C59A58]" />
                  <p className="text-xs font-bold text-[#191C3B]">
                    अपनी पसंदीदा तस्वीर चुनें (Upload Photo)
                  </p>
                  <p className="text-[11px] text-[#686578]">PNG, JPG, WebP समर्थित</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#191C3B]">
                    या वेब छवि URL दर्ज करें (or External Image URL):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={customWebUrl}
                      onChange={(e) => setCustomWebUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="flex-1 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-3 py-2 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyWebUrl}
                      className="px-4 py-2 bg-[#191C3B] text-white rounded-xl text-xs font-semibold"
                    >
                      लागू करें
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Avatar Presets Grid */
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {CURATED_PRESETS.map((preset) => {
                  const isSelected = currentAvatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.url)}
                      className={`relative aspect-square rounded-2xl p-2 border flex flex-col items-center justify-center transition-all group ${
                        isSelected
                          ? 'border-[#C59A58] bg-[#FDF8EE] ring-2 ring-[#C59A58] shadow-md scale-102'
                          : 'border-[#E8E2D5] bg-[#FAF7F2] hover:bg-white hover:border-[#C59A58]/50'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-16 h-16 rounded-xl object-contain drop-shadow-sm group-hover:scale-105 transition-transform"
                      />
                      <span className="text-[10px] font-bold text-[#191C3B] mt-1 truncate max-w-full">
                        {preset.label}
                      </span>
                      {isSelected && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#191C3B] text-[#C59A58] flex items-center justify-center shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Live Mock Avatar Preview Stage */}
          <div className="w-full md:w-76 bg-neutral-900 p-5 flex flex-col items-center justify-between text-white border-t md:border-t-0 md:border-l border-[#E8E2D5]">
            <div className="w-full flex flex-col items-center gap-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                लाइव प्रोफ़ाइल पूर्वावलोकन • Live Preview
              </span>

              {/* Large Circular Avatar Display */}
              <div className="relative group">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={displayName}
                    className="w-28 h-28 rounded-3xl object-cover border-4 border-[#C59A58] shadow-2xl bg-white"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-3xl bg-[#191C3B] text-white font-serif font-black text-4xl flex items-center justify-center border-4 border-[#C59A58] shadow-2xl">
                    {initial}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-3 border-black animate-pulse" />
              </div>

              <div className="text-center">
                <h4 className="text-base font-bold text-white">{displayName}</h4>
                <p className="text-xs text-[#C59A58] font-mono">@{currentUser.username}</p>
                <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold">
                  सक्रिय • Verified E2EE
                </span>
              </div>

              {/* Small Context In-Chat Preview Badge */}
              <div className="w-full bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 space-y-2 text-left">
                <span className="text-[9px] font-bold uppercase tracking-wider text-white/50 block">
                  चैट में ऐसा दिखेगा (Chat Bubble View):
                </span>
                <div className="flex items-center gap-2.5">
                  {currentAvatarUrl ? (
                    <img
                      src={currentAvatarUrl}
                      alt={displayName}
                      className="w-8 h-8 rounded-xl object-cover border border-[#C59A58] bg-white"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-[#191C3B] text-white font-serif font-bold text-xs flex items-center justify-center border border-[#C59A58]">
                      {initial}
                    </div>
                  )}
                  <div className="bg-[#191C3B] text-white text-[11px] px-3 py-1.5 rounded-2xl rounded-tl-xs border border-[#C59A58]/30">
                    नमस्ते! मेरा नया अवतार कैसा है? ✨
                  </div>
                </div>
              </div>
            </div>

            {/* Remove Avatar Option */}
            {currentUser.avatarUrl && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                disabled={saving}
                className="text-[11px] text-red-400 hover:text-red-300 underline mt-4 transition-colors"
              >
                अवतार हटाएँ और आद्याक्षर (Initials) पर लौटें
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#E8E2D5] bg-[#FFFFFF] flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-[#686578]">
            {success ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <Check className="w-4 h-4" /> अवतार सफलतापूर्वक अपडेट हुआ!
              </span>
            ) : (
              '1-क्लिक में तुरंत सहेजें और संपूर्ण ऐप में लागू करें।'
            )}
          </div>

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
              onClick={handleSaveAvatar}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-[#191C3B] text-white text-xs font-semibold hover:bg-[#101226] flex items-center gap-1.5 shadow-sm"
            >
              <Save className="w-4 h-4 text-[#C59A58]" />
              <span>{saving ? 'सहेजा जा रहा है...' : 'अवतार सहेजें (Save Avatar)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
