import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X } from 'lucide-react';
import { useI18n } from '../../i18n';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

/**
 * Simple QR code scanner using the BarcodeDetector API (Chrome/Edge/Safari 16.4+)
 * Falls back to a helpful message for unsupported browsers.
 */
export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanInterval = useRef<ReturnType<typeof setInterval>>();

  const stopCamera = useCallback(() => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Check if BarcodeDetector is available
    if (!('BarcodeDetector' in window)) {
      setError('unsupported');
      return;
    }

    let cancelled = false;

    const startScanning = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setScanning(true);

        // @ts-expect-error BarcodeDetector is not in all TS libs
        const detector = new BarcodeDetector({ formats: ['qr_code'] });

        scanInterval.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              // Extract join code from URL or use raw value
              let code = rawValue;
              try {
                const url = new URL(rawValue);
                const joinParam = url.searchParams.get('join');
                if (joinParam) code = joinParam;
              } catch {
                // Not a URL, use raw value as-is (could be a plain invite code)
              }
              stopCamera();
              onScan(code.toUpperCase());
            }
          } catch {
            // Detection frame error, ignore and retry
          }
        }, 300);
      } catch (err) {
        if (!cancelled) {
          console.error('Camera access error:', err);
          setError('camera');
        }
      }
    };

    startScanning();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  // Unsupported browser fallback
  if (error === 'unsupported') {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px',
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: 'var(--surface-solid, #1a1a2e)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '360px',
            width: '100%',
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Camera className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--neon-cyan)' }} />
          <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text)' }}>
            {t('team.scanQR') || 'QR-Code scannen'}
          </h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            {t('team.scanFallback') || 'Nutze deine Handy-Kamera oder eine QR-App, um den Code zu scannen. Der Link öffnet die App automatisch.'}
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium"
            style={{ background: 'rgba(201,169,98,0.1)', border: '1px solid rgba(201,169,98,0.2)', color: 'var(--neon-cyan)' }}
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.95)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
    >
      {/* Close button */}
      <button
        onClick={() => { stopCamera(); onClose(); }}
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.2)',
          background: 'rgba(0,0,0,0.5)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10001,
        }}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Camera error */}
      {error === 'camera' && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Camera className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--warning)' }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {t('team.cameraError') || 'Kamera-Zugriff nicht möglich. Bitte erlaube den Zugriff in den Browsereinstellungen.'}
          </p>
        </div>
      )}

      {/* Video feed */}
      {!error && (
        <>
          <div style={{
            position: 'relative',
            width: '280px',
            height: '280px',
            borderRadius: '20px',
            overflow: 'hidden',
            border: '2px solid rgba(201,169,98,0.4)',
          }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              playsInline
              muted
            />
            {/* Scanning overlay animation */}
            {scanning && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  border: '3px solid rgba(201,169,98,0.6)',
                  borderRadius: '18px',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
            )}
          </div>
          <p className="text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
            {t('team.scanHint') || 'QR-Code in den Rahmen halten'}
          </p>
        </>
      )}
    </div>
  );
}
