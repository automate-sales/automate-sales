import { CameraIcon } from '@heroicons/react/24/outline';
import { useEffect, useRef, useState } from 'react';

export function CameraButton({handleFileChange}:{handleFileChange: any}){
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [cameraStarted, setCameraStarted] = useState<boolean>(false);
    const [pictureTaken, setPictureTaken] = useState<boolean>(false);

  const highResolutionConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: "user" // or "environment" for the rear camera
    }
  };

  // This useEffect is only responsible for starting the camera.
  useEffect(() => {
    if (cameraStarted) {
      navigator.mediaDevices.getUserMedia(highResolutionConstraints)
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(error => {
          console.error('Error accessing the camera', error);
          setCameraStarted(false);
        });
    }
  }, [cameraStarted]);

  const startCamera = () => {
    setCameraStarted(true);
  };

  const takePicture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        setPictureTaken(true);
      }
    }
  };

  
  const cancelPicture = () => {
    setPictureTaken(false);
    setCameraStarted(false);
  };

  const confirmUpload = async () => {
    if (canvasRef.current) {
      canvasRef.current.toBlob(async (blob) => {
        if (blob) {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          console.log('FIL:EE YEAHHH ', file)
          handleFileChange(null, file)

          // Stop the camera
          if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
          }
          setCameraStarted(false);
          setPictureTaken(false);
        }
      }, 'image/jpeg');
    }
  };

  console.log('cameraStarted', cameraStarted);
  return (
    <div>
      {/* Always render the canvas, but make it invisible when not needed */}
      <canvas ref={canvasRef} style={{ display: pictureTaken ? 'block' : 'none', width: '100%' }} />
      
      {cameraStarted && !pictureTaken && (
        <video ref={videoRef} autoPlay playsInline style={{ width: '100%' }} />
      )}

      {pictureTaken ? (
        <>
          <button onClick={cancelPicture}>Cancel</button>
          <button onClick={confirmUpload}>Confirm Upload</button>
        </>
      ) : (
        <button className="flex items-center p-2 hover:bg-gray-100 w-full" onClick={cameraStarted ? takePicture : startCamera} type="button">
            <CameraIcon className="h-6 w-6 mr-2" /> {cameraStarted ? 'Capture' : 'Camera'}
        </button>
      )}
    </div>
  );
};
