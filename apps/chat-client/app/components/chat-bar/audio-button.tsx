'use client'

import { MicrophoneIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useState } from 'react';

interface UploadResponse {
    error: string;
    body: string;
  }

export function AudioButton({handleFileChange}:{handleFileChange: any}): JSX.Element {
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Function to upload the audio file to the API
  const uploadAudio = async (): Promise<void> => {
    if (audioBlob) {
      // Adjust the file name and MIME type
      const file = new File([audioBlob], 'captured-audio.webm', { type: 'audio/webm;codecs=opus' });
      handleFileChange(null, file);

      setAudioBlob(null);
      setAudioUrl(null);
    }
  };

  // Start recording
  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: 'audio/webm;codecs=opus' };
      const recorder = new MediaRecorder(stream, options);
      setMediaRecorder(recorder);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            console.log(event.data)
          //setAudioUrl(URL.createObjectURL(event.data));
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => { track.stop(); }); // Stop the stream tracks when stopping the recording
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing the microphone', err);
    }
  };

  // Stop recording and handle the upload
  // Stop recording
  const stopRecording = (): void => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioBlob(event.data);
          setAudioUrl(URL.createObjectURL(event.data));
        }
      };
      setIsRecording(false);
    }
  };

  // Handle cancel action
  const cancelAudio = (): void => {
    setAudioBlob(null);
    setAudioUrl(null);
  };

  return (
    <div className="flex">
      {audioUrl ? <div className="flex items-center gap-2">
          <button className="bg-red-500 p-2 h-10 w-10 rounded-full flex items-center justify-center" onClick={cancelAudio} type="button" data-cy="audio-cancel-button">
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
          <audio className="h-10" controls src={audioUrl} data-cy="audio-playback">
            <track kind="captions" />
          </audio>
          <button className="bg-green-500 p-2 rounded-full" onClick={uploadAudio} type="button" data-cy="audio-confirm-button">
            <CheckIcon className="h-5 w-5 text-white" />
          </button>
        </div> : null}
      <button
          className={`h-10 w-10 rounded-full flex items-center justify-center ${isRecording ? 'bg-red-600' : 'bg-gray-200'} transition-colors duration-150`}
          onClick={isRecording ? stopRecording : startRecording} 
          type="button"
          data-cy="audio-record-button"
      >
          <MicrophoneIcon className="h-6 w-6 text-gray-600" />
      </button>
      
    </div>
  );
};

