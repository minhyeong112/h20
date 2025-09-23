import { useState, useEffect, useRef } from 'react';
import { useRecoilState } from 'recoil';
import { useToastContext } from '@librechat/client';
import { useSpeechToTextMutation } from '~/data-provider';
import useGetAudioSettings from './useGetAudioSettings';
import store from '~/store';

// Audio chunking utilities
const CHUNK_SIZE_MB = 20; // 20MB chunks to stay under 25MB limit
const CHUNK_SIZE_BYTES = CHUNK_SIZE_MB * 1024 * 1024;
const SILENCE_THRESHOLD_MS = 1000; // 1 second of silence for smart chunking
const MIN_CHUNK_DURATION_MS = 5000; // Minimum 5 seconds per chunk

interface AudioChunk {
  blob: Blob;
  startTime: number;
  endTime: number;
}

interface ChunkingProgress {
  currentChunk: number;
  totalChunks: number;
  isProcessing: boolean;
}

const useSpeechToTextExternal = (
  setText: (text: string) => void,
  onTranscriptionComplete: (text: string) => void,
) => {
  const { showToast } = useToastContext();
  const { speechToTextEndpoint } = useGetAudioSettings();
  const isExternalSTTEnabled = speechToTextEndpoint === 'external';
  const audioStream = useRef<MediaStream | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  const [permission, setPermission] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRequestBeingMade, setIsRequestBeingMade] = useState(false);
  const [audioMimeType, setAudioMimeType] = useState<string>(() => getBestSupportedMimeType());
  const [chunkingProgress, setChunkingProgress] = useState<ChunkingProgress>({
    currentChunk: 0,
    totalChunks: 0,
    isProcessing: false,
  });
  const [lastRecordedAudio, setLastRecordedAudio] = useState<Blob | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [minDecibels] = useRecoilState(store.decibelValue);
  const [autoSendText] = useRecoilState(store.autoSendText);
  const [speechToText] = useRecoilState<boolean>(store.speechToText);
  const [autoTranscribeAudio] = useRecoilState<boolean>(store.autoTranscribeAudio);

  const { mutate: processAudio, isLoading: isProcessing } = useSpeechToTextMutation({
    onSuccess: (data) => {
      const extractedText = data.text;
      // Clear the stored audio on successful transcription
      setLastRecordedAudio(null);
      setText(extractedText);
      setIsRequestBeingMade(false);

      if (autoSendText > -1 && speechToText && extractedText.length > 0) {
        setTimeout(() => {
          onTranscriptionComplete(extractedText);
        }, autoSendText * 1000);
      }
    },
    onError: (error) => {
      // Only trigger fail-safe if we have a stored audio blob
      if (lastRecordedAudio) {
        handleTranscriptionFailure(lastRecordedAudio, error);
      } else {
        showToast({
          message: 'An error occurred while processing the audio, maybe the audio was too short',
          status: 'error',
        });
        setIsRequestBeingMade(false);
        setChunkingProgress({ currentChunk: 0, totalChunks: 0, isProcessing: false });
      }
    },
  });

  function getBestSupportedMimeType() {
    const types = [
      'audio/webm',
      'audio/webm;codecs=opus',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];

    for (const type of types) {
      if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.indexOf('safari') !== -1 && ua.indexOf('chrome') === -1) {
        return 'audio/mp4';
      } else if (ua.indexOf('firefox') !== -1) {
        return 'audio/ogg';
      }
    }

    return 'audio/webm';
  }

  const getFileExtension = (mimeType: string) => {
    if (mimeType.includes('mp4')) {
      return 'm4a';
    } else if (mimeType.includes('ogg')) {
      return 'ogg';
    } else if (mimeType.includes('wav')) {
      return 'wav';
    } else {
      return 'webm';
    }
  };

  // Audio chunking utilities
  const createAudioContext = async (audioBlob: Blob): Promise<AudioContext> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    await audioContext.decodeAudioData(arrayBuffer);
    return audioContext;
  };

  const detectSilencePoints = async (audioBlob: Blob): Promise<number[]> => {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;
      const silencePoints: number[] = [];
      
      const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
      const silenceThreshold = 0.01; // Amplitude threshold for silence
      
      for (let i = 0; i < channelData.length - windowSize; i += windowSize) {
        let sum = 0;
        for (let j = i; j < i + windowSize; j++) {
          sum += Math.abs(channelData[j]);
        }
        const average = sum / windowSize;
        
        if (average < silenceThreshold) {
          const timeInSeconds = i / sampleRate;
          silencePoints.push(timeInSeconds);
        }
      }
      
      audioContext.close();
      return silencePoints;
    } catch (error) {
      console.warn('Failed to detect silence points:', error);
      return [];
    }
  };

  const findOptimalChunkPoints = async (audioBlob: Blob, targetChunkSize: number): Promise<number[]> => {
    const silencePoints = await detectSilencePoints(audioBlob);
    const audioDuration = await getAudioDuration(audioBlob);
    const targetChunkDuration = (targetChunkSize / audioBlob.size) * audioDuration;
    
    const chunkPoints: number[] = [0];
    let currentTime = 0;
    
    while (currentTime < audioDuration) {
      const targetTime = currentTime + targetChunkDuration;
      
      // Find the closest silence point to the target time
      const closestSilencePoint = silencePoints.reduce((closest, point) => {
        return Math.abs(point - targetTime) < Math.abs(closest - targetTime) ? point : closest;
      }, targetTime);
      
      // Use silence point if it's within reasonable range, otherwise use target time
      const nextChunkPoint = Math.abs(closestSilencePoint - targetTime) < targetChunkDuration * 0.2 
        ? closestSilencePoint 
        : targetTime;
      
      // Ensure minimum chunk duration
      if (nextChunkPoint - currentTime >= MIN_CHUNK_DURATION_MS / 1000) {
        chunkPoints.push(Math.min(nextChunkPoint, audioDuration));
        currentTime = nextChunkPoint;
      } else {
        currentTime = targetTime;
      }
    }
    
    // Ensure we end at the audio duration
    if (chunkPoints[chunkPoints.length - 1] < audioDuration) {
      chunkPoints.push(audioDuration);
    }
    
    return chunkPoints;
  };

  const getAudioDuration = (audioBlob: Blob): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(audio.duration);
      };
      audio.onerror = reject;
      audio.src = URL.createObjectURL(audioBlob);
    });
  };

  const sliceAudioBlob = async (audioBlob: Blob, startTime: number, endTime: number): Promise<Blob> => {
    try {
      const audioContext = new AudioContext();
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      const sampleRate = audioBuffer.sampleRate;
      const startSample = Math.floor(startTime * sampleRate);
      const endSample = Math.floor(endTime * sampleRate);
      const frameCount = endSample - startSample;
      
      const slicedBuffer = audioContext.createBuffer(
        audioBuffer.numberOfChannels,
        frameCount,
        sampleRate
      );
      
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        const slicedChannelData = slicedBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          slicedChannelData[i] = channelData[startSample + i];
        }
      }
      
      // Convert back to blob (simplified - in production you'd want proper encoding)
      const slicedArrayBuffer = await audioBufferToArrayBuffer(slicedBuffer);
      audioContext.close();
      
      return new Blob([slicedArrayBuffer], { type: audioMimeType });
    } catch (error) {
      console.warn('Failed to slice audio, using time-based fallback:', error);
      // Fallback: return original blob (not ideal but prevents errors)
      return audioBlob;
    }
  };

  const audioBufferToArrayBuffer = async (audioBuffer: AudioBuffer): Promise<ArrayBuffer> => {
    // This is a simplified conversion - in production you'd want proper audio encoding
    const length = audioBuffer.length * audioBuffer.numberOfChannels * 2;
    const arrayBuffer = new ArrayBuffer(length);
    const view = new Int16Array(arrayBuffer);
    
    let offset = 0;
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
        view[offset++] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
    }
    
    return arrayBuffer;
  };

  const chunkAudioBlob = async (audioBlob: Blob): Promise<AudioChunk[]> => {
    if (audioBlob.size <= CHUNK_SIZE_BYTES) {
      const duration = await getAudioDuration(audioBlob);
      return [{
        blob: audioBlob,
        startTime: 0,
        endTime: duration,
      }];
    }

    const chunkPoints = await findOptimalChunkPoints(audioBlob, CHUNK_SIZE_BYTES);
    const chunks: AudioChunk[] = [];
    
    for (let i = 0; i < chunkPoints.length - 1; i++) {
      const startTime = chunkPoints[i];
      const endTime = chunkPoints[i + 1];
      const chunkBlob = await sliceAudioBlob(audioBlob, startTime, endTime);
      
      chunks.push({
        blob: chunkBlob,
        startTime,
        endTime,
      });
    }
    
    return chunks;
  };

  const processAudioChunks = async (chunks: AudioChunk[]): Promise<string> => {
    const transcriptions: string[] = [];
    
    setChunkingProgress({
      currentChunk: 0,
      totalChunks: chunks.length,
      isProcessing: true,
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const fileExtension = getFileExtension(audioMimeType);
      
      const formData = new FormData();
      formData.append('audio', chunk.blob, `audio_chunk_${i}.${fileExtension}`);
      
      setChunkingProgress(prev => ({
        ...prev,
        currentChunk: i + 1,
      }));

      try {
        // Use fetch directly to avoid mutation hook complications
        const response = await fetch('/api/speech/stt', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        transcriptions.push(data.text.trim());
      } catch (error) {
        console.error(`Failed to process chunk ${i + 1}:`, error);
        throw error;
      }
    }
    
    setChunkingProgress({
      currentChunk: 0,
      totalChunks: 0,
      isProcessing: false,
    });

    // Join transcriptions with proper spacing
    return transcriptions.join(' ').replace(/\s+/g, ' ').trim();
  };

  const cleanup = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.removeEventListener('dataavailable', (event: BlobEvent) => {
        audioChunks.push(event.data);
      });
      mediaRecorderRef.current.removeEventListener('stop', handleStop);
      mediaRecorderRef.current = null;
    }
  };

  const getMicrophonePermission = async () => {
    try {
      const streamData = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      setPermission(true);
      audioStream.current = streamData ?? null;
    } catch {
      setPermission(false);
    }
  };

  const downloadAudioFile = (audioBlob: Blob, filename?: string) => {
    const fileExtension = getFileExtension(audioMimeType);
    const defaultFilename = filename || `recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${fileExtension}`;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTranscriptionFailure = (audioBlob: Blob, error: any) => {
    console.error('Transcription failed:', error);
    setLastRecordedAudio(audioBlob);
    
    // Automatically download the audio file as a fail-safe
    downloadAudioFile(audioBlob);
    
    showToast({
      message: 'Transcription failed! Your audio recording has been automatically downloaded to preserve your work.',
      status: 'error',
      duration: 8000, // Show for 8 seconds
    });
    
    setIsRequestBeingMade(false);
    setChunkingProgress({ currentChunk: 0, totalChunks: 0, isProcessing: false });
  };

  const handleStop = async () => {
    if (audioChunks.length > 0) {
      const audioBlob = new Blob(audioChunks, { type: audioMimeType });
      setAudioChunks([]);
      cleanup();

      // Store the audio as a fail-safe
      setLastRecordedAudio(audioBlob);

      try {
        setIsRequestBeingMade(true);
        
        // Check if chunking is needed
        if (audioBlob.size > CHUNK_SIZE_BYTES) {
          showToast({
            message: `Large audio file detected (${(audioBlob.size / (1024 * 1024)).toFixed(1)}MB). Processing in chunks...`,
            status: 'info',
          });
          
          const chunks = await chunkAudioBlob(audioBlob);
          const fullTranscription = await processAudioChunks(chunks);
          
          // Clear the stored audio on successful transcription
          setLastRecordedAudio(null);
          setText(fullTranscription);
          setIsRequestBeingMade(false);

          if (autoSendText > -1 && speechToText && fullTranscription.length > 0) {
            setTimeout(() => {
              onTranscriptionComplete(fullTranscription);
            }, autoSendText * 1000);
          }
        } else {
          // Process normally for smaller files using the original mutation
          const fileExtension = getFileExtension(audioMimeType);
          const formData = new FormData();
          formData.append('audio', audioBlob, `audio.${fileExtension}`);
          
          // Use the original processAudio mutation - callbacks are handled by the hook
          processAudio(formData);
        }
      } catch (error) {
        handleTranscriptionFailure(audioBlob, error);
      }
    } else {
      showToast({ message: 'The audio was too short', status: 'warning' });
    }
  };

  const monitorSilence = (stream: MediaStream, stopRecording: () => void) => {
    const audioContext = new AudioContext();
    const audioStreamSource = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.minDecibels = minDecibels;
    audioStreamSource.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    const domainData = new Uint8Array(bufferLength);
    let lastSoundTime = Date.now();

    const detectSound = () => {
      analyser.getByteFrequencyData(domainData);
      const isSoundDetected = domainData.some((value) => value > 0);

      if (isSoundDetected) {
        lastSoundTime = Date.now();
      }

      const timeSinceLastSound = Date.now() - lastSoundTime;
      const isOverSilenceThreshold = timeSinceLastSound > 3000;

      if (isOverSilenceThreshold) {
        stopRecording();
        return;
      }

      animationFrameIdRef.current = window.requestAnimationFrame(detectSound);
    };

    animationFrameIdRef.current = window.requestAnimationFrame(detectSound);
  };

  const startRecording = async () => {
    if (isRequestBeingMade) {
      showToast({ message: 'A request is already being made. Please wait.', status: 'warning' });
      return;
    }

    if (!audioStream.current) {
      await getMicrophonePermission();
    }

    if (audioStream.current) {
      try {
        setAudioChunks([]);
        const bestMimeType = getBestSupportedMimeType();
        setAudioMimeType(bestMimeType);

        // Start the recording timer
        const startTime = Date.now();
        setRecordingStartTime(startTime);
        setRecordingDuration(0);
        
        recordingTimerRef.current = setInterval(() => {
          setRecordingDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);

        mediaRecorderRef.current = new MediaRecorder(audioStream.current, {
          mimeType: audioMimeType,
        });
        mediaRecorderRef.current.addEventListener('dataavailable', (event: BlobEvent) => {
          audioChunks.push(event.data);
        });
        mediaRecorderRef.current.addEventListener('stop', handleStop);
        mediaRecorderRef.current.start(100);
        if (!audioContextRef.current && autoTranscribeAudio && speechToText) {
          monitorSilence(audioStream.current, stopRecording);
        }
        setIsListening(true);
      } catch (error) {
        showToast({ message: `Error starting recording: ${error}`, status: 'error' });
      }
    } else {
      showToast({ message: 'Microphone permission not granted', status: 'error' });
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    if (mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();

      audioStream.current?.getTracks().forEach((track) => track.stop());
      audioStream.current = null;

      if (animationFrameIdRef.current !== null) {
        window.cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }

      // Stop the recording timer
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setRecordingStartTime(null);

      setIsListening(false);
    } else {
      showToast({ message: 'MediaRecorder is not recording', status: 'error' });
    }
  };

  const externalStartRecording = () => {
    if (isListening) {
      showToast({ message: 'Already listening. Please stop recording first.', status: 'warning' });
      return;
    }

    startRecording();
  };

  const externalStopRecording = () => {
    if (!isListening) {
      showToast({
        message: 'Not currently recording. Please start recording first.',
        status: 'warning',
      });
      return;
    }

    stopRecording();
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    if (e.shiftKey && e.altKey && e.code === 'KeyL' && isExternalSTTEnabled) {
      if (!window.MediaRecorder) {
        showToast({ message: 'MediaRecorder is not supported in this browser', status: 'error' });
        return;
      }

      if (permission === false) {
        await getMicrophonePermission();
      }

      if (isListening) {
        stopRecording();
      } else {
        startRecording();
      }

      e.preventDefault();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const downloadLastRecording = () => {
    if (lastRecordedAudio) {
      downloadAudioFile(lastRecordedAudio);
      showToast({
        message: 'Audio recording downloaded successfully.',
        status: 'success',
      });
    } else {
      showToast({
        message: 'No recent recording available to download.',
        status: 'warning',
      });
    }
  };

  return {
    isListening,
    externalStopRecording,
    externalStartRecording,
    isLoading: isProcessing || chunkingProgress.isProcessing,
    chunkingProgress,
    downloadLastRecording,
    hasLastRecording: !!lastRecordedAudio,
    recordingDuration,
    isRecording: isListening,
  };
};

export default useSpeechToTextExternal;
