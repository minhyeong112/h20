import { useCallback } from 'react';
import { useToastContext, TooltipAnchor, ListeningIcon, Spinner } from '@librechat/client';
import { useLocalize, useSpeechToText } from '~/hooks';
import { useChatFormContext } from '~/Providers';
import { globalAudioId } from '~/common';
import { cn } from '~/utils';

export default function AudioRecorder({
  disabled,
  ask,
  methods,
  textAreaRef,
  isSubmitting,
}: {
  disabled: boolean;
  ask: (data: { text: string }) => void;
  methods: ReturnType<typeof useChatFormContext>;
  textAreaRef: React.RefObject<HTMLTextAreaElement>;
  isSubmitting: boolean;
}) {
  const { setValue, reset } = methods;
  const localize = useLocalize();
  const { showToast } = useToastContext();

  const onTranscriptionComplete = useCallback(
    (text: string) => {
      if (isSubmitting) {
        showToast({
          message: localize('com_ui_speech_while_submitting'),
          status: 'error',
        });
        return;
      }
      if (text) {
        const globalAudio = document.getElementById(globalAudioId) as HTMLAudioElement | null;
        if (globalAudio) {
          console.log('Unmuting global audio');
          globalAudio.muted = false;
        }
        ask({ text });
        reset({ text: '' });
      }
    },
    [ask, reset, showToast, localize, isSubmitting],
  );

  const setText = useCallback(
    (text: string) => {
      const currentText = methods.getValues('text') || '';
      const newText = currentText ? `${currentText} ${text}` : text;
      setValue('text', newText, {
        shouldValidate: true,
      });
    },
    [setValue, methods],
  );

  const { 
    isListening, 
    isLoading, 
    startRecording, 
    stopRecording, 
    chunkingProgress,
    recordingDuration,
    isRecording 
  } = useSpeechToText(
    setText,
    onTranscriptionComplete,
  );

  if (!textAreaRef.current) {
    return null;
  }

  const handleStartRecording = async () => startRecording();

  const handleStopRecording = async () => stopRecording();

  const renderIcon = () => {
    if (isListening === true) {
      return <ListeningIcon className="stroke-red-500" />;
    }
    if (isLoading === true) {
      return <Spinner className="stroke-gray-700 dark:stroke-gray-300" />;
    }
    return <ListeningIcon className="stroke-gray-700 dark:stroke-gray-300" />;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTooltipDescription = () => {
    if (chunkingProgress?.isProcessing && chunkingProgress.totalChunks > 1) {
      return `Processing chunk ${chunkingProgress.currentChunk} of ${chunkingProgress.totalChunks}`;
    }
    if (isRecording && recordingDuration !== undefined) {
      return `Recording: ${formatDuration(recordingDuration)}`;
    }
    return localize('com_ui_use_micrphone');
  };

  return (
    <div className="relative">
      <TooltipAnchor
        description={getTooltipDescription()}
        render={
          <button
            id="audio-recorder"
            type="button"
            aria-label={localize('com_ui_use_micrphone')}
            onClick={isListening === true ? handleStopRecording : handleStartRecording}
            disabled={disabled}
            className={cn(
              'flex size-9 items-center justify-center rounded-full p-1 transition-colors hover:bg-surface-hover',
            )}
            title={getTooltipDescription()}
            aria-pressed={isListening}
          >
            {renderIcon()}
          </button>
        }
      />
      
      {/* Recording Timer */}
      {isRecording && recordingDuration !== undefined && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow-lg flex items-center space-x-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>{formatDuration(recordingDuration)}</span>
          </div>
        </div>
      )}

      {/* Chunking Progress */}
      {chunkingProgress?.isProcessing && chunkingProgress.totalChunks > 1 && (
        <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-16 bg-gray-600 rounded-full h-1">
                <div
                  className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                  style={{
                    width: `${(chunkingProgress.currentChunk / chunkingProgress.totalChunks) * 100}%`,
                  }}
                />
              </div>
              <span>
                {chunkingProgress.currentChunk}/{chunkingProgress.totalChunks}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
