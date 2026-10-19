import React, { useState } from 'react';
import { Conversation, User } from '../types';
import {
  Shield,
  FileText,
  Image as ImageIcon,
  Lock,
  Globe,
  Download,
  X,
  Star,
  Award,
  CheckCircle2,
} from 'lucide-react';
import { api } from '../services/api';

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
  const [activeVaultTab, setActiveVaultTab] = useState<'MEDIA' | 'DOCS' | 'STARRED' | 'DIGILOCKER'>('MEDIA');
  const [starredMessages, setStarredMessages] = useState<any[]>([]);
  const [vaultDocs, setVaultDocs] = useState<any[]>([]);

  React.useEffect(() => {
    async function loadExtras() {
      try {
        const [starred, docs] = await Promise.all([
          api.get<any[]>('/users/me/starred-messages').catch(() => []),
          api.get<any[]>('/vault/documents').catch(() => []),
        ]);
        setStarredMessages(starred);
        setVaultDocs(docs);
      } catch (e) {
        console.error('Failed to load dossier extras', e);
      }
    }
    loadExtras();
  }, []);

  const otherUser = conversation.members.find((m) => m.user.id !== currentUser.id)?.user;
  const displayName = conversation.type === 'GROUP'
    ? (conversation.title || 'सामूहिक वार्ता')
    : (otherUser?.displayName || otherUser?.username || 'वार्ताकार');

  const roleOrHandle = conversation.type === 'GROUP'
    ? `${conversation.members.length} सहभागी • Members`
    : `@${otherUser?.username || 'user'}`;

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      <div
        className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 animate-in fade-in"
        onClick={onClose}
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 lg:static lg:w-80 xl:w-88 bg-white border-l border-[#E8E2D5] flex flex-col h-full overflow-y-auto shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-200">
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

        {/* Vault Tabs: Media, Starred, DigiLocker, Docs */}
        <div className="flex border-b border-[#E8E2D5] mb-3 text-xs overflow-x-auto no-scrollbar">
          {[
            { id: 'MEDIA', label: 'मीडिया (Media)', icon: ImageIcon },
            { id: 'STARRED', label: 'चिह्नित (Starred)', icon: Star },
            { id: 'DIGILOCKER', label: 'वॉल्ट (DigiLocker)', icon: Award },
            { id: 'DOCS', label: 'दस्तावेज (Docs)', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveVaultTab(tab.id as any)}
              className={`flex-1 pb-2 text-[11px] font-semibold border-b-2 whitespace-nowrap px-1 transition-all flex items-center justify-center gap-1 ${
                activeVaultTab === tab.id
                  ? 'border-[#191C3B] text-[#191C3B]'
                  : 'border-transparent text-[#9E9AA8] hover:text-[#191C3B]'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              <span>{tab.label.split(' ')[0]}</span>
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

        {/* Starred Messages View */}
        {activeVaultTab === 'STARRED' && (
          <div className="space-y-2">
            {starredMessages.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                <Star className="w-6 h-6 mx-auto mb-1 opacity-40" />
                <p>कोई चिह्नित संदेश नहीं</p>
                <p className="text-[10px]">No starred messages saved yet</p>
              </div>
            ) : (
              starredMessages.map((sm, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#C59A58] font-bold">
                    <span>{sm.senderName || 'वार्ताकार'}</span>
                    <Star className="w-3 h-3 fill-[#D97706] text-[#D97706]" />
                  </div>
                  <p className="text-[#191C3B] line-clamp-2">{sm.content}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* DigiLocker Sovereign Vault Documents View */}
        {activeVaultTab === 'DIGILOCKER' && (
          <div className="space-y-2.5">
            <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[10px] text-amber-900 flex items-center gap-1.5 font-medium">
              <Award className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
              <span>डिजीलॉकर प्रमाणित सॉवरेन वॉल्ट (DigiLocker E2EE)</span>
            </div>

            {vaultDocs.map((doc, idx) => (
              <div key={idx} className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-xs space-y-1 hover:border-[#C59A58] transition-all">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#191C3B] truncate">{doc.docName}</span>
                  {doc.isVerified && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      सत्यापित
                    </span>
                  )}
                </div>
                <p className="font-mono text-[10px] text-gray-500">{doc.docNumber}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-gray-400">
                  <span>{doc.issuer}</span>
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[#C59A58] hover:underline font-semibold flex items-center gap-0.5">
                    <Download className="w-3 h-3" /> खोलें
                  </a>
                </div>
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
      </div>
    </aside>
    </>
  );
};
