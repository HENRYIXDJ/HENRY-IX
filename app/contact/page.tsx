'use client';

import PageShell from '@/components/PageShell';
import { ContactForm, MailingList, SocialLinks } from '@/components/ContentSections';

export default function ContactPage() {
  return (
    <PageShell>
      <ContactForm isDepth={true} />
      <MailingList isDepth={true} />
      <SocialLinks isDepth={true} />
    </PageShell>
  );
}
