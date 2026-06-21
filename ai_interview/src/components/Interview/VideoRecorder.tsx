// import React, { useRef, useEffect, useState } from 'react';
// import { Video, VideoOff } from 'lucide-react';
// import { Card } from '../UI/Card';

// interface VideoRecorderProps {
//   stream: MediaStream | null;
//   isRecording: boolean;
//   onStreamReady?: (stream: MediaStream) => void;
// }

// export const VideoRecorder: React.FC<VideoRecorderProps> = ({
//   stream,
//   isRecording,
//   onStreamReady,
// }) => {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const [hasVideo, setHasVideo] = useState(false);
//   const [localStream, setLocalStream] = useState<MediaStream | null>(null);

//   useEffect(() => {
//     let isMounted = true;

//     const initCamera = async () => {
//       try {
//         console.log('🎥 Requesting camera access...');
//         const mediaStream = await navigator.mediaDevices.getUserMedia({
//           video: {
//             width: { ideal: 1280 },
//             height: { ideal: 720 },
//             frameRate: { ideal: 30 },
//           },
//           audio: {
//             echoCancellation: true,
//             noiseSuppression: true,
//             autoGainControl: true,
//           },
//         });

//         if (!isMounted) return;

//         console.log('✅ Camera stream obtained');
//         setLocalStream(mediaStream);
//         onStreamReady?.(mediaStream);
//       } catch (error) {
//         console.error('❌ Failed to get camera stream:', error);
//         if (isMounted) {
//           setHasVideo(false);
//         }
//       }
//     };

//     // If no stream passed, initialize camera
//     if (!stream) {
//       initCamera();
//     } else {
//       console.log('✅ Using provided stream');
//       setLocalStream(stream);
//     }

//     return () => {
//       isMounted = false;
//     };
//   }, [stream, onStreamReady]);

//   // Separate effect to attach stream to video element
//   useEffect(() => {
//     if (!videoRef.current) return;

//     const streamToUse = stream || localStream;
//     if (streamToUse) {
//       console.log('🎬 Attaching stream to video element');
//       videoRef.current.srcObject = streamToUse;
//       setHasVideo(true);

//       // Listen for when video is playing
//       const onLoadedMetadata = () => {
//         console.log('✅ Video metadata loaded');
//         setHasVideo(true);
//       };

//       videoRef.current.addEventListener('loadedmetadata', onLoadedMetadata);
//       return () => {
//         videoRef.current?.removeEventListener('loadedmetadata', onLoadedMetadata);
//       };
//     }
//   }, [stream, localStream]);

//   return (
//     <Card className="max-w-4xl mx-auto">
//       <div className="space-y-4">
//         {/* Header */}
//         <div className="flex items-center justify-between">
//           <div className="flex items-center gap-3">
//             <div className="p-3 bg-primary-500/10 rounded-lg">
//               <Video className="w-6 h-6 text-primary-500" />
//             </div>
//             <div>
//               <h3 className="font-bold text-lg">Your Video</h3>
//               <p className="text-sm text-gray-400">
//                 {isRecording ? 'Recording your answer...' : 'Ready to record'}
//               </p>
//             </div>
//           </div>

//           {/* Recording Indicator */}
//           {isRecording && (
//             <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-full px-4 py-2">
//               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
//               <span className="text-sm font-semibold text-red-200">REC</span>
//             </div>
//           )}
//         </div>

//         {/* Video Preview */}
//         <div className="relative bg-black rounded-lg overflow-hidden w-full" style={{ paddingBottom: '56.25%' }}>
//           <video
//             ref={videoRef}
//             autoPlay
//             playsInline
//             muted
//             style={{
//               position: 'absolute',
//               top: 0,
//               left: 0,
//               width: '100%',
//               height: '100%',
//               objectFit: 'cover',
//               backgroundColor: '#000000',
//             }}
//           />

//           {!hasVideo && (
//             <div
//               style={{
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 width: '100%',
//                 height: '100%',
//                 display: 'flex',
//                 alignItems: 'center',
//                 justifyContent: 'center',
//               }}
//             >
//               <div className="text-center">
//                 <VideoOff className="w-16 h-16 text-gray-600 mx-auto mb-4" />
//                 <p className="text-gray-400">Camera not available</p>
//               </div>
//             </div>
//           )}

//           {/* Recording Overlay */}
//           {isRecording && (
//             <div style={{
//               position: 'absolute',
//               top: '1rem',
//               left: '1rem',
//               right: '1rem',
//               display: 'flex',
//               alignItems: 'center',
//               justifyContent: 'space-between',
//               zIndex: 10,
//             }}>
//               <div style={{
//                 backgroundColor: 'rgb(220, 38, 38)',
//                 color: 'white',
//                 padding: '0.5rem 0.75rem',
//                 borderRadius: '9999px',
//                 fontSize: '0.875rem',
//                 fontWeight: '600',
//                 display: 'flex',
//                 alignItems: 'center',
//                 gap: '0.5rem',
//               }}>
//                 <div style={{
//                   width: '0.5rem',
//                   height: '0.5rem',
//                   backgroundColor: 'white',
//                   borderRadius: '50%',
//                   animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
//                 }} />
//                 RECORDING
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </Card>
//   );
// };









import React from 'react';

interface VideoRecorderProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  isPaused: boolean;
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  videoRef,
  isRecording,
  isPaused,
}) => {
  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden shadow-xl">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-auto"
        style={{ maxHeight: '480px' }}
      />
      
      {/* Recording Indicator */}
      {isRecording && !isPaused && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-red-600 text-white px-3 py-1 rounded-full">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="text-sm font-semibold">REC</span>
        </div>
      )}
      
      {/* Paused Indicator */}
      {isPaused && (
        <div className="absolute top-4 left-4 flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded-full">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-semibold">PAUSED</span>
        </div>
      )}
    </div>
  );
};