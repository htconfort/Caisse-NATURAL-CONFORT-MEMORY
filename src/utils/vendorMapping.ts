export const VENDOR_ID: Record<string, string> = {
  Sylvie: 'sylvie',
  Lucia: 'lucia',
  Billy: 'billy',
  Babette: 'babette',
  Sabrina: 'sabrina',
};

export function resolveVendor(rawName: unknown): { vendorId: string; vendorName: string } {
  const name = String(rawName ?? '').trim();
  if (name && VENDOR_ID[name]) {
    return { vendorId: VENDOR_ID[name], vendorName: name };
  }
  if (name) {
    const vendorId = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '');
    return { vendorId, vendorName: name };
  }
  return { vendorId: 'sylvie', vendorName: 'Sylvie' };
}


