export const COMMERCIAL_REQUIRED_SLOTS = [
  'front-left',
  'front-right',
  'rear-left',
  'rear-right',
  'dashboard',
  'interior-front',
  'interior-rear',
  'wheel-front-left',
  'wheel-front-right',
  'wheel-rear-left',
  'wheel-rear-right',
  'trunk',
];
export const COMMERCIAL_OPTIONAL_SLOTS = [
  'sunroof',
  'serviceBook',
  'manual',
  'accessories',
];
export const COMMERCIAL_SLOTS = [
  ...COMMERCIAL_REQUIRED_SLOTS,
  ...COMMERCIAL_OPTIONAL_SLOTS,
];
