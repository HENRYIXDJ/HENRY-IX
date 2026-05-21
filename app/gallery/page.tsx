import PageShell from '@/components/PageShell';

export default function GalleryPage() {
  return (
    <PageShell>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-black">
        <h1
          className="glitch font-sans font-bold text-primary text-[clamp(3rem,12vw,10rem)] leading-none tracking-wider uppercase select-none"
          data-text="COMING SOON"
        >
          COMING SOON
        </h1>
        <p className="mt-8 font-mono text-zinc-700 text-xs tracking-[0.5em] uppercase">
          Coming Soon
        </p>
      </div>
    </PageShell>
  );
}
