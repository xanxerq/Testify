import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { UploadedMaterial } from '../types';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (material: UploadedMaterial) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedPhoto(null);
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      console.error('Error accessing camera:', err);
      setCameraError('No se pudo acceder a la cámara. Revisa los permisos en tu navegador.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  const handleConfirmPhoto = () => {
    if (!capturedPhoto) return;
    const cleanBase64 = capturedPhoto.replace(/^data:image\/[a-z]+;base64,/, '');
    const material: UploadedMaterial = {
      id: `mat_cam_${Date.now()}`,
      name: `Foto_Apuntes_${new Date().toLocaleTimeString().replace(/:/g, '')}.jpg`,
      type: 'image',
      mimeType: 'image/jpeg',
      base64Data: cleanBase64,
      previewUrl: capturedPhoto,
      sizeBytes: Math.round((cleanBase64.length * 3) / 4),
    };
    onCapture(material);
    onClose();
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm">Fotografiar Temario o Apuntes</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] max-h-[500px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 max-w-xs">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <p className="text-sm font-medium">{cameraError}</p>
              <button
                onClick={startCamera}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
              >
                Reintentar
              </button>
            </div>
          ) : capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Foto capturada"
              className="w-full h-full object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {/* Document Alignment Frame */}
              <div className="absolute inset-8 border-2 border-white/40 rounded-2xl pointer-events-none border-dashed flex flex-col justify-between p-3">
                <span className="text-[11px] font-semibold text-white/80 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm self-start">
                  Encuadra tus apuntes o libro
                </span>
                <span className="text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm self-center text-center">
                  Asegúrate de que el texto sea legible
                </span>
              </div>
            </>
          )}

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
          {!capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                title="Cambiar cámara (delantera/trasera)"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              <button
                id="btn-shutter"
                type="button"
                onClick={handleTakePhoto}
                disabled={Boolean(cameraError)}
                className="w-16 h-16 rounded-full border-4 border-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all flex items-center justify-center text-white shadow-lg shadow-indigo-600/50 disabled:opacity-50"
              >
                <Camera className="w-7 h-7" />
              </button>

              <div className="w-11" />
            </>
          ) : (
            <div className="w-full flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Repetir foto</span>
              </button>

              <button
                id="btn-confirm-photo"
                type="button"
                onClick={handleConfirmPhoto}
                className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30"
              >
                <Check className="w-4 h-4" />
                <span>Usar foto</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
