'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { name: 'MIXES', href: '/mixes' },
  { name: 'GALLERY', href: '/gallery' },
  { name: 'EVENTS', href: '/events' },
  { name: 'CONTACT', href: '/contact' },
];

const pageTitles: Record<string, string> = {
  '/mixes': '01 / MIXES',
  '/gallery': '02 / GALLERY',
  '/events': '03 / EVENTS',
  '/contact': '04 / CONTACT',
};

export default function SiteHeader() {
  const pathname = usePathname();
  const title = pageTitles[pathname] || '';

  return (
    <header className="fixed top-0 left-0 w-full h-16 z-50 bg-black border-b border-zinc-900 flex items-center justify-between px-6">
      {/* Left: Section Title */}
      <div className="font-mono text-xs tracking-[0.2em] font-semibold uppercase text-zinc-400 w-1/3 flex justify-start">
        {title}
      </div>

      {/* Center: Logo */}
      <div className="w-1/3 flex justify-center">
        <Link
          href="/"
          className="glitch font-sans font-bold text-2xl text-primary cursor-pointer select-none"
          data-text="HENRY IX"
        >
          HENRY IX
        </Link>
      </div>

      {/* Right: Navigation */}
      <nav className="w-1/3 flex items-center justify-end gap-6">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-mono text-[10px] tracking-widest uppercase transition-colors ${
              pathname === link.href
                ? 'text-primary'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {link.name}
          </Link>
        ))}
      </nav>
    </header>
  );
}
