import React, { useState } from 'react';
import { Conversation, User } from '../types';
import {
  Shield,
  FileText,
  Image as ImageIcon,
  Music,
  Link2,
  Lock,
  Globe,
  ExternalLink,
  Download,
  X
} from 'lucide-react';

interface ContactDossierProps {
  conversation: Conversation;
  currentUser: User;
  onClose?: () => void;
}

export const ContactDossier: React.FC<ContactDossierProps> = ({
  conversation,
  currentUser,
  onClose,
}) => {
  const [activeVaultTab, setActiveVaultTab] = useState<'MEDIA' | 'DOCS' | 'AUDIO' | 'LINKS'>('MEDIA');

  const otherUser = conversation.members.find((m) => m.user.id !== currentUser.id)?.user;
  const displayName = conversation.type === 'GROUP'
    ? (conversation.title || 'सामूहिक वार्ता')
    : (otherUser?.displayName || otherUser?.username || 'वार्ताकार');

  const roleOrHandle = conversation.type === 'GROUP'
    ? `${conversation.members.length} सहभागी • Members`
    : `@${otherUser?.username || 'user'}`;

  return (
    <aside className="w-80 md:w-88 bg-white border-l border-[#E8E2D5] flex flex-col h-full overflow-y-auto z-10">
      {/* Dossier Header */}
      <div className="p-4 border-b border-[#E8E2D5] flex items-center justify-between bg-white">
        <div>
          <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
            संपर्क विवरण
          </span>
          <h3 className="text-sm font-bold text-[#191C3B] tracking-tight">
            DOSSIER & PROFILE
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#FAF7F2] text-[#686578] flex items-center justify-center transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* User Hero Banner */}
      <div className="p-6 flex flex-col items-center text-center border-b border-[#E8E2D5] bg-[#FAF7F2]/50">
        <div className="relative mb-3">
          <div className="w-20 h-20 rounded-3xl bg-[#191C3B] text-white flex items-center justify-center text-2xl font-serif font-black shadow-md shadow-[#191C3B]/10 border-2 border-[#C59A58]">
            {displayName.charAt(0).toUpperCase()}
          </div>
          {otherUser?.isOnline && (
            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-[#10B981] border-2 border-white shadow-xs" />
          )}
        </div>

        <h4 className="text-base font-bold text-[#191C3B]">{displayName}</h4>
        <p className="text-xs text-[#686578] mt-0.5">{roleOrHandle}</p>

        {/* Security / Verification Badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FDF8EE] border border-[#EAD9BE] text-[#B45309] text-[10px] font-semibold">
          <Shield className="w-3 h-3 text-[#D97706]" />
          <span>सत्यापित पहचान • Verified Citizen ID</span>
        </div>
      </div>

      {/* Security Protocol Specs Card */}
      <div className="p-4 border-b border-[#E8E2D5]">
        <h5 className="text-[10px] font-bold text-[#686578] uppercase tracking-wider mb-2.5">
          सुरक्षा संलेख • Security Protocol
        </h5>
        <div className="bg-[#FAF7F2] p-3 rounded-2xl border border-[#E8E2D5] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#686578]">कूटलेखन (Encryption)</span>
            <span className="font-semibold text-[#10B981] flex items-center gap-1">
              <Lock className="w-3 h-3" /> E2EE Active
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#686578]">डेटा संप्रभुता (Sovereignty)</span>
            <span className="font-semibold text-[#191C3B]">IN-BOM-01</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#686578]">सत्र कुंजी (Session Hash)</span>
            <span className="font-mono text-[10px] text-[#C59A58]">#98A2..F4</span>
          </div>
        </div>
      </div>

      {/* Language Preferences */}
      <div className="p-4 border-b border-[#E8E2D5]">
        <div className="flex items-center justify-between mb-2">
          <h5 className="text-[10px] font-bold text-[#686578] uppercase tracking-wider">
            भाषा एवं लिपि • Preferred Script
          </h5>
          <Globe className="w-3.5 h-3.5 text-[#D97706]" />
        </div>
        <div className="flex items-center justify-between p-2.5 bg-[#FAF7F2] rounded-xl border border-[#E8E2D5] text-xs">
          <span className="font-medium text-[#191C3B]">हिन्दी (Devanagari)</span>
          <span className="text-[10px] text-[#B45309] font-semibold bg-[#FDF8EE] px-2 py-0.5 rounded border border-[#EAD9BE]">
            Auto-Translate ON
          </span>
        </div>
      </div>

      {/* Shared Vault Section: Media / Docs / Audio / Links */}
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-[10px] font-bold text-[#686578] uppercase tracking-wider">
            साझा सामग्री • Shared Vault
          </h5>
          <span className="text-[10px] text-[#9E9AA8]">14 Files</span>
        </div>

        {/* Vault Tabs */}
        <div className="flex border-b border-[#E8E2D5] mb-3 text-xs">
          {[
            { id: 'MEDIA', label: 'मीडिया (Media)', icon: ImageIcon },
            { id: 'DOCS', label: 'दस्तावेज (Docs)', icon: FileText },
            { id: 'AUDIO', label: 'ध्वनि (Audio)', icon: Music },
            { id: 'LINKS', label: 'कड़ियाँ (Links)', icon: Link2 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveVaultTab(tab.id as any)}
              className={`flex-1 pb-2 text-[11px] font-semibold border-b-2 transition-all ${
                activeVaultTab === tab.id
                  ? 'border-[#191C3B] text-[#191C3B]'
                  : 'border-transparent text-[#9E9AA8] hover:text-[#191C3B]'
              }`}
            >
              {tab.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Vault Tab Content */}
        {activeVaultTab === 'MEDIA' && (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="aspect-square bg-[#FAF7F2] border border-[#E8E2D5] rounded-xl flex items-center justify-center text-[#9E9AA8] hover:border-[#C59A58] transition-all cursor-pointer group relative overflow-hidden"
              >
                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform text-[#C59A58]" />
              </div>
            ))}
          </div>
        )}

        {activeVaultTab === 'DOCS' && (
          <div className="space-y-2">
            {[
              { name: 'संवाद_प्रोटोकॉल_v2.pdf', size: '2.4 MB', date: 'आज' },
              { name: 'प्रस्तावना_दस्तावेज.docx', size: '840 KB', date: 'कल' },
            ].map((doc, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-between text-xs hover:border-[#C59A58] transition-all"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-[#D97706] flex-shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-[#191C3B] truncate">{doc.name}</p>
                    <p className="text-[10px] text-[#9E9AA8]">{doc.size} • {doc.date}</p>
                  </div>
                </div>
                <button className="p-1 text-[#686578] hover:text-[#191C3B]" title="डाउनलोड करें">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeVaultTab === 'AUDIO' && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#10B981]" />
                <div>
                  <p className="font-medium text-[#191C3B]">वॉइस नोट 04:12</p>
                  <p className="text-[10px] text-[#9E9AA8]">128 kbps • Opus HD</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeVaultTab === 'LINKS' && (
          <div className="space-y-2">
            <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate">
                <Link2 className="w-4 h-4 text-[#191C3B]" />
                <div className="truncate">
                  <p className="font-medium text-[#191C3B] truncate">bhashini.gov.in</p>
                  <p className="text-[10px] text-[#9E9AA8]">National Language Mission</p>
                </div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-[#9E9AA8]" />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
