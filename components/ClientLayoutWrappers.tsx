'use client';
import { Preloader, CRTOverlay } from '@/components/DJComponents';
import GlobalAudioPlayer from '@/components/GlobalAudioPlayer';
import SiteHeader from '@/components/SiteHeader';
import { useAudio } from '@/components/AudioProvider';

export default function ClientLayoutWrappers() {
  const { setPreloaderComplete } = useAudio();
  return (
    <>
      <Preloader onComplete={() => { if (setPreloaderComplete) setPreloaderComplete(true); }} />
      <CRTOverlay />
      <GlobalAudioPlayer />
      <SiteHeader />
    </>
  );
}
