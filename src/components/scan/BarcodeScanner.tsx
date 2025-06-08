
"use client";

import React, { useEffect, useRef, useState } from 'react';
import type { IScannerControls, BarcodeFormat, DecodeHintType, BrowserMultiFormatReader as ReaderInstanceType } from '@zxing/library';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  isOpen: boolean;
  onScanSuccess: (text: string) => void;
  onScanHint: (message: string | null) => void;
  onCameraPermissionChange: (hasPermission: boolean | null) => void;
}

// Define a type for the Zxing library module
type ZxingLibrary = typeof import('@zxing/library');

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onScanSuccess,
  onScanHint,
  onCameraPermissionChange,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    let zxingModule: ZxingLibrary | null = null;
    let currentStream: MediaStream | null = null;
    let currentReader: ReaderInstanceType | null = null;
    let currentControls: IScannerControls | null = null;

    const stopScanAndCamera = () => {
      onScanHint(null);
      if (currentControls) {
        try {
          currentControls.stop();
        } catch (e) {
          console.warn('Error stopping scanner controls:', e);
        }
        currentControls = null;
      }
      if (currentReader) {
        try {
          currentReader.reset();
        } catch (e) {
          console.warn('Error resetting code reader during stop:', e);
        }
        currentReader = null;
      }
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      console.log('BarcodeScanner: Scan and camera stopped.');
    };

    const initializeAndStartScanner = async () => {
      stopScanAndCamera(); // Clean up previous session
      onCameraPermissionChange(null); // Set to loading state
      onScanHint("Menyiapkan kamera...");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('Camera API not supported by this browser.');
        onCameraPermissionChange(false);
        onScanHint('Kamera tidak didukung oleh browser ini.');
        toast({ variant: 'destructive', title: 'Kamera Tidak Didukung', description: 'Browser Anda tidak mendukung akses kamera.' });
        return;
      }

      try {
        console.log('BarcodeScanner: Attempting to load @zxing/library...');
        zxingModule = await import('@zxing/library');
        console.log('BarcodeScanner: @zxing/library loaded.', zxingModule);
      } catch (libLoadError) {
        console.error('BarcodeScanner: Failed to load @zxing/library:', libLoadError);
        onCameraPermissionChange(false);
        onScanHint('Gagal memuat komponen pemindai.');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Gagal memuat komponen pemindai. Periksa konsol.' });
        return;
      }

      if (!zxingModule || typeof zxingModule.BrowserMultiFormatReader !== 'function') {
        console.error('BarcodeScanner: BrowserMultiFormatReader class not found in Zxing module.', zxingModule);
        onCameraPermissionChange(false);
        onScanHint('Komponen pemindai tidak ditemukan (gagal load).');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Komponen pemindai tidak ditemukan. Periksa konsol.' });
        return;
      }

      try {
        const constraints: MediaStreamConstraints = { video: { facingMode: "environment" } };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (permError: any) {
        console.error('BarcodeScanner: Error obtaining camera stream:', permError);
        let userMessage = `Gagal mengakses kamera: ${permError.message}`;
        if (permError.name === "NotAllowedError" || permError.name === "PermissionDeniedError") {
          userMessage = 'Akses kamera ditolak. Mohon izinkan di pengaturan browser Anda.';
        } else if (permError.name === "NotFoundError" || permError.name === "DevicesNotFoundError") {
          userMessage = 'Kamera tidak ditemukan di perangkat ini.';
        }
        onCameraPermissionChange(false);
        onScanHint(userMessage);
        toast({ variant: 'destructive', title: 'Kamera Error', description: userMessage });
        return;
      }

      if (!currentStream) {
        onCameraPermissionChange(false);
        onScanHint('Gagal mendapatkan stream kamera setelah izin.');
        toast({ variant: 'destructive', title: 'Kamera Error', description: 'Stream kamera tidak valid.' });
        return;
      }

      onCameraPermissionChange(true);
      onScanHint("Kamera aktif. Arahkan ke barcode.");

      if (!videoRef.current) {
        console.error("BarcodeScanner: Video element ref not available.");
        stopScanAndCamera();
        onCameraPermissionChange(false);
        onScanHint('Komponen video tidak siap.');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Komponen video tidak siap.' });
        return;
      }

      videoRef.current.srcObject = currentStream;
      try {
        await videoRef.current.play();
      } catch (playError) {
        console.error("BarcodeScanner: Error playing video:", playError);
        stopScanAndCamera();
        onCameraPermissionChange(false);
        onScanHint('Gagal memulai video untuk scan.');
        toast({ variant: 'destructive', title: 'Video Error', description: 'Gagal memulai video untuk scan.' });
        return;
      }

      if (!zxingModule.BarcodeFormat || !zxingModule.DecodeHintType) {
        console.error('BarcodeScanner: BarcodeFormat or DecodeHintType not available. Cannot initialize with format hints.');
        stopScanAndCamera();
        onCameraPermissionChange(false);
        onScanHint('Komponen pemindai tidak lengkap (format/hint).');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Komponen pemindai tidak lengkap.' });
        return;
      }

      try {
        const hints = new Map();
        const formats: BarcodeFormat[] = [
          zxingModule.BarcodeFormat.QR_CODE, zxingModule.BarcodeFormat.CODE_128,
          zxingModule.BarcodeFormat.EAN_13, zxingModule.BarcodeFormat.UPC_A,
          zxingModule.BarcodeFormat.DATA_MATRIX, zxingModule.BarcodeFormat.CODE_39,
          zxingModule.BarcodeFormat.ITF
        ];
        hints.set(zxingModule.DecodeHintType.POSSIBLE_FORMATS, formats);
        hints.set(zxingModule.DecodeHintType.TRY_HARDER, true);
        
        console.log('BarcodeScanner: Attempting to instantiate BrowserMultiFormatReader with hints:', hints);
        currentReader = new zxingModule.BrowserMultiFormatReader(hints, 500);
        console.log('BarcodeScanner: BrowserMultiFormatReader instance created:', currentReader);
      } catch (readerError) {
        console.error('BarcodeScanner: Critical error during BrowserMultiFormatReader instantiation:', readerError);
        currentReader = null;
      }

      if (!currentReader || typeof currentReader.decodeFromContinuously !== 'function') {
        console.error('BarcodeScanner: Failed to create a valid Zxing reader instance. Final instance state:', currentReader);
        stopScanAndCamera();
        onCameraPermissionChange(false);
        onScanHint('Gagal menginisialisasi pemindai barcode (instance error).');
        toast({ variant: 'destructive', title: 'Scan Error', description: 'Gagal menginisialisasi pemindai barcode (instance tidak valid). Periksa konsol.' });
        return;
      }

      console.log('BarcodeScanner: Starting continuous decode...');
      if (videoRef.current) {
        currentControls = currentReader.decodeFromContinuously(
          videoRef.current,
          (result, error) => {
            if (!currentControls) { // Scanner was stopped
              return;
            }
            if (result) {
              onScanSuccess(result.getText().toUpperCase());
              onScanHint(null);
              // toast({ title: "Barcode Terdeteksi!", description: `Resi: ${result.getText()}` }); // Handled by parent
            } else if (error && zxingModule) {
              if (error instanceof zxingModule.NotFoundException) {
                onScanHint("Barcode tidak terdeteksi. Arahkan lebih jelas atau dekatkan.");
              } else if (error instanceof zxingModule.ChecksumException || error instanceof zxingModule.FormatException) {
                onScanHint("Barcode terdeteksi tetapi formatnya salah atau rusak.");
              } else {
                onScanHint("Error saat memindai barcode.");
              }
            }
          }
        );
      } else {
         console.error("BarcodeScanner: videoRef.current is null before decodeFromContinuously");
         stopScanAndCamera();
         onCameraPermissionChange(false);
         onScanHint('Komponen video hilang sebelum scan dimulai.');
         toast({variant: 'destructive', title: 'Scan Error', description: 'Video tidak siap untuk scan.'});
      }
    };

    if (isOpen) {
      initializeAndStartScanner();
    } else {
      stopScanAndCamera();
    }

    return () => {
      console.log('BarcodeScanner: useEffect cleanup (isOpen changed or unmount).');
      stopScanAndCamera();
    };
  }, [isOpen, onScanSuccess, onScanHint, onCameraPermissionChange, toast]);

  return (
    <video ref={videoRef} className="w-full h-full object-cover rounded-md" playsInline muted autoPlay />
  );
};
