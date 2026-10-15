import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  Check,
  Cpu,
  Mic,
  Shield,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';

interface LanguageOption {
  code: string;
  nativeName: string;
  englishName: string;
  speakers: string;
  isPopular?: boolean;
}

const INDIC_LANGUAGES: LanguageOption[] = [
  { code: 'hi', nativeName: 'हिन्दी', englishName: 'Hindi', speakers: '600M+', isPopular: true },
  { code: 'en', nativeName: 'English (India)', englishName: 'Indian English', speakers: '200M+', isPopular: true },
  { code: 'pa', nativeName: 'ਪੰਜਾਬੀ', englishName: 'Punjabi', speakers: '35M+', isPopular: true },
  { code: 'bn', nativeName: 'বাংলা', englishName: 'Bangla', speakers: '100M+', isPopular: true },
  { code: 'ta', nativeName: 'தமிழ்', englishName: 'Tamil', speakers: '75M+' },
  { code: 'te', nativeName: 'తెలుగు', englishName: 'Telugu', speakers: '85M+' },
  { code: 'mr', nativeName: 'मराठी', englishName: 'Marathi', speakers: '90M+' },
  { code: 'gu', nativeName: 'ગુજરાતી', englishName: 'Gujarati', speakers: '60M+' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', englishName: 'Kannada', speakers: '45M+' },
  { code: 'ml', nativeName: 'മലയാളം', englishName: 'Malayalam', speakers: '38M+' },
];

export const LanguageSettings: React.FC = () => {
  const { i18n } = useTranslation();
  const [selectedLang, setSelectedLang] = useState(i18n.language || 'hi');
  const [transliterationEnabled, setTransliterationEnabled] = useState(true);
  const [bhashiniSTT, setBhashiniSTT] = useState(true);
  const [preserveOriginalScript, setPreserveOriginalScript] = useState(true);

  const handleSelectLanguage = (code: string) => {
    setSelectedLang(code);
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
    localStorage.setItem('samvaad_language', code);

    api.put('/users/me', { languagePreference: code }).catch((err) => {
      console.warn('Language preference sync notice:', err);
    });
  };

  return (
    <div className="flex-1 bg-[#FAF7F2] overflow-y-auto p-6 md:p-10 select-none">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="bg-white border border-[#E8E2D5] rounded-3xl p-6 md:p-8 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D97706] via-[#C59A58] to-[#191C3B]" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309] text-[10px] font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-[#D97706]" />
                <span>भाषिणी बहुभाषी संरचना • BHASHINI AI ENGINE V4.2</span>
              </div>
              <h1 className="text-2xl font-bold text-[#191C3B] tracking-tight">
                भाषा एवं क्षेत्रीय प्राथमिकताएं
              </h1>
              <p className="text-xs text-[#686578] mt-1">
                Configure your sovereign Indian scripts, phonetic transliteration keyboard, and neural translation engine.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="px-3 py-1.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-[#191C3B] text-xs font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#10B981]" />
                Neural Model Online
              </span>
            </div>
          </div>
        </div>

        {/* Script Selection Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#191C3B] uppercase tracking-wider">
                प्राथमिक लिपि एवं भाषा (Primary Script & Language)
              </h2>
              <p className="text-xs text-[#686578]">
                Select the interface language and default transcription font.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#D97706]">
              22 अनुसूचित भाषाएं समर्थित
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {INDIC_LANGUAGES.map((lang) => {
              const isSelected = (i18n.language || selectedLang) === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`p-4 rounded-2xl text-left transition-all border relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#191C3B] text-white border-[#191C3B] shadow-md shadow-[#191C3B]/10'
                      : 'bg-white text-[#191C3B] border-[#E8E2D5] hover:border-[#C59A58] hover:bg-[#FAF7F2]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="font-serif text-lg font-bold">
                      {lang.nativeName}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#C59A58] text-[#191C3B] flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-[#686578]'}`}>
                      {lang.englishName}
                    </p>
                    <span className={`text-[10px] mt-0.5 inline-block ${isSelected ? 'text-[#C59A58]' : 'text-[#9E9AA8]'}`}>
                      {lang.speakers}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Toggles Card */}
        <div className="bg-white border border-[#E8E2D5] rounded-3xl p-6 shadow-xs space-y-5">
          <h2 className="text-sm font-bold text-[#191C3B] uppercase tracking-wider">
            ध्वन्यात्मक एवं तंत्रिका विन्यास (Engine Parameters)
          </h2>

          {/* Toggle 1: Transliteration */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D5]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center text-[#D97706] flex-shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#191C3B]">
                  ध्वन्यात्मक लिप्यंतरण कीबोर्ड (Phonetic Transliteration Keyboard)
                </h3>
                <p className="text-[11px] text-[#686578]">
                  Type in English (e.g., "namaste") and automatically convert to native script ("नमस्ते").
                </p>
              </div>
            </div>
            <button
              onClick={() => setTransliterationEnabled(!transliterationEnabled)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                transliterationEnabled ? 'bg-[#191C3B]' : 'bg-[#E8E2D5]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  transliterationEnabled ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 2: Bhashini STT */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E8E2D5]">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center text-[#10B981] flex-shrink-0">
                <Mic className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#191C3B]">
                  भाषिणी वास्तविक समय वाणी पहचान (Bhashini Neural STT)
                </h3>
                <p className="text-[11px] text-[#686578]">
                  Enables Indian accent-adapted real-time voice-to-text during messages and calls.
                </p>
              </div>
            </div>
            <button
              onClick={() => setBhashiniSTT(!bhashiniSTT)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                bhashiniSTT ? 'bg-[#191C3B]' : 'bg-[#E8E2D5]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  bhashiniSTT ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          {/* Toggle 3: Preserve Original Script */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-center text-[#B45309] flex-shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#191C3B]">
                  मूल लिपि संरक्षण (Preserve Original Script in E2EE Audit)
                </h3>
                <p className="text-[11px] text-[#686578]">
                  Retain original unicode glyphs in end-to-end encrypted packet hashes.
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreserveOriginalScript(!preserveOriginalScript)}
              className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${
                preserveOriginalScript ? 'bg-[#191C3B]' : 'bg-[#E8E2D5]'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  preserveOriginalScript ? 'left-6.5' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
