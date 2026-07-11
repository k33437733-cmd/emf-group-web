import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Pause, Play, X, Trash2, Send, RotateCcw, Check } from 'lucide-react';

type RecorderState = 'idle' | 'recording' | 'paused' | 'preview';

interface Props {
  onSend: (file: File) => void;
  onCancel: () => void;
  disabled?: boolean;
}

const SPEEDS = [0.5, 1, 1.5, 2];

export default function VoiceRecorder({ onSend, onCancel, disabled }: Props) {
  const [state, setState] = useState<RecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  // Refs
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string>('');
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const prevCanvasRef = useRef<HTMLCanvasElement>(null);
  const prevCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Format time
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // Draw waveform bars
  const drawWaveform = useCallback((analyser: AnalyserNode, canvas: HTMLCanvasElement, barCount = 48) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const step = Math.floor(bufferLength / barCount);
      const barW = canvas.width / barCount;
      const mid = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += dataArray[i * step + j];
        const avg = sum / step;
        const h = (avg / 255) * canvas.height * 0.8;
        const x = i * barW;

        // Gradient bar
        const grad = ctx.createLinearGradient(x, mid - h / 2, x, mid + h / 2);
        grad.addColorStop(0, '#00D2FF');
        grad.addColorStop(1, '#3A7BD5');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, mid - h / 2, barW - 2, h);
      }
    };
    draw();
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup AudioContext + Analyser for live waveform
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      source.connect(analyser);

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
        setPendingFile(file);

        // Draw preview waveform from audio data
        drawPreviewWaveform(url);

        stream.getTracks().forEach(t => t.stop());
        audioCtx.close();
        cancelAnimationFrame(animRef.current!);
        setState('preview');
        clearInterval(timerRef.current);
      };

      recorder.start();
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {}
  }, [drawWaveform]);

  // Draw preview waveform from audio file
  const drawPreviewWaveform = async (url: string) => {
    const canvas = prevCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    prevCtxRef.current = ctx;

    try {
      const audioCtx = new AudioContext();
      const resp = await fetch(url);
      const buf = await resp.arrayBuffer();
      const audioBuf = await audioCtx.decodeAudioData(buf);
      const data = audioBuf.getChannelData(0);
      const step = Math.floor(data.length / canvas.width);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mid = canvas.height / 2;

      ctx.beginPath();
      ctx.moveTo(0, mid);

      for (let i = 0; i < canvas.width; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0);
        const avg = sum / step;
        const h = avg * canvas.height * 0.9;
        ctx.lineTo(i, mid - h);
      }
      ctx.strokeStyle = '#00D2FF';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mirror
      ctx.beginPath();
      ctx.moveTo(0, mid);
      for (let i = 0; i < canvas.width; i++) {
        let sum = 0;
        for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0);
        const avg = sum / step;
        const h = avg * canvas.height * 0.9;
        ctx.lineTo(i, mid + h);
      }
      ctx.strokeStyle = '#3A7BD5';
      ctx.stroke();

      audioCtx.close();
    } catch {}
  };

  // Stop recording
  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    clearInterval(timerRef.current);
  }, []);

  // Pause / Resume
  const togglePause = useCallback(() => {
    if (!recorderRef.current) return;
    if (recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      audioCtxRef.current?.suspend();
      cancelAnimationFrame(animRef.current!);
      setState('paused');
      clearInterval(timerRef.current);
    } else if (recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      audioCtxRef.current?.resume();

      // Resume waveform
      if (canvasRef.current && analyserRef.current) {
        drawWaveform(analyserRef.current, canvasRef.current);
      }

      setState('recording');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    }
  }, [drawWaveform]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current!);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach(t => t.stop());
    audioCtxRef.current?.close();
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    chunksRef.current = [];
    setState('idle');
    setPendingFile(null);
    setDuration(0);
    onCancel();
  }, [onCancel]);

  // Playback in preview
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(blobUrlRef.current);
      audioRef.current = audio;
      audio.playbackRate = speed;
      setPreviewTime(0);

      audio.ontimeupdate = () => {
        setPreviewTime(audio.currentTime);
        updatePreviewPosition(audio.currentTime / (audio.duration || 1));
      };
      audio.onended = () => {
        audioRef.current = null;
      };
      audio.play();
    } else if (audioRef.current.paused) {
      audioRef.current.play();
    } else {
      audioRef.current.pause();
    }
  }, [speed]);

  // Update preview position on waveform
  const updatePreviewPosition = (pct: number) => {
    const canvas = prevCanvasRef.current;
    const ctx = prevCtxRef.current;
    if (!canvas || !ctx) return;
    const x = pct * canvas.width;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPreviewWaveform(blobUrlRef.current).then(() => {
      ctx.fillStyle = 'rgba(0, 210, 255, 0.15)';
      ctx.fillRect(0, 0, x, canvas.height);
    });
  };

  // Change speed
  const changeSpeed = useCallback((s: number) => {
    setSpeed(s);
    if (audioRef.current) audioRef.current.playbackRate = s;
  }, []);

  // Send
  const handleSend = useCallback(() => {
    if (pendingFile) {
      onSend(pendingFile);
      cleanup();
    }
  }, [pendingFile, onSend]);

  const cleanup = () => {
    clearInterval(timerRef.current);
    cancelAnimationFrame(animRef.current!);
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
    setState('idle');
    setPendingFile(null);
    setDuration(0);
    setPreviewTime(0);
    setSpeed(1);
  };

  // Re-record
  const reRecord = useCallback(() => {
    cleanup();
    startRecording();
  }, [cleanup, startRecording]);

  // Monitor canvas animation
  useEffect(() => {
    if (state === 'recording' && canvasRef.current && analyserRef.current) {
      drawWaveform(analyserRef.current, canvasRef.current);
    }
    return () => cancelAnimationFrame(animRef.current!);
  }, [state, drawWaveform]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      cancelAnimationFrame(animRef.current!);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const isRecording = state === 'recording';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '4px',
      padding: '4px 8px', background: 'var(--bg-surface)',
      borderRadius: '12px', border: '1px solid var(--color-border)',
      animation: 'popupIn 0.15s ease',
    }}>
      {/* Header with close */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 4px' }}>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Mic size={11} color={isRecording ? '#EF4444' : 'var(--text-tertiary)'} />
          {state === 'idle' && 'اضغط للتسجيل'}
          {isRecording && 'تسجيل...'}
          {state === 'paused' && 'متوقف مؤقتاً'}
          {state === 'preview' && 'معاينة التسجيل'}
        </span>
        <button onClick={cleanup}
          style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: '2px', display: 'flex' }}>
          <X size={13} />
        </button>
      </div>

      {/* Recording state */}
      {(isRecording || state === 'paused') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px' }}>
          {/* Waveform canvas */}
          <canvas ref={canvasRef} width={160} height={40}
            style={{ flex: 1, borderRadius: '6px', background: 'var(--bg-card)', minHeight: '40px' }} />

          {/* Timer */}
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, fontFamily: 'monospace',
            color: isRecording ? '#EF4444' : 'var(--text-tertiary)',
            direction: 'ltr', minWidth: '36px', textAlign: 'center',
          }}>
            {fmt(duration)}
          </span>

          {/* Pause/Resume */}
          <button onClick={togglePause}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--color-border)',
              borderRadius: '8px', color: 'var(--text-primary)',
              cursor: 'pointer', padding: '6px', display: 'flex',
            }}>
            {state === 'paused' ? <Play size={14} /> : <Pause size={14} />}
          </button>

          {/* Stop */}
          <button onClick={stopRecording}
            style={{
              background: '#EF4444', border: 'none', borderRadius: '8px',
              color: '#fff', cursor: 'pointer', padding: '6px 10px', display: 'flex',
              alignItems: 'center', gap: '4px',
            }}>
            <Square size={12} />
            <span style={{ fontSize: '0.65rem' }}>إيقاف</span>
          </button>
        </div>
      )}

      {/* Idle state — press to record */}
      {state === 'idle' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px' }}>
          <button onClick={startRecording} disabled={disabled}
            style={{
              background: 'linear-gradient(135deg, #EF4444, #DC2626)', border: 'none',
              borderRadius: '50%', width: '48px', height: '48px',
              color: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
              transition: 'transform 0.1s',
            }}
            onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.9)')}
            onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
            onTouchStart={e => { e.currentTarget.style.transform = 'scale(0.9)'; startRecording(); }}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Mic size={22} />
          </button>
        </div>
      )}

      {/* Preview state */}
      {state === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px' }}>
          {/* Preview waveform */}
          <canvas ref={prevCanvasRef} width={240} height={48}
            style={{ width: '100%', borderRadius: '6px', background: 'var(--bg-card)', minHeight: '48px' }} />

          {/* Controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Playback */}
            <button onClick={togglePlayback}
              style={{
                background: 'var(--color-primary)', border: 'none', borderRadius: '8px',
                color: '#050816', cursor: 'pointer', padding: '6px', display: 'flex',
              }}>
              {audioRef.current && !audioRef.current.paused ? <Pause size={14} /> : <Play size={14} />}
            </button>

            {/* Timer */}
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--text-secondary)', direction: 'ltr', minWidth: '36px' }}>
              {previewTime > 0 ? fmt(Math.round(previewTime)) : fmt(duration)}
              <span style={{ opacity: 0.5 }}> / {fmt(duration)}</span>
            </span>

            {/* Speed */}
            <div style={{ display: 'flex', gap: '2px', marginRight: 'auto' }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => changeSpeed(s)}
                  style={{
                    background: speed === s ? 'var(--color-primary)' : 'var(--bg-card)',
                    border: '1px solid var(--color-border)', borderRadius: '6px',
                    color: speed === s ? '#050816' : 'var(--text-secondary)',
                    cursor: 'pointer', padding: '2px 6px', fontSize: '0.6rem',
                    fontWeight: speed === s ? 600 : 400,
                  }}>
                  {s}x
                </button>
              ))}
            </div>

            {/* Cancel / Re-record */}
            <button onClick={reRecord}
              style={{
                background: 'none', border: '1px solid var(--color-border)',
                borderRadius: '8px', color: 'var(--text-tertiary)',
                cursor: 'pointer', padding: '6px', display: 'flex',
              }} title="إعادة تسجيل">
              <RotateCcw size={13} />
            </button>

            {/* Send */}
            <button onClick={handleSend}
              style={{
                background: 'var(--color-primary)', border: 'none', borderRadius: '8px',
                color: '#050816', cursor: 'pointer', padding: '6px 14px',
                display: 'flex', alignItems: 'center', gap: '4px',
                fontWeight: 600, fontSize: '0.72rem',
              }}>
              <Send size={13} />
              إرسال
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popupIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
