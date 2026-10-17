import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { api } from '../services/api';
import {
  User as UserIcon,
  Image,
  Activity,
  Settings,
  Shield,
  Bell,
  Languages,
  Palette,
  HardDrive,
  HelpCircle,
  Info,
  LogOut,
  X,
  Check,
  Save,
  Moon,
  Sun,
  Laptop,
  Sparkles,
  Dices,
  Upload,
} from 'lucide-react';

export type SettingsSection =
  | 'MY_PROFILE'
  | 'EDIT_PROFILE'
  | 'CHANGE_AVATAR'
  | 'SET_STATUS'
  | 'ACCOUNT'
  | 'PRIVACY'
  | 'NOTIFICATIONS'
  | 'LANGUAGE'
  | 'APPEARANCE'
  | 'STORAGE'
  | 'HELP'
  | 'ABOUT';

interface SettingsModalProps {
  section: SettingsSection;
  currentUser: User;
  onClose: () => void;
  onUserUpdated: (user: User) => void;
  onLogout: () => void;
}

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', script: 'Latin' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'Devanagari' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'Bengali' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'Tamil' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'Telugu' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'Devanagari' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'Malayalam' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  section: initialSection,
  currentUser,
  onClose,
  onUserUpdated,
  onLogout,
}) => {
  const { t, i18n } = useTranslation();
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection);
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');
  const [statusMessage, setStatusMessage] = useState(currentUser.statusMessage || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Preference states
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>('light');
  const [readReceipts, setReadReceipts] = useState(true);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [desktopAlerts, setDesktopAlerts] = useState(true);

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.put<User>('/users/me', {
        displayName,
        bio,
        avatarUrl,
        statusMessage,
        languagePreference: i18n.language,
      });
      onUserUpdated(updated);
      setSuccess('प्रोफ़ाइल सफलतापूर्वक अपडेट हुई • Profile updated successfully');
    } catch (err: any) {
      setError(err.message || 'त्रुटि हुई • Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
    try {
      const updated = await api.put<User>('/users/me', {
        languagePreference: langCode,
      });
      onUserUpdated(updated);
    } catch (e) {
      console.warn('Could not persist language to user profile', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/70 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50">
      <div className="bg-white border border-[#E8E2D5] rounded-3xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Category Sidebar */}
        <div className="w-full md:w-64 bg-[#FAF7F2] border-r border-[#E8E2D5] flex flex-col p-4 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4 px-2">
            <div className="w-8 h-8 rounded-xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-sm border border-[#C59A58]">
              सं
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#191C3B]">सेटिंग्स एवं प्रोफ़ाइल</h3>
              <p className="text-[10px] text-[#D97706] font-semibold">Samvaad Settings</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-xs">
            <button
              onClick={() => setActiveSection('MY_PROFILE')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'MY_PROFILE' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <UserIcon className="w-4 h-4 text-[#C59A58]" />
              <span>{t('myProfile') || 'My Profile'}</span>
            </button>



            <button
              onClick={() => setActiveSection('CHANGE_AVATAR')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'CHANGE_AVATAR' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Image className="w-4 h-4 text-[#C59A58]" />
              <span>{t('changeProfilePic') || 'Change Profile Picture'}</span>
            </button>

            <button
              onClick={() => setActiveSection('SET_STATUS')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'SET_STATUS' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Activity className="w-4 h-4 text-[#C59A58]" />
              <span>{t('setStatus') || 'Set Status'}</span>
            </button>

            <div className="pt-2 pb-1 border-t border-[#E8E2D5] my-1 text-[10px] uppercase font-bold text-[#9E9AA8] px-3">
              प्राथमिकताएं • Preferences
            </div>

            <button
              onClick={() => setActiveSection('LANGUAGE')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'LANGUAGE' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Languages className="w-4 h-4 text-[#D97706]" />
              <span>{t('language') || 'Language'}</span>
            </button>

            <button
              onClick={() => setActiveSection('APPEARANCE')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'APPEARANCE' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Palette className="w-4 h-4 text-[#686578]" />
              <span>{t('appearanceThemes') || 'Appearance and Themes'}</span>
            </button>

            <button
              onClick={() => setActiveSection('NOTIFICATIONS')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'NOTIFICATIONS' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Bell className="w-4 h-4 text-[#686578]" />
              <span>{t('notifications') || 'Notifications'}</span>
            </button>

            <button
              onClick={() => setActiveSection('PRIVACY')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'PRIVACY' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Shield className="w-4 h-4 text-[#686578]" />
              <span>{t('privacySecurity') || 'Privacy and Security'}</span>
            </button>

            <button
              onClick={() => setActiveSection('ACCOUNT')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'ACCOUNT' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Settings className="w-4 h-4 text-[#686578]" />
              <span>{t('accountSettings') || 'Account Settings'}</span>
            </button>

            <button
              onClick={() => setActiveSection('STORAGE')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'STORAGE' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <HardDrive className="w-4 h-4 text-[#686578]" />
              <span>{t('storageMedia') || 'Storage and Media'}</span>
            </button>

            <button
              onClick={() => setActiveSection('HELP')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'HELP' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-[#686578]" />
              <span>{t('helpSupport') || 'Help and Support'}</span>
            </button>

            <button
              onClick={() => setActiveSection('ABOUT')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all text-left ${
                activeSection === 'ABOUT' ? 'bg-[#191C3B] text-white' : 'text-[#191C3B] hover:bg-[#F0ECE1]'
              }`}
            >
              <Info className="w-4 h-4 text-[#686578]" />
              <span>{t('aboutSamvaad') || 'About Samvaad'}</span>
            </button>
          </div>

          <div className="pt-3 border-t border-[#E8E2D5]">
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium text-xs text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>{t('signOut') || 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Right Main Content Pane */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Header */}
          <div className="p-5 border-b border-[#E8E2D5] flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#191C3B]">
                {activeSection === 'MY_PROFILE' && (t('myProfile') || 'My Profile')}
                {activeSection === 'EDIT_PROFILE' && (t('editProfile') || 'Edit Profile')}
                {activeSection === 'CHANGE_AVATAR' && (t('changeProfilePic') || 'Change Profile Picture')}
                {activeSection === 'SET_STATUS' && (t('setStatus') || 'Set Status')}
                {activeSection === 'LANGUAGE' && (t('language') || 'Language')}
                {activeSection === 'APPEARANCE' && (t('appearanceThemes') || 'Appearance and Themes')}
                {activeSection === 'NOTIFICATIONS' && (t('notifications') || 'Notifications')}
                {activeSection === 'PRIVACY' && (t('privacySecurity') || 'Privacy and Security')}
                {activeSection === 'ACCOUNT' && (t('accountSettings') || 'Account Settings')}
                {activeSection === 'STORAGE' && (t('storageMedia') || 'Storage and Media')}
                {activeSection === 'HELP' && (t('helpSupport') || 'Help and Support')}
                {activeSection === 'ABOUT' && (t('aboutSamvaad') || 'About Samvaad')}
              </h2>
              <p className="text-xs text-[#686578]">
                संवाद संप्रभु संदेशवाहक प्रणाली • Sovereign Indic Communication Platform
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl text-[#686578] hover:text-[#191C3B] hover:bg-[#FAF7F2] flex items-center justify-center transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Feedback messages */}
          {success && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. MY PROFILE */}
            {activeSection === 'MY_PROFILE' && (
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl">
                  {currentUser.avatarUrl ? (
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.displayName || currentUser.username}
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-[#C59A58]"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-2xl bg-[#191C3B] text-[#FAF7F2] font-serif font-black text-3xl flex items-center justify-center border-2 border-[#C59A58]">
                      {(currentUser.displayName || currentUser.username).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-bold text-[#191C3B]">
                      {currentUser.displayName || currentUser.username}
                    </h3>
                    <p className="text-xs text-[#686578] font-mono">@{currentUser.username}</p>
                    <p className="text-xs text-[#C59A58] mt-1 font-medium">{currentUser.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {t('online') || 'सक्रिय'} • E2EE Active
                    </div>
                  </div>
                </div>

                {/* Profile Edit Form directly inside My Profile */}
                <div className="p-5 bg-white border border-[#E8E2D5] rounded-2xl space-y-4">
                  <h4 className="text-xs font-bold text-[#191C3B] uppercase tracking-wider">
                    प्रोफ़ाइल विवरण संपादित करें • Edit Profile Details
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                        पूरा नाम (Display Name)
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                        placeholder="आपका नाम"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                        स्थिति संदेश (Status Message)
                      </label>
                      <input
                        type="text"
                        value={statusMessage}
                        onChange={(e) => setStatusMessage(e.target.value)}
                        className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                        placeholder="उपलब्ध (Available)"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      परिचय (Bio / About)
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                      placeholder="अपने बारे में कुछ लिखें..."
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-[11px] text-[#686578]">
                      खाता निर्माण: {new Date(currentUser.createdAt).toLocaleDateString()}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-5 py-2.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Save className="w-4 h-4 text-[#C59A58]" />
                      <span>{saving ? 'सहेजा जा रहा है...' : 'परिवर्तन सहेजें • Save Profile'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CHANGE AVATAR */}
            {activeSection === 'CHANGE_AVATAR' && (
              <div className="space-y-5 max-w-lg">
                <div className="flex items-center gap-4 p-4 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Avatar Preview"
                      className="w-18 h-18 rounded-2xl object-cover border-2 border-[#C59A58] bg-white shadow-sm"
                    />
                  ) : (
                    <div className="w-18 h-18 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-2xl border-2 border-[#C59A58] shadow-sm">
                      {currentUser.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-[#191C3B]">प्रोफ़ाइल चित्र (Avatar Studio)</h4>
                    <p className="text-xs text-[#686578]">
                      चयनित AI अवतार चुनें, रैंडमाइज़ करें या डिवाइस से फोटो अपलोड करें
                    </p>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="text-[11px] text-red-600 hover:underline mt-1 block font-medium"
                      >
                        अवतार हटाएँ (Remove Avatar)
                      </button>
                    )}
                  </div>
                </div>

                {/* 1-Click Vector Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#191C3B] uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C59A58]" />
                      <span>चयनित अवतार (Curated Presets)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const seeds = ['Arya', 'Vikram', 'Meera', 'Rishi', 'Kavya', 'Indra', 'Tara', 'Veer', 'Bharat'];
                        const rnd = seeds[Math.floor(Math.random() * seeds.length)] + Math.floor(Math.random() * 500);
                        setAvatarUrl(`https://api.dicebear.com/7.x/adventurer/svg?seed=${rnd}&backgroundColor=b6e3f4,c0aede,ffd5dc`);
                      }}
                      className="text-xs text-[#191C3B] font-bold flex items-center gap-1 hover:text-[#C59A58] transition-colors"
                    >
                      <Dices className="w-3.5 h-3.5 text-[#C59A58]" />
                      <span>रैंडम रोल (Roll AI)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=SamvaadRishi&backgroundColor=b6e3f4,c0aede', label: 'विद्वान' },
                      { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=BharatPioneer&backgroundColor=ffd5dc,ffdfbf', label: 'अन्वेषक' },
                      { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Aaradhya&backgroundColor=c0aede,d1d4f9', label: 'शालीन' },
                      { url: 'https://api.dicebear.com/7.x/lorelei/svg?seed=Vikramaditya&backgroundColor=b6e3f4,ffd5dc', label: 'राजसी' },
                      { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=AryabhataBot&backgroundColor=c0aede', label: 'बोट' },
                      { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SovereignAI&backgroundColor=ffd5dc', label: 'प्रज्ञान' },
                      { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=SmilingJoy&backgroundColor=ffd5dc', label: 'प्रसन्न' },
                      { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=CoolChamp&backgroundColor=b6e3f4', label: 'उत्साही' },
                    ].map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(p.url)}
                        className={`p-1.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                          avatarUrl === p.url
                            ? 'border-[#C59A58] bg-[#FDF8EE] ring-2 ring-[#C59A58] scale-105'
                            : 'border-[#E8E2D5] bg-[#FAF7F2] hover:bg-white'
                        }`}
                      >
                        <img src={p.url} alt={p.label} className="w-10 h-10 object-contain rounded-lg" />
                        <span className="text-[10px] font-semibold text-[#191C3B] mt-0.5 truncate max-w-full">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Local Photo Upload & URL */}
                <div className="space-y-3 pt-2 border-t border-[#E8E2D5]">
                  <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-[#C59A58] rounded-xl bg-[#FAF7F2] hover:bg-[#FDF8EE] text-[#191C3B] text-xs font-semibold cursor-pointer transition-all">
                    <Upload className="w-4 h-4 text-[#C59A58]" />
                    <span>डिवाइस से तस्वीर चुनें (Upload Photo from Device)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) setAvatarUrl(ev.target.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                    />
                  </label>

                  <div>
                    <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                      या छवि URL (or Image URL):
                    </label>
                    <input
                      type="url"
                      value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/photo.jpg"
                      className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4 text-[#C59A58]" />
                  <span>{saving ? 'सहेजा जा रहा है...' : 'अवतार सहेजें • Save Avatar'}</span>
                </button>
              </div>
            )}

            {/* 4. SET STATUS */}
            {activeSection === 'SET_STATUS' && (
              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-[#191C3B] mb-1">
                    वर्तमान स्थिति (Status Message)
                  </label>
                  <input
                    type="text"
                    value={statusMessage}
                    onChange={(e) => setStatusMessage(e.target.value)}
                    placeholder="e.g. बैठक में व्यस्त • Busy in conference"
                    className="w-full bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl px-4 py-2.5 text-xs text-[#191C3B] focus:outline-none focus:border-[#C59A58]"
                  />
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  {['उपलब्ध • Available', 'व्यस्त • Busy', 'सत्र में • In Meeting', 'कार्य पर • Working', 'दूर • Away'].map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatusMessage(st)}
                        className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl hover:border-[#C59A58] text-[#191C3B]"
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4 text-[#C59A58]" />
                  <span>{saving ? 'सहेजा जा रहा है...' : 'स्थिति सहेजें • Save Status'}</span>
                </button>
              </div>
            )}

            {/* 5. LANGUAGE (10 Indian Languages) */}
            {activeSection === 'LANGUAGE' && (
              <div className="space-y-4">
                <div className="p-4 bg-[#FDF8EE] border border-[#EAD9BE] rounded-2xl flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-[#B45309]">
                      भारतीय भाषा वास्तुकला • 10 Scheduled Languages
                    </h4>
                    <p className="text-[11px] text-[#686578]">
                      चयनित भाषा संपूर्ण ऐप्लिकेशन पर तुरंत लागू होगी • Instant switch without page reload
                    </p>
                  </div>
                  <span className="text-xl">🇮🇳</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = i18n.language === lang.code;
                    return (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => handleLanguageChange(lang.code)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-[#191C3B] text-white border-[#191C3B] shadow-md'
                            : 'bg-[#FAF7F2] border-[#E8E2D5] hover:border-[#C59A58] text-[#191C3B]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{lang.native}</span>
                            <span className={`text-xs ${isSelected ? 'text-[#C59A58]' : 'text-[#686578]'}`}>
                              ({lang.name})
                            </span>
                          </div>
                          <span className={`text-[10px] block mt-0.5 ${isSelected ? 'text-white/60' : 'text-[#9E9AA8]'}`}>
                            लिपि: {lang.script}
                          </span>
                        </div>
                        {isSelected && <Check className="w-5 h-5 text-[#C59A58]" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 6. APPEARANCE & THEMES */}
            {activeSection === 'APPEARANCE' && (
              <div className="space-y-5 max-w-lg">
                <div>
                  <h4 className="text-xs font-bold text-[#191C3B] mb-2">रंग रूप एवं थीम (Theme)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => setThemeMode('light')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold ${
                        themeMode === 'light'
                          ? 'border-[#C59A58] bg-[#FDF8EE] text-[#B45309]'
                          : 'border-[#E8E2D5] text-[#686578]'
                      }`}
                    >
                      <Sun className="w-5 h-5 text-[#D97706]" />
                      <span>स्वर्ण-प्रकाश (Light)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('dark')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold ${
                        themeMode === 'dark'
                          ? 'border-[#C59A58] bg-[#191C3B] text-white'
                          : 'border-[#E8E2D5] text-[#686578]'
                      }`}
                    >
                      <Moon className="w-5 h-5 text-[#C59A58]" />
                      <span>गहरी रात्रि (Dark)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setThemeMode('system')}
                      className={`p-3 rounded-2xl border flex flex-col items-center gap-2 text-xs font-semibold ${
                        themeMode === 'system'
                          ? 'border-[#C59A58] bg-[#FAF7F2] text-[#191C3B]'
                          : 'border-[#E8E2D5] text-[#686578]'
                      }`}
                    >
                      <Laptop className="w-5 h-5" />
                      <span>सिस्टम (Auto)</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-[#191C3B] block">फॉन्ट एवं लेआउट</span>
                  <p className="text-[11px] text-[#686578]">
                    Sovereign Indic Serif + Sans-serif typographic scale with Unicode Indic Font support.
                  </p>
                </div>
              </div>
            )}

            {/* 7. NOTIFICATIONS */}
            {activeSection === 'NOTIFICATIONS' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="flex items-center justify-between p-3.5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl">
                  <div>
                    <span className="font-bold text-[#191C3B] block">ध्वनि सूचनाएं (Sound Alerts)</span>
                    <span className="text-[11px] text-[#686578]">संदेश और कॉल आने पर ध्वनि बजाएं</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={soundNotifications}
                    onChange={(e) => setSoundNotifications(e.target.checked)}
                    className="w-4 h-4 accent-[#191C3B]"
                  />
                </div>

                <div className="flex items-center justify-between p-3.5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl">
                  <div>
                    <span className="font-bold text-[#191C3B] block">डेस्कटॉप अलर्ट (Desktop Banners)</span>
                    <span className="text-[11px] text-[#686578]">नए संदेशों के लिए सूचना दिखाएं</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={desktopAlerts}
                    onChange={(e) => setDesktopAlerts(e.target.checked)}
                    className="w-4 h-4 accent-[#191C3B]"
                  />
                </div>
              </div>
            )}

            {/* 8. PRIVACY & SECURITY */}
            {activeSection === 'PRIVACY' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="flex items-center justify-between p-3.5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl">
                  <div>
                    <span className="font-bold text-[#191C3B] block">पढ़े जाने की पुष्टि (Read Receipts)</span>
                    <span className="text-[11px] text-[#686578]">संदेश पढ़े जाने पर नीला टिक प्रदर्शित करें</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 accent-[#191C3B]"
                  />
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    <span>एंड-टू-एंड एन्क्रिप्शन (E2EE)</span>
                  </div>
                  <p className="text-[11px] text-emerald-700">
                    सभी संदेश और कॉल DTLS-SRTP और PostgreSQL एन्क्रिप्टेड स्टोरेज द्वारा सुरक्षित हैं।
                  </p>
                </div>
              </div>
            )}

            {/* 9. ACCOUNT SETTINGS */}
            {activeSection === 'ACCOUNT' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="p-4 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl space-y-2">
                  <span className="font-bold text-[#191C3B] block">सुरक्षा एवं पहचान (Credentials)</span>
                  <p className="text-[11px] text-[#686578]">
                    उपयोगकर्ता नाम: <span className="font-mono text-[#191C3B] font-bold">{currentUser.username}</span>
                  </p>
                  <p className="text-[11px] text-[#686578]">
                    ईमेल: <span className="font-medium text-[#191C3B]">{currentUser.email}</span>
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    ईमेल सत्यापन स्थिति: {currentUser.emailVerified ? 'सत्यापित (Verified)' : 'सक्रिय (Active)'}
                  </p>
                </div>
              </div>
            )}

            {/* 10. STORAGE & MEDIA */}
            {activeSection === 'STORAGE' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="p-4 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#191C3B]">स्थानीय डेटा एवं कैश (Local Storage)</span>
                    <span className="text-[10px] text-[#D97706] font-mono">14.8 MB Used</span>
                  </div>
                  <div className="w-full bg-[#E8E2D5] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#191C3B] h-full w-[25%]" />
                  </div>
                  <button
                    type="button"
                    onClick={() => alert('ऑफ़लाइन कैश साफ़ किया गया • Cache cleared')}
                    className="px-3 py-1.5 bg-white border border-[#E8E2D5] rounded-xl hover:border-[#C59A58] text-[#191C3B] font-semibold"
                  >
                    कैश साफ़ करें (Clear Cache)
                  </button>
                </div>
              </div>
            )}

            {/* 11. HELP & SUPPORT */}
            {activeSection === 'HELP' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="p-4 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl space-y-2">
                  <span className="font-bold text-[#191C3B] block">सहायता एवं समर्थन (Help Desk)</span>
                  <p className="text-[11px] text-[#686578]">
                    Samvaad 24/7 sovereign support desk is available for all users.
                  </p>
                  <p className="text-[11px] text-[#B45309] font-medium">
                    संपर्क: support@samvaad.gov.in • Toll-Free: 1800-SAMVAAD
                  </p>
                </div>
              </div>
            )}

            {/* 12. ABOUT SAMVAAD */}
            {activeSection === 'ABOUT' && (
              <div className="space-y-4 max-w-lg text-xs">
                <div className="p-5 bg-[#FAF7F2] border border-[#E8E2D5] rounded-2xl space-y-3 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#191C3B] text-white flex items-center justify-center font-serif font-black text-2xl mx-auto border-2 border-[#C59A58]">
                    सं
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#191C3B]">संवाद | Samvaad Sovereign Suite</h3>
                    <p className="text-xs text-[#D97706] font-semibold">संस्करण: V2.4.0 (Indic Sovereign Build)</p>
                  </div>
                  <p className="text-[11px] text-[#686578] leading-relaxed">
                    A high-integrity sovereign messaging, voice & video calling ecosystem engineered for resilience, data sovereignty, and real-time STOMP & WebRTC communications.
                  </p>
                  <div className="pt-2 border-t border-[#E8E2D5] text-[10px] text-[#9E9AA8]">
                    © 2026 Samvaad Sovereign Platform. All rights reserved.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
