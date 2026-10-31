export type ContactInfo = { name: string; position: string; phone: string; email: string };

export const emptyContact = (): ContactInfo => ({ name: '', position: '', phone: '', email: '' });

export const contactFilled = (c: Partial<ContactInfo>) => !!(c.name?.trim() || c.position?.trim() || c.phone?.trim() || c.email?.trim());

// Ambil daftar kontak dari baris client (kolom contacts, atau kolom lama bila belum ada).
export function contactsOf(c: { contacts?: unknown; contact_name?: string | null; position?: string | null; phone?: string | null; email?: string | null }): ContactInfo[] {
  if (Array.isArray(c.contacts) && c.contacts.length > 0) {
    return (c.contacts as Partial<ContactInfo>[]).map((x) => ({ name: x.name || '', position: x.position || '', phone: x.phone || '', email: x.email || '' }));
  }
  const legacy = { name: c.contact_name || '', position: c.position || '', phone: c.phone || '', email: c.email || '' };
  return contactFilled(legacy) ? [legacy] : [emptyContact()];
}
