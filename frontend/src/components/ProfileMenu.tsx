import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User } from '../types';
import { SettingsSection } from './SettingsModal';
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
  ChevronRight
} from 'lucide-react';

interface ProfileMenuProps {
  currentUser: User;
  onOpenSection: (section: SettingsSection) => void;
  onLogout: () => void;
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  currentUser,
  onOpenSection,
  onLogout,
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const menuItems: Array<{
    id: SettingsSection;
    label: string;
    icon: React.ReactNode;
    color?: string;
  }> = [
    { id: 'MY_PROFILE', label: t('myProfile') || 'My Profile', icon: <UserIcon className="w-4 h-4 text-[#C59A58]" /> },
    { id: 'CHANGE_AVATAR', label: t('changeProfilePic') || 'Change Profile Picture', icon: <Image className="w-4 h-4 text-[#686578]" /> },
    { id: 'SET_STATUS', label: t('setStatus') || 'Set Status', icon: <Activity className="w-4 h-4 text-[#10B981]" /> },
    { id: 'ACCOUNT', label: t('accountSettings') || 'Account Settings', icon: <Settings className="w-4 h-4 text-[#686578]" /> },
    { id: 'PRIVACY', label: t('privacySecurity') || 'Privacy and Security', icon: <Shield className="w-4 h-4 text-[#686578]" /> },
    { id: 'NOTIFICATIONS', label: t('notifications') || 'Notifications', icon: <Bell className="w-4 h-4 text-[#686578]" /> },
    { id: 'LANGUAGE', label: t('language') || 'Language', icon: <Languages className="w-4 h-4 text-[#D97706]" /> },
    { id: 'APPEARANCE', label: t('appearanceThemes') || 'Appearance and Themes', icon: <Palette className="w-4 h-4 text-[#686578]" /> },
    { id: 'STORAGE', label: t('storageMedia') || 'Storage and Media', icon: <HardDrive className="w-4 h-4 text-[#686578]" /> },
    { id: 'HELP', label: t('helpSupport') || 'Help and Support', icon: <HelpCircle className="w-4 h-4 text-[#686578]" /> },
    { id: 'ABOUT', label: t('aboutSamvaad') || 'About Samvaad', icon: <Info className="w-4 h-4 text-[#686578]" /> },
  ];

  const handleSelect = (section: SettingsSection) => {
    setIsOpen(false);
    onOpenSection(section);
  };

  const displayName = currentUser.displayName || currentUser.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      {/* User profile avatar trigger placed at the bottom-left of the sidebar */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative group focus:outline-none focus:ring-2 focus:ring-[#C59A58] rounded-2xl"
        title={`${displayName} • प्रोफ़ाइल एवं सेटिंग्स`}
      >
        {currentUser.avatarUrl ? (
          <img
            src={currentUser.avatarUrl}
            alt={displayName}
            className="w-10 h-10 md:w-11 md:h-11 rounded-2xl object-cover border-2 border-[#C59A58] shadow-md group-hover:scale-105 transition-all"
          />
        ) : (
          <div className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-[#191C3B] text-white font-serif font-black text-base flex items-center justify-center border-2 border-[#C59A58] shadow-md group-hover:scale-105 transition-all">
            {initial}
          </div>
        )}

        {/* Live indicator pip */}
        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-xs" />
      </button>

      {/* Profile Dropdown Popup (pops upward and to the right from the bottom-left sidebar) */}
      {isOpen && (
        <div className="absolute left-14 bottom-0 w-72 bg-white border border-[#E8E2D5] rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
          {/* Header Card with User info */}
          <div className="p-4 bg-[#FAF7F2] border-b border-[#E8E2D5]">
            <div className="flex items-center gap-3">
              {currentUser.avatarUrl ? (
                <img
                  src={currentUser.avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-xl object-cover border border-[#C59A58]"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#191C3B] text-[#FAF7F2] font-serif font-bold text-sm flex items-center justify-center border border-[#C59A58]">
                  {initial}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#191C3B] truncate">{displayName}</p>
                <p className="text-[11px] text-[#686578] truncate">@{currentUser.username}</p>
                <p className="text-[10px] text-[#D97706] truncate font-medium mt-0.5">
                  {currentUser.statusMessage || 'सक्रिय • Available'}
                </p>
              </div>
            </div>
          </div>

          {/* 12 Required Options Scroll List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-0.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-[#191C3B] hover:bg-[#FAF7F2] transition-colors group"
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-[#9E9AA8] group-hover:text-[#191C3B] transition-colors" />
              </button>
            ))}
          </div>

          {/* 13th Option: Sign Out */}
          <div className="p-2 border-t border-[#E8E2D5] bg-[#FAF7F2]/50">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span>{t('signOut') || 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
