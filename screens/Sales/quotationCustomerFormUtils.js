/**
 * Build POST/PUT /customers body from quotation form fields.
 * Omits empty optionals; nested address only when at least one line is set.
 */
export function buildCustomerPayload(v) {
  const body = {
    name: v.name.trim(),
    phone: v.phone.trim(),
    type: v.type === 'wholesale' ? 'wholesale' : 'retail',
  };

  const email = (v.email || '').trim();
  if (email) body.email = email;

  const alt = (v.alternatePhone || '').trim();
  if (alt) body.alternatePhone = alt;

  const company = (v.company || '').trim();
  if (company) body.company = company;

  const taxNumber = (v.taxNumber || '').trim();
  if (taxNumber) body.taxNumber = taxNumber;

  const notes = (v.notes || '').trim();
  if (notes) body.notes = notes;

  const street = (v.street || '').trim();
  const city = (v.city || '').trim();
  const state = (v.state || '').trim();
  const postalCode = (v.postalCode || '').trim();
  const country = (v.country || '').trim();

  if (street || city || state || postalCode || country) {
    body.address = {};
    if (street) body.address.street = street;
    if (city) body.address.city = city;
    if (state) body.address.state = state;
    if (postalCode) body.address.postalCode = postalCode;
    body.address.country = country || 'USA';
  }

  return body;
}

/** Loose check; server validates with Mongoose. */
export function isProbablyValidEmail(email) {
  const s = (email || '').trim();
  if (!s) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
