import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Call, User } from '../types';
import { stompService } from '../services/stomp';
import { api } from '../services/api';
import { soundService } from '../services/soundService';
import {
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Minimize2,
  Maximize2,
  Sparkles,
  Subtitles,
  ScreenShare,
  Share2,
  Check,
} from 'lucide-react';

/**
 * Creates an animated synthetic media stream with Samvaad sovereign branding
 * when physical camera or microphone is locked (e.g. testing in two tabs on same machine)
 */
function createSyntheticMediaStream(displayName: string, isVideo: boolean): MediaStream {
  const stream = new MediaStream();

  // Synthetic Audio: comfort tone to keep WebRTC audio channel alive
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const audioCtx = new AudioCtx();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(() => {});
      }
      const osc = audioCtx.createOscillator();
      const dst = audioCtx.createMediaStreamDestination();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.001; // comfort carrier
      osc.connect(gain);
      gain.connect(dst);
      osc.start();
      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }
  } catch (e) {
    console.warn('Could not generate synthetic audio track', e);
  }

  // Synthetic Video: animated sovereign canvas stream
  if (isVideo) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        let frame = 0;
        const initial = (displayName || 'S').charAt(0).toUpperCase();
        const draw = () => {
          frame++;
          // Sovereign gradient background
          const grad = ctx.createLinearGradient(0, 0, 640, 480);
          grad.addColorStop(0, '#191C3B');
          grad.addColorStop(1, '#252238');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 480);

          // Subtle pulsating aura
          const pulse = Math.sin(frame * 0.06) * 10;
          ctx.beginPath();
          ctx.arc(320, 210, 65 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(197, 154, 88, 0.18)';
          ctx.fill();

          // Circle frame
          ctx.beginPath();
          ctx.arc(320, 210, 60, 0, Math.PI * 2);
          ctx.fillStyle = '#101226';
          ctx.strokeStyle = '#C59A58';
          ctx.lineWidth = 3;
          ctx.fill();
          ctx.stroke();

          // User Initial
          ctx.font = 'bold 50px serif';
          ctx.fillStyle = '#FAF7F2';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(initial, 320, 212);

          // User Name
          ctx.font = 'bold 18px sans-serif';
          ctx.fillStyle = '#FAF7F2';
          ctx.fillText(displayName, 320, 310);

          // Subtitle
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#C59A58';
          ctx.fillText('संवाद वर्चुअल वीडियो • Samvaad Camera', 320, 338);
        };

        draw();
        const animInterval = setInterval(draw, 40); // 25 fps uninterrupted even when tab is in background

        const canvasStream = canvas.captureStream(25);
        const videoTrack = canvasStream.getVideoTracks()[0];
        if (videoTrack) {
          const origStop = videoTrack.stop.bind(videoTrack);
          videoTrack.stop = () => {
            clearInterval(animInterval);
            origStop();
          };
          stream.addTrack(videoTrack);
        }
      }
    } catch (e) {
      console.warn('Could not generate synthetic video track', e);
    }
  }

  return stream;
}

interface CallModalProps {
  call: Call;
  currentUser: User;
  onEndCall: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({
  call,
  currentUser,
  onEndCall,
  isMinimized,
  onToggleMinimize,
}) => {
  const { t } = useTranslation();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>(t('outgoingCall') || 'कॉल किया जा रहा है... • Calling...');
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callLinkCopied, setCallLinkCopied] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const isCaller = call.caller.id === currentUser.id;
  const peerUser = isCaller ? call.receiver : call.caller;
  const peerName = peerUser.displayName || peerUser.username;
  const peerInitial = peerName.charAt(0).toUpperCase();

  // Callback ref for remote video element (mounts in either minimized or full view)
  const setRemoteVideoEl = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // Callback ref for remote audio element
  const setRemoteAudioEl = useCallback((el: HTMLAudioElement | null) => {
    remoteAudioRef.current = el;
    if (el && remoteStreamRef.current) {
      el.srcObject = remoteStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // macOS Safari Audio Unblocker: ensures audio playback starts on interaction
  const ensureAudioPlayback = useCallback(() => {
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.play().catch(() => {});
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (hasRemoteStream) {
      ensureAudioPlayback();
      const unblockOnInteraction = () => {
        ensureAudioPlayback();
        window.removeEventListener('click', unblockOnInteraction);
        window.removeEventListener('touchstart', unblockOnInteraction);
      };
      window.addEventListener('click', unblockOnInteraction, { once: true });
      window.addEventListener('touchstart', unblockOnInteraction, { once: true });
      return () => {
        window.removeEventListener('click', unblockOnInteraction);
        window.removeEventListener('touchstart', unblockOnInteraction);
      };
    }
  }, [hasRemoteStream, ensureAudioPlayback]);

  // Callback ref for local video element
  const setLocalVideoEl = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && localStreamRef.current) {
      el.srcObject = localStreamRef.current;
      el.play().catch(() => {});
    }
  }, []);

  // Synchronize remote media stream to video and audio elements
  useEffect(() => {
    if (remoteStream) {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(() => {});
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [remoteStream]);

  // Synchronize local media stream to local video element
  useEffect(() => {
    if (localStream && localVideoRef.current && !isVideoOff) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, isVideoOff]);

  // Duration timer: runs only after the call is actively connected
  useEffect(() => {
    if (!isConnected) return;
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const candidateQueue: RTCIceCandidateInit[] = [];
    let isTerminated = false;

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' },
        { urls: 'stun:global.stun.twilio.com:3478' },
        { urls: 'stun:stun.nextcloud.com:443' },
        { urls: 'stun:relay.metered.ca:80' },
        {
          urls: [
            'turn:turn.evan-brass.net:3478?transport=udp',
            'turn:turn.evan-brass.net:3478?transport=tcp',
            'turns:turn.evan-brass.net:443?transport=tcp',
          ],
          username: 'user',
          credential: 'password',
        },
      ],
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    peerConnectionRef.current = pc;

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE Connection State:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        soundService.stopOutgoingRingback();
        setIsConnected(true);
        setConnectionStatus('जुड़ा हुआ • Connected');
        stompService.send('/app/call.signal', {
          callId: call.id,
          targetUserId: peerUser.id,
          type: 'CONNECTED',
          data: null,
        });
      } else if (pc.iceConnectionState === 'failed') {
        console.warn('[WebRTC] ICE state failed, attempting restart...');
        setConnectionStatus('पुनः जुड़ने का प्रयास... • Reconnecting via Relay...');
        if (isCaller && pc.signalingState === 'stable') {
          try {
            pc.restartIce();
            pc.createOffer({ iceRestart: true }).then(async (offer) => {
              await pc.setLocalDescription(offer);
              stompService.send('/app/call.signal', {
                callId: call.id,
                targetUserId: peerUser.id,
                type: 'OFFER',
                data: offer.sdp,
              });
            }).catch(console.error);
          } catch (e) {
            console.error('[WebRTC] ICE restart error:', e);
          }
        }
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        soundService.stopOutgoingRingback();
        setIsConnected(true);
        setConnectionStatus('जुड़ा हुआ • Connected');
      } else if (pc.connectionState === 'connecting') {
        setConnectionStatus('जुड़ रहा है... • Connecting...');
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const cand = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
        stompService.send('/app/call.signal', {
          callId: call.id,
          targetUserId: peerUser.id,
          type: 'ICE_CANDIDATE',
          data: cand,
        });
      }
    };

    pc.ontrack = (event) => {
      let trackStream: MediaStream;
      if (event.streams && event.streams[0]) {
        trackStream = event.streams[0];
      } else {
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        if (!remoteStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
          remoteStreamRef.current.addTrack(event.track);
        }
        trackStream = remoteStreamRef.current;
      }

      // Create a fresh MediaStream instance so React state and video elements re-evaluate immediately
      const freshStream = new MediaStream(trackStream.getTracks());
      remoteStreamRef.current = freshStream;
      setRemoteStream(freshStream);
      setHasRemoteStream(true);
      setIsConnected(true);
      soundService.stopOutgoingRingback();
      setConnectionStatus('जुड़ा हुआ • Connected');

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = freshStream;
        remoteAudioRef.current.play().catch(() => {});
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = freshStream;
        remoteVideoRef.current.play().catch(() => {});
      }

      // macOS Safari direct Web Audio routing to guarantee audio playback
      if (event.track.kind === 'audio') {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') {
              ctx.resume().catch(() => {});
            }
            const src = ctx.createMediaStreamSource(new MediaStream([event.track]));
            src.connect(ctx.destination);
          }
        } catch (ctxErr) {
          console.warn('[WebRTC] Web Audio direct routing notice:', ctxErr);
        }
      }
    };

    // Prepare local media and attach tracks to RTCPeerConnection
    const mediaReadyPromise = (async () => {
      try {
        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: call.type === 'VIDEO' ? {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              facingMode: { ideal: 'user' },
            } : false,
          });
        } catch (mediaErr) {
          console.warn('Initial media access notice, attempting relaxed fallback:', mediaErr);
          try {
            // Relaxed fallback for macOS Safari & desktop webcams without exact constraints
            stream = await navigator.mediaDevices.getUserMedia({
              audio: true,
              video: call.type === 'VIDEO',
            });
          } catch (relaxedErr) {
            console.warn('Relaxed media access also failed, using synthetic fallback:', relaxedErr);
            if (call.type === 'VIDEO') {
              try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                const syntheticStream = createSyntheticMediaStream(currentUser.displayName || currentUser.username, true);
                const videoTrack = syntheticStream.getVideoTracks()[0];
                const audioTrack = audioStream.getAudioTracks()[0];
                stream = new MediaStream();
                if (videoTrack) stream.addTrack(videoTrack);
                if (audioTrack) stream.addTrack(audioTrack);
              } catch (fallbackErr) {
                console.warn('Audio fallback also unavailable, using synthetic stream:', fallbackErr);
                stream = createSyntheticMediaStream(currentUser.displayName || currentUser.username, true);
              }
            } else {
              try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              } catch (fallbackAudioErr) {
                console.warn('Physical audio unavailable, using synthetic comfort stream:', fallbackAudioErr);
                stream = createSyntheticMediaStream(currentUser.displayName || currentUser.username, false);
              }
            }
          }
        }

        if (stream && !isTerminated) {
          localStreamRef.current = stream;
          setLocalStream(stream);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
          stream.getTracks().forEach((track) => {
            try {
              pc.addTrack(track, stream!);
            } catch (addTrackErr) {
              console.warn('Track already added or could not add:', addTrackErr);
            }
          });
        }
      } catch (err) {
        console.warn('Media setup notice:', err);
      }
    })();

    if (!isCaller) {
      // Receiver: emit ACCEPT signal immediately so caller can generate offer without waiting
      setConnectionStatus('स्वीकार किया जा रहा है • Connecting...');
      api.post(`/calls/${call.id}/accept`).catch(() => {});
      stompService.send('/app/call.signal', {
        callId: call.id,
        targetUserId: peerUser.id,
        type: 'ACCEPT',
        data: null,
      });
    } else {
      setConnectionStatus(t('outgoingCall') || 'कॉल किया जा रहा है... • Calling...');
      soundService.startOutgoingRingback();

      setTimeout(() => {
        if (!isTerminated) {
          setConnectionStatus((prev) =>
            prev.includes('Calling') || prev.includes('कॉल किया जा रहा')
              ? 'रिंग हो रहा है... • Ringing...'
              : prev
          );
        }
      }, 1500);
    }

    const handleSignal = async (e: any) => {
      if (e.detail?.eventType !== 'CALL_SIGNAL') return;
      const signal = e.detail?.data;
      if (!signal || signal.callId !== call.id) return;

      const activePc = peerConnectionRef.current;
      if (!activePc) return;

      try {
        if (signal.type === 'RINGING' && isCaller) {
          setConnectionStatus('रिंग हो रहा है... • Ringing...');
        } else if (signal.type === 'ACCEPT' && isCaller) {
          soundService.stopOutgoingRingback();
          setConnectionStatus('स्वीकार किया गया • Connecting...');
          await mediaReadyPromise;

          if (activePc.signalingState !== 'stable') {
            console.warn('Signaling state is not stable, skipping duplicate offer generation');
            return;
          }

          const offer = await activePc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: call.type === 'VIDEO',
          });
          await activePc.setLocalDescription(offer);

          stompService.send('/app/call.signal', {
            callId: call.id,
            targetUserId: peerUser.id,
            type: 'OFFER',
            data: offer.sdp,
          });
        } else if (signal.type === 'OFFER' && !isCaller) {
          setConnectionStatus('जुड़ रहा है... • Connecting...');
          await mediaReadyPromise;

          if (activePc.signalingState !== 'stable') {
            try {
              await (activePc as any).setLocalDescription({ type: 'rollback' });
            } catch (rbErr) {
              console.warn('[WebRTC] Rollback ignored on this browser:', rbErr);
            }
          }

          await activePc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.data }));

          // Modern Unified Plan createAnswer automatically negotiates transceivers without legacy plan-b flags
          const answer = await activePc.createAnswer();
          await activePc.setLocalDescription(answer);

          stompService.send('/app/call.signal', {
            callId: call.id,
            targetUserId: peerUser.id,
            type: 'ANSWER',
            data: answer.sdp,
          });

          // Drain queued candidates AFTER local description answer is set
          while (candidateQueue.length > 0) {
            const cand = candidateQueue.shift();
            if (cand && (cand.candidate || (cand as any).sdpMid !== undefined || (cand as any).sdpMLineIndex !== undefined)) {
              try {
                await activePc.addIceCandidate(cand);
              } catch (candErr) {
                console.warn('Could not add queued ice candidate:', candErr);
              }
            }
          }

          setIsConnected(true);
          setConnectionStatus('जुड़ा हुआ • Connected');
        } else if (signal.type === 'ANSWER' && isCaller) {
          soundService.stopOutgoingRingback();
          setIsConnected(true);

          if (activePc.signalingState === 'have-local-offer') {
            await activePc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.data }));

            while (candidateQueue.length > 0) {
              const cand = candidateQueue.shift();
              if (cand && (cand.candidate || (cand as any).sdpMid !== undefined || (cand as any).sdpMLineIndex !== undefined)) {
                try {
                  await activePc.addIceCandidate(cand);
                } catch (candErr) {
                  console.warn('Could not add queued ice candidate:', candErr);
                }
              }
            }
          }
          setConnectionStatus('जुड़ा हुआ • Connected');
        } else if (signal.type === 'ICE_CANDIDATE' && signal.data) {
          const cand = signal.data;
          if (cand && (cand.candidate || (cand as any).sdpMid !== undefined || (cand as any).sdpMLineIndex !== undefined)) {
            if (activePc.remoteDescription && activePc.remoteDescription.type) {
              try {
                await activePc.addIceCandidate(cand);
              } catch (candErr) {
                console.warn('Could not add ice candidate directly:', candErr);
              }
            } else {
              candidateQueue.push(cand);
            }
          }
        } else if (signal.type === 'CONNECTED') {
          soundService.stopOutgoingRingback();
          setIsConnected(true);
          setConnectionStatus('जुड़ा हुआ • Connected');
        } else if (signal.type === 'REJECT') {
          soundService.stopOutgoingRingback();
          soundService.playCallEndedTone();
          setConnectionStatus('कॉल अस्वीकार की गई • Call Declined');
          setTimeout(() => cleanupAndClose(), 1500);
        } else if (signal.type === 'END') {
          soundService.stopOutgoingRingback();
          soundService.playCallEndedTone();
          cleanupAndClose();
        }
      } catch (signalErr) {
        console.error('Signaling processing notice:', signalErr);
      }
    };

    window.addEventListener('samvaad:private_message', handleSignal);

    return () => {
      isTerminated = true;
      soundService.stopOutgoingRingback();
      window.removeEventListener('samvaad:private_message', handleSignal);
      cleanupAndClose();
    };
  }, [call.id, isCaller, peerUser.id, call.type]);

  const cleanupAndClose = () => {
    soundService.stopOutgoingRingback();
    soundService.stopIncomingRingtone();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    onEndCall();
  };

  const handleEndCallClick = () => {
    soundService.stopOutgoingRingback();
    soundService.stopIncomingRingtone();
    soundService.playCallEndedTone();
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
    } else {
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    } else {
      setIsVideoOff(!isVideoOff);
    }
  };

  const [floatingPos, setFloatingPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; origX: number; origY: number; moved: boolean } | null>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const currentX = floatingPos ? floatingPos.x : (window.innerWidth - 340);
    const currentY = floatingPos ? floatingPos.y : (window.innerHeight - 260);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: currentX,
      origY: currentY,
      moved: false,
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      dragStartRef.current.moved = true;
    }
    const targetWidth = call.type === 'VIDEO' ? 320 : 304;
    const targetHeight = call.type === 'VIDEO' ? 240 : 100;
    const newX = Math.max(10, Math.min(window.innerWidth - targetWidth - 10, dragStartRef.current.origX + dx));
    const newY = Math.max(10, Math.min(window.innerHeight - targetHeight - 10, dragStartRef.current.origY + dy));
    setFloatingPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartRef.current && !dragStartRef.current.moved) {
      onToggleMinimize();
    }
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }
        if (peerConnectionRef.current && localStreamRef.current) {
          const videoTrack = localStreamRef.current.getVideoTracks()[0];
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && videoTrack) {
            await sender.replaceTrack(videoTrack);
          }
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
        }
        setIsScreenSharing(false);
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        screenStreamRef.current = stream;
        const screenTrack = stream.getVideoTracks()[0];

        if (peerConnectionRef.current && screenTrack) {
          const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          }
        }

        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch(() => {});
        }

        screenTrack.onended = async () => {
          if (screenStreamRef.current) {
            screenStreamRef.current.getTracks().forEach((t) => t.stop());
            screenStreamRef.current = null;
          }
          if (peerConnectionRef.current && localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video');
            if (sender && videoTrack) {
              await sender.replaceTrack(videoTrack);
            }
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
              localVideoRef.current.play().catch(() => {});
            }
          }
          setIsScreenSharing(false);
        };
      }
    } catch (err) {
      console.warn('Screen share cancelled or unavailable', err);
      setIsScreenSharing(false);
    }
  };

  const copyCallLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://samvaad-wheat.vercel.app';
    const link = `${origin}/?call=${call.id}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCallLinkCopied(true);
    setTimeout(() => setCallLinkCopied(false), 2500);
  };

  // 1. FLOATING MINIMIZED CALL WINDOW (WhatsApp Picture-in-Picture Style)
  if (isMinimized) {
    if (call.type === 'VIDEO') {
      return (
        <>
          <audio
            ref={setRemoteAudioEl}
            autoPlay
            playsInline
            style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
          />
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{
              left: floatingPos ? `${floatingPos.x}px` : undefined,
              top: floatingPos ? `${floatingPos.y}px` : undefined,
              bottom: floatingPos ? undefined : '1.5rem',
              right: floatingPos ? undefined : '1.5rem',
            }}
            className="fixed z-50 w-80 bg-[#191C3B] border-2 border-[#C59A58] rounded-3xl shadow-2xl overflow-hidden text-white cursor-grab active:cursor-grabbing touch-none select-none animate-in fade-in slide-in-from-bottom-5 duration-200"
          >
          {/* Video Container Stage */}
          <div
            className="relative h-44 bg-black group flex items-center justify-center overflow-hidden"
            title="खींचकर स्थानांतरित करें अथवा क्लिक करके बड़ा करें • Drag or Tap to Maximize"
          >
            {hasRemoteStream ? (
              <video
                ref={setRemoteVideoEl}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {peerUser.avatarUrl ? (
                    <img
                      src={peerUser.avatarUrl}
                      alt={peerName}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-[#C59A58]"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#252238] text-[#FAF7F2] font-serif font-black text-2xl flex items-center justify-center border-2 border-[#C59A58]">
                      {peerInitial}
                    </div>
                  )}
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#191C3B] animate-pulse" />
                </div>
                <span className="text-[11px] font-semibold text-[#C59A58]">
                  {connectionStatus}
                </span>
              </div>
            )}

            {/* Small Local Camera Preview in corner */}
            {!isVideoOff && (
              <div className="absolute bottom-2 right-2 w-20 aspect-video rounded-xl overflow-hidden border border-white/70 shadow-lg bg-black/60">
                <video
                  ref={setLocalVideoEl}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Top Info Overlay */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between bg-black/50 backdrop-blur-xs px-2.5 py-1 rounded-xl">
              <span className="text-xs font-bold truncate max-w-[140px] text-white">
                {peerName}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#C59A58] font-bold">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
                <span>{isConnected ? formatDuration(secondsElapsed) : (connectionStatus.includes('Ringing') || connectionStatus.includes('रिंग') ? 'रिंगिंग...' : 'कॉलिंग...')}</span>
              </div>
            </div>
          </div>

          {/* Bottom WhatsApp Control Strip */}
          <div className="p-2.5 bg-[#101226] flex items-center justify-between border-t border-white/10">
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-xl text-xs transition-colors ${
                isMuted ? 'bg-red-500/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'अनम्यूट करें' : 'म्यूट करें'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={toggleVideo}
              className={`p-2 rounded-xl text-xs transition-colors ${
                isVideoOff ? 'bg-red-500/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isVideoOff ? 'कैमरा चालू करें' : 'कैमरा बंद करें'}
            >
              {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleMinimize}
              className="px-2.5 py-1.5 rounded-xl bg-[#C59A58]/20 hover:bg-[#C59A58]/30 text-[#C59A58] border border-[#C59A58]/40 flex items-center gap-1 text-[11px] font-bold"
              title="बड़ा करें • Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>बड़ा करें</span>
            </button>

            <button
              type="button"
              onClick={handleEndCallClick}
              className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="कॉल समाप्त करें • End Call"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
        </>
      );
    }

    // Minimized Voice Call (Compact WhatsApp PiP Widget)
    return (
      <>
        <audio
          ref={setRemoteAudioEl}
          autoPlay
          playsInline
          style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
        />
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            left: floatingPos ? `${floatingPos.x}px` : undefined,
            top: floatingPos ? `${floatingPos.y}px` : undefined,
            bottom: floatingPos ? undefined : '1.5rem',
            right: floatingPos ? undefined : '1.5rem',
          }}
          className="fixed z-50 w-76 bg-[#191C3B] border-2 border-[#C59A58] rounded-2xl shadow-2xl p-3 text-white cursor-grab active:cursor-grabbing touch-none select-none animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
        <div className="flex items-center gap-3">
          {/* Avatar with soundwave pulse */}
          <div className="relative flex-shrink-0 cursor-pointer" onClick={onToggleMinimize}>
            {peerUser.avatarUrl ? (
              <img
                src={peerUser.avatarUrl}
                alt={peerName}
                className="w-11 h-11 rounded-xl object-cover border-2 border-[#C59A58]"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#252238] text-white font-serif font-black text-lg flex items-center justify-center border-2 border-[#C59A58]">
                {peerInitial}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#191C3B] animate-pulse" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleMinimize}>
            <p className="text-xs font-bold text-white truncate">{peerName}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono text-[11px] text-[#C59A58] font-bold">
                {isConnected ? formatDuration(secondsElapsed) : (connectionStatus.includes('Ringing') || connectionStatus.includes('रिंग') ? 'रिंगिंग...' : 'कॉलिंग...')}
              </span>
              <span className="text-[10px] text-white/50">• ध्वनि कॉल</span>
            </div>
            {/* Animated soundwaves */}
            <div className="flex items-center gap-0.5 mt-1">
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="w-1 h-3.5 bg-emerald-400 rounded-full animate-pulse delay-75" />
              <span className="w-1 h-2 bg-emerald-400 rounded-full animate-pulse delay-150" />
              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse delay-100" />
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleMute}
              className={`p-2 rounded-xl text-xs transition-colors ${
                isMuted ? 'bg-red-500/80 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isMuted ? 'अनम्यूट करें' : 'म्यूट करें'}
            >
              {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#C59A58] transition-colors"
              title="बड़ा करें • Maximize Call"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleEndCallClick}
              className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors"
              title="कॉल समाप्त करें • Hang Up"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // 2. FULLSCREEN CALL SCREEN
  return (
    <>
      <audio
        ref={setRemoteAudioEl}
        autoPlay
        playsInline
        style={{ position: 'fixed', top: -9999, left: -9999, width: 1, height: 1, opacity: 0.01, pointerEvents: 'none' }}
      />
      <div
        onClick={ensureAudioPlayback}
        className="fixed inset-0 bg-[#0F1123]/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 z-50"
      >
      <div className="bg-[#191C3B] border border-[#C59A58]/30 rounded-3xl w-full max-w-4xl h-[85vh] overflow-hidden shadow-2xl flex flex-col text-white relative">
        {/* Top Header */}
        <header className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#C59A58]/20 border border-[#C59A58] flex items-center justify-center text-white font-serif font-black text-sm">
              सं
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">{peerName}</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40">
                  {connectionStatus}
                </span>
              </div>
              <p className="text-[10px] text-white/60">
                {call.type === 'VIDEO'
                  ? 'द्विपक्षीय वीडियो संवाद (Video Conference)'
                  : 'सुरक्षित ध्वनि सत्र (Encrypted Audio)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
              <span>{isConnected ? formatDuration(secondsElapsed) : (connectionStatus.includes('Ringing') || connectionStatus.includes('रिंग') ? 'रिंग हो रहा है...' : 'कॉल जा रहा है...')}</span>
            </div>

            {/* Prominent WhatsApp-style Minimize Button */}
            <button
              type="button"
              onClick={onToggleMinimize}
              className="px-3 py-1.5 rounded-xl bg-[#C59A58]/20 hover:bg-[#C59A58]/30 text-[#C59A58] border border-[#C59A58]/40 flex items-center gap-1.5 text-xs font-semibold transition-all shadow-sm"
              title="फ्लोटिंग विंडो में छोटा करें • Minimize Call to Floating PiP"
            >
              <Minimize2 className="w-4 h-4" />
              <span>छोटा करें (Minimize)</span>
            </button>
          </div>
        </header>

        {/* Call Main Stage */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          {call.type === 'VIDEO' ? (
            <>
              {hasRemoteStream ? (
                <video
                  ref={setRemoteVideoEl}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="relative">
                    {peerUser.avatarUrl ? (
                      <img
                        src={peerUser.avatarUrl}
                        alt={peerName}
                        className="w-28 h-28 rounded-3xl object-cover border-4 border-[#C59A58] shadow-2xl"
                      />
                    ) : (
                      <div className="w-28 h-28 rounded-3xl bg-[#252238] text-white font-serif font-black text-4xl flex items-center justify-center border-4 border-[#C59A58] shadow-2xl">
                        {peerInitial}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-black animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-white">{peerName}</p>
                    <p className="text-xs text-[#C59A58] mt-1">{connectionStatus}</p>
                  </div>
                </div>
              )}

              {/* Local PiP Preview in corner */}
              {!isVideoOff && (
                <div className="absolute bottom-4 right-4 w-36 md:w-48 aspect-video bg-neutral-900 rounded-2xl overflow-hidden border-2 border-[#C59A58]/60 shadow-xl">
                  <video
                    ref={setLocalVideoEl}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 left-2 text-[9px] font-semibold text-white/90 bg-black/50 px-1.5 py-0.5 rounded">
                    आप (You)
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center gap-5">
              <div className="relative">
                {peerUser.avatarUrl ? (
                  <img
                    src={peerUser.avatarUrl}
                    alt={peerName}
                    className="w-32 h-32 rounded-3xl object-cover border-4 border-[#C59A58] shadow-2xl"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-3xl bg-[#FAF7F2] text-[#191C3B] font-serif font-black text-5xl flex items-center justify-center border-4 border-[#C59A58] shadow-2xl">
                    {peerInitial}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-[#191C3B] animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white tracking-tight">{peerName}</p>
                <p className="text-xs text-[#C59A58] mt-1 font-medium">{connectionStatus}</p>
              </div>

              {/* Live soundwave activity */}
              <div className="flex items-center gap-1.5 h-6">
                <span className="w-1.5 h-3 bg-emerald-400 rounded-full animate-pulse" />
                <span className="w-1.5 h-6 bg-emerald-400 rounded-full animate-pulse delay-75" />
                <span className="w-1.5 h-4 bg-emerald-400 rounded-full animate-pulse delay-150" />
                <span className="w-1.5 h-5 bg-emerald-400 rounded-full animate-pulse delay-100" />
                <span className="w-1.5 h-2 bg-emerald-400 rounded-full animate-pulse delay-200" />
              </div>
            </div>
          )}

          {/* Subtitles Overlay */}
          {subtitlesEnabled && (
            <div className="absolute bottom-4 left-4 right-4 md:right-56 bg-black/80 backdrop-blur-md border border-white/20 p-3 rounded-2xl shadow-xl flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#C59A58] text-[#191C3B] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 text-xs">
                <span className="font-bold text-[#C59A58] block mb-0.5">भाषिणी लाइव उपशीर्षक (Bhashini CC):</span>
                <p className="text-white/90">"सुरक्षित चैनल सक्रिय है..."</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Dock */}
        <footer className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-center gap-3">
          <button
            type="button"
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
              type="button"
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
            type="button"
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

          {/* Screen Sharing Toggle (WhatsApp/Discord Style) */}
          <button
            type="button"
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              isScreenSharing
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isScreenSharing ? 'स्क्रीन साझा बंद करें' : 'स्क्रीन साझा करें (Share Screen)'}
          >
            <ScreenShare className="w-5 h-5" />
          </button>

          {/* Shareable Call Link (Instant Meet) */}
          <button
            type="button"
            onClick={copyCallLink}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              callLinkCopied
                ? 'bg-emerald-600 text-white'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={callLinkCopied ? 'लिंक कॉपी हो गया!' : 'कॉल लिंक कॉपी करें (Share Call Link)'}
          >
            {callLinkCopied ? <Check className="w-5 h-5" /> : <Share2 className="w-5 h-5" />}
          </button>

          {/* Minimize button in bottom bar */}
          <button
            type="button"
            onClick={onToggleMinimize}
            className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-[#C59A58] flex items-center justify-center transition-all"
            title="कॉल छोटा करें (Floating PiP)"
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCallClick}
            className="w-12 h-11 rounded-2xl bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg shadow-red-600/30 transition-all font-bold"
            title="कॉल समाप्त करें • Hang Up"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </div>
    </>
  );
};
