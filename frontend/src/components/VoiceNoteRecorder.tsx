import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Send, Play, Pause, AlertCircle } from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSendVoiceNote: (audioBlob: Blob, durationSeconds: number) => Promise<void>;
  onCancel?: () => void;
}

export const VoiceNoteRecorder: React.FC<VoiceNoteRecorderProps> = ({
  onSendVoiceNote,
  onCancel,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Timer interval
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    setHasPermissionError(false);
    audioChunksRef.current = [];
    setAudioUrl(null);
    setAudioBlob(null);
    setRecordingSeconds(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone permission denied or not supported', err);
      setHasPermissionError(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingSeconds(0);
    if (onCancel) onCancel();
  };

  const togglePreviewPlay = () => {
    if (!audioUrl) return;
    if (!previewAudioRef.current) {
      previewAudioRef.current = new Audio(audioUrl);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsSending(true);
    try {
      await onSendVoiceNote(audioBlob, recordingSeconds);
      cancelRecording();
    } catch (e) {
      console.error('Failed to send voice note', e);
    } finally {
      setIsSending(false);
    }
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSec.toString().padStart(2, '0')}`;
  };

  if (hasPermissionError) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>माइक्रोफ़ोन अनुमति आवश्यक है • Microphone permission denied</span>
        <button
          onClick={() => setHasPermissionError(false)}
          className="ml-auto font-bold hover:underline"
        >
          ठीक है
        </button>
      </div>
    );
  }

  // Not recording and no preview: render Mic button trigger
  if (!isRecording && !audioUrl) {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="w-10 h-10 rounded-xl bg-[#FAF7F2] border border-[#E8E2D5] text-[#686578] hover:text-[#191C3B] hover:border-[#C59A58] flex items-center justify-center transition-all flex-shrink-0"
        title="ध्वनि संदेश रिकॉर्ड करें • Record Voice Note"
      >
        <Mic className="w-4 h-4 text-[#D97706]" />
      </button>
    );
  }

  // Active recording bar
  if (isRecording) {
    return (
      <div className="flex-1 flex items-center gap-3 bg-[#FDF8EE] border border-[#EAD9BE] px-4 py-2 rounded-xl animate-in fade-in">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
        <span className="text-xs font-mono font-bold text-[#B45309]">
          {formatDuration(recordingSeconds)}
        </span>
        <span className="text-[11px] text-[#686578]">रिकॉर्डिंग जारी है... Recording</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={cancelRecording}
            className="p-1.5 rounded-lg text-[#686578] hover:text-red-600 hover:bg-red-50 transition-colors"
            title="रद्द करें (Cancel)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={stopRecording}
            className="px-3 py-1 bg-[#191C3B] text-white rounded-lg text-xs font-semibold hover:bg-[#101226] flex items-center gap-1.5"
            title="रोकें एवं सुनें (Stop)"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>रोकें (Done)</span>
          </button>
        </div>
      </div>
    );
  }

  // Preview & Send bar
  return (
    <div className="flex-1 flex items-center gap-3 bg-[#FAF7F2] border border-[#E8E2D5] px-4 py-2 rounded-xl animate-in fade-in">
      <button
        type="button"
        onClick={togglePreviewPlay}
        className="w-8 h-8 rounded-lg bg-[#191C3B] text-white flex items-center justify-center transition-all"
        title={isPlayingPreview ? 'रोकें' : 'सुनें'}
      >
        {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
      </button>

      <span className="text-xs font-mono font-bold text-[#191C3B]">
        {formatDuration(recordingSeconds)}
      </span>

      {/* Mini preview waveform visualizer bars */}
      <div className="flex-1 flex items-center gap-1 h-5 overflow-hidden px-2">
        {[40, 70, 30, 90, 60, 45, 80, 55, 30, 65, 85, 40, 75, 50, 90, 35].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-[#C59A58] rounded-full transition-all"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={cancelRecording}
          className="p-1.5 rounded-lg text-[#686578] hover:text-red-600 hover:bg-red-50"
          title="मिटाएं (Discard)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={handleSend}
          disabled={isSending}
          className="px-3 py-1.5 bg-[#191C3B] text-white rounded-xl text-xs font-semibold hover:bg-[#101226] flex items-center gap-1.5 border border-[#C59A58]/20 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5 text-[#C59A58]" />
          <span>{isSending ? 'भेज रहे हैं...' : 'भेजें (Send)'}</span>
        </button>
      </div>
    </div>
  );
};
