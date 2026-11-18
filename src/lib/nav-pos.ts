// Posisi bar menu (disimpan per browser). Di layar < lg bar selalu di atas (mode hamburger).
export type NavPos = 'top' | 'bottom' | 'left' | 'right';
export const NAV_POS_KEY = 'fanos-nav-pos';
export const NAV_POS_OPTIONS: { id: NavPos; label: string; icon: string }[] = [
  { id: 'top', label: 'Top', icon: 'fi fi-rr-arrow-small-up' },
  { id: 'bottom', label: 'Bottom', icon: 'fi fi-rr-arrow-small-down' },
  { id: 'left', label: 'Left', icon: 'fi fi-rr-arrow-small-left' },
  { id: 'right', label: 'Right', icon: 'fi fi-rr-arrow-small-right' },
];
export const isNavPos = (v: unknown): v is NavPos => v === 'top' || v === 'bottom' || v === 'left' || v === 'right';

// Kelas Tailwind harus string utuh (tidak boleh disusun dinamis), jadi ditulis eksplisit.
// Popover kecil rata-kanan (lonceng, menu profil) di area kanan bar.
export function cornerPopClass(pos: NavPos): string {
  switch (pos) {
    case 'bottom': return 'right-0 top-full mt-3.5 lg:top-auto lg:bottom-full lg:mt-0 lg:mb-3.5';
    case 'left': return 'right-0 top-full mt-3.5 lg:right-auto lg:left-full lg:top-auto lg:bottom-0 lg:mt-0 lg:ml-3.5';
    case 'right': return 'right-0 top-full mt-3.5 lg:right-auto lg:right-full lg:left-auto lg:top-auto lg:bottom-0 lg:mt-0 lg:mr-3.5';
    default: return 'right-0 top-full mt-3.5';
  }
}
// Panel dropdown grup menu (hanya tampil di lg ke atas).
export function groupPopClass(pos: NavPos): string {
  switch (pos) {
    case 'bottom': return 'left-0 bottom-full pb-3.5';
    case 'left': return 'left-full top-0 pl-3.5';
    case 'right': return 'right-full top-0 pr-3.5';
    default: return 'left-0 top-full pt-3.5';
  }
}
// Submenu (flyout) di dalam panel grup.
export function flyoutPopClass(pos: NavPos): string {
  const side = pos === 'right' ? 'right-full pr-3.5' : 'left-full pl-3.5';
  const v = pos === 'bottom' ? '-bottom-2.5' : '-top-2.5';
  return `${side} ${v}`;
}
