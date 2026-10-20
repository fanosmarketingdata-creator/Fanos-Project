export type Lang = 'en' | 'id';
export const LANG_COOKIE = 'lang';
export const DEFAULT_LANG: Lang = 'en';

export function parseLang(v: string | undefined | null): Lang {
  return v === 'id' ? 'id' : 'en';
}

// Simpan pilihan bahasa lalu muat ulang agar server merender ulang dengan bahasa tersebut.
export function setLang(lang: Lang) {
  document.cookie = `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
