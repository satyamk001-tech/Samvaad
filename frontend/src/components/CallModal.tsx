import React, { useEffect, useRef, useState } from 'react';
import { Call, User } from '../types';
import { stompService } from '../services/stomp';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Shield,
  MessageSquare,
  Sparkles,
  Subtitles,
} from 'lucide-react';

interface CallModalProps {
  call: Call;
  currentUser: User;
  onEndCall: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  currentUser,
  onEndCall,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const callDuration = '02:14';

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const isCaller = call.caller.id === currentUser.id;
  const peerUser = isCaller ? call.receiver : call.caller;
  const peerName = peerUser.displayName || peerUser.username;

  useEffect(() => {
    let candidateQueue: RTCIceCandidateInit[] = [];

    async function setupWebRTC() {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      });
      peerConnectionRef.current = pc;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          stompService.send('/app/call.signal', {
            callId: call.id,
            targetUserId: peerUser.id,
            type: 'ICE_CANDIDATE',
            data: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
          });
        }
      };

      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: call.type === 'VIDEO',
        });
        localStreamRef.current = stream;

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        if (isCaller) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          stompService.send('/app/call.signal', {
            callId: call.id,
            targetUserId: peerUser.id,
            type: 'OFFER',
            data: offer.sdp,
          });
        }
      } catch (err) {
        console.warn('Could not access media devices', err);
      }
    }

    setupWebRTC();

    const handleSignal = async (e: any) => {
      const signal = e.detail?.data;
      if (!signal || signal.callId !== call.id) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (signal.type === 'OFFER' && !isCaller) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.data }));
          while (candidateQueue.length > 0) {
            const cand = candidateQueue.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          stompService.send('/app/call.signal', {
            callId: call.id,
            targetUserId: peerUser.id,
            type: 'ANSWER',
            data: answer.sdp,
          });
        } else if (signal.type === 'ANSWER' && isCaller) {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.data }));
          while (candidateQueue.length > 0) {
            const cand = candidateQueue.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } else if (signal.type === 'ICE_CANDIDATE' && signal.data) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.data));
          } else {
            candidateQueue.push(signal.data);
          }
        } else if (signal.type === 'END') {
          cleanupAndClose();
        }
      } catch (signalErr) {
        console.error('Signaling error', signalErr);
      }
    };

    window.addEventListener('viora:private_message', handleSignal);

    return () => {
      window.removeEventListener('viora:private_message', handleSignal);
      cleanupAndClose();
    };
  }, [call.id, isCaller, peerUser.id, call.type]);

  const cleanupAndClose = () => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    peerConnectionRef.current?.close();
    onEndCall();
  };

  const handleEndCallClick = () => {
    stompService.send('/app/call.signal', {
      callId: call.id,
      targetUserId: peerUser.id,
      type: 'END',
      data: null,
    });
    cleanupAndClose();
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0F1123]/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50">
      <div className="bg-[#191C3B] border border-[#C59A58]/30 rounded-3xl w-full max-w-5xl h-[85vh] overflow-hidden shadow-2xl flex flex-col text-white">
        {/* Top Telemetry & Status Bar */}
        <header className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C59A58]/20 border border-[#C59A58] flex items-center justify-center text-white font-serif font-black text-sm">
              सं
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{peerName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  VoLTE HD • 24ms
                </span>
              </div>
              <p className="text-[10px] text-white/60">
                {call.type === 'VIDEO' ? 'द्विपक्षीय वीडियो संवाद (Video Conference)' : 'सुरक्षित ध्वनि सत्र (Encrypted Audio)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>{callDuration}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[10px] text-[#C59A58] bg-[#C59A58]/10 px-2.5 py-1 rounded-lg border border-[#C59A58]/30">
              <Shield className="w-3 h-3" />
              <span>IN-STUN-NODE</span>
            </div>
          </div>
        </header>

        {/* Main Stage: Video Grid + Bhashini AI Subtitle & Live Translation Rail */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
          {/* Active Speaker Feed */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
            {call.type === 'VIDEO' ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Local Picture-in-Picture */}
                <div className="absolute bottom-4 right-4 w-36 md:w-48 aspect-video bg-neutral-900 rounded-2xl overflow-hidden border-2 border-[#C59A58]/60 shadow-xl">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-2 text-[9px] font-semibold text-white/90 bg-black/40 px-1.5 py-0.5 rounded">
                    आप (You)
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 rounded-3xl bg-[#FAF7F2] text-[#191C3B] font-serif font-black text-4xl flex items-center justify-center border-4 border-[#C59A58] shadow-2xl">
                  {peerName.charAt(0).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-white">{peerName}</p>
                  <p className="text-xs text-[#C59A58]">सुरक्षित ध्वनि संवाद सत्र चालू है</p>
                </div>
              </div>
            )}

            {/* Live Subtitle Strip (Screen 4: श्रुति एवं अनुवाद) */}
            {subtitlesEnabled && (
              <div className="absolute bottom-4 left-4 right-4 md:right-56 bg-black/75 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-xl flex items-start gap-3 animate-in fade-in">
                <div className="w-7 h-7 rounded-lg bg-[#C59A58] text-[#191C3B] flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1 text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-[#C59A58]">भाषिणी लाइव अनुवाद (Hindi ➔ English):</span>
                    <span className="text-[9px] text-white/50">Confidence 98%</span>
                  </div>
                  <p className="text-white/90 font-medium">
                    "नमस्ते, क्या आप सम्मेलन के मसौदे को देख पा रहे हैं?"
                  </p>
                  <p className="text-[#C59A58]/90 text-[11px] italic mt-0.5">
                    "Hello, are you able to review the conference draft?"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right In-Call Panel: Telemetry & Live Room Chat */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-white/10 bg-[#141630] flex flex-col">
            <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs font-bold">
              <span className="text-[#C59A58] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" /> सत्र चैट (Room Chat)
              </span>
              <span className="text-[10px] text-white/50">E2EE Protected</span>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-[#C59A58] block">System</span>
                <p className="text-white/80 text-[11px]">सुरक्षित सत्र स्थापित हुआ (AES-256 bit WebRTC DTLS-SRTP)</p>
              </div>
              <div className="bg-white/5 p-2 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-white block">{peerName}</span>
                <p className="text-white/80 text-[11px]">ध्वनि स्पष्ट आ रही है।</p>
              </div>
            </div>

            {/* Quick in-call input */}
            <div className="p-3 border-t border-white/10">
              <input
                type="text"
                placeholder="सत्र में संदेश भेजें..."
                className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-[#C59A58]"
              />
            </div>
          </div>
        </div>

        {/* Bottom Control Dock (Screen 4 layout: Mute, Video, Audio, CC, Share, End) */}
        <footer className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-center gap-3">
          <button
            onClick={toggleMute}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              isMuted ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isMuted ? 'अनम्यूट करें' : 'म्यूट करें'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {call.type === 'VIDEO' && (
            <button
              onClick={toggleVideo}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                isVideoOff ? 'bg-red-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isVideoOff ? 'कैमरा चालू करें' : 'कैमरा बंद करें'}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setSubtitlesEnabled(!subtitlesEnabled)}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              subtitlesEnabled
                ? 'bg-[#C59A58] text-[#191C3B]'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title="लाइव उपशीर्षक एवं अनुवाद (Bhashini CC)"
          >
            <Subtitles className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleEndCallClick}
            className="w-12 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all font-bold"
            title="कॉल समाप्त करें"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </div>
  );
};
