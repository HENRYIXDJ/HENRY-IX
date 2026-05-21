'use client';
import { Preloader, CRTOverlay } from '@/components/DJComponents';
import SiteHeader from '@/components/SiteHeader';
import { useAudioStore } from '@/store/audioStore';

export default function ClientLayoutWrappers() {
  const setPreloaderComplete = useAudioStore(s => s.setPreloaderComplete);
  return (
    <>
      <Preloader onComplete={() => setPreloaderComplete(true)} />
      <CRTOverlay />
      <SiteHeader />
    </>
  );
}
