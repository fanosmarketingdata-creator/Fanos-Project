'use client';

import { useLang } from '@/components/I18nProvider';
import Select, { Flag } from '@/components/ui/Select';

type C = { iso: string; dial: string; en: string; id: string };
export const COUNTRIES: C[] = [
  { iso: 'ID', dial: '62', en: 'Indonesia', id: 'Indonesia' },
  { iso: 'MY', dial: '60', en: 'Malaysia', id: 'Malaysia' },
  { iso: 'SG', dial: '65', en: 'Singapore', id: 'Singapura' },
  { iso: 'TH', dial: '66', en: 'Thailand', id: 'Thailand' },
  { iso: 'PH', dial: '63', en: 'Philippines', id: 'Filipina' },
  { iso: 'VN', dial: '84', en: 'Vietnam', id: 'Vietnam' },
  { iso: 'BN', dial: '673', en: 'Brunei', id: 'Brunei' },
  { iso: 'AU', dial: '61', en: 'Australia', id: 'Australia' },
  { iso: 'NZ', dial: '64', en: 'New Zealand', id: 'Selandia Baru' },
  { iso: 'JP', dial: '81', en: 'Japan', id: 'Jepang' },
  { iso: 'KR', dial: '82', en: 'South Korea', id: 'Korea Selatan' },
  { iso: 'CN', dial: '86', en: 'China', id: 'Tiongkok' },
  { iso: 'HK', dial: '852', en: 'Hong Kong', id: 'Hong Kong' },
  { iso: 'TW', dial: '886', en: 'Taiwan', id: 'Taiwan' },
  { iso: 'IN', dial: '91', en: 'India', id: 'India' },
  { iso: 'PK', dial: '92', en: 'Pakistan', id: 'Pakistan' },
  { iso: 'BD', dial: '880', en: 'Bangladesh', id: 'Bangladesh' },
  { iso: 'AE', dial: '971', en: 'United Arab Emirates', id: 'Uni Emirat Arab' },
  { iso: 'SA', dial: '966', en: 'Saudi Arabia', id: 'Arab Saudi' },
  { iso: 'QA', dial: '974', en: 'Qatar', id: 'Qatar' },
  { iso: 'TR', dial: '90', en: 'Turkey', id: 'Turki' },
  { iso: 'EG', dial: '20', en: 'Egypt', id: 'Mesir' },
  { iso: 'ZA', dial: '27', en: 'South Africa', id: 'Afrika Selatan' },
  { iso: 'GB', dial: '44', en: 'United Kingdom', id: 'Inggris' },
  { iso: 'DE', dial: '49', en: 'Germany', id: 'Jerman' },
  { iso: 'FR', dial: '33', en: 'France', id: 'Prancis' },
  { iso: 'NL', dial: '31', en: 'Netherlands', id: 'Belanda' },
  { iso: 'IT', dial: '39', en: 'Italy', id: 'Italia' },
  { iso: 'ES', dial: '34', en: 'Spain', id: 'Spanyol' },
  { iso: 'BR', dial: '55', en: 'Brazil', id: 'Brasil' },
  { iso: 'US', dial: '1', en: 'United States / Canada', id: 'Amerika Serikat / Kanada' },
];

/** 811 5007 036 -> 811-5007-036 (3 angka pertama, lalu per 4 angka). */
function group(d: string) {
  if (!d) return '';
  const parts = [d.slice(0, 3)];
  for (let i = 3; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join('-');
}

/** Baca nilai tersimpan (+62 811-5007-036, 0811-..., 62811...) -> negara + angka lokal. */
export function parsePhone(v: string | null | undefined): { dial: string; local: string } {
  const raw = (v || '').trim();
  if (!raw) return { dial: '62', local: '' };
  const digits = raw.replace(/\D/g, '');
  if (raw.startsWith('+') || raw.startsWith('00')) {
    const d = raw.startsWith('00') ? digits.slice(2) : digits;
    const hit = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).find((c) => d.startsWith(c.dial));
    if (hit) return { dial: hit.dial, local: d.slice(hit.dial.length).replace(/^0+/, '') };
    return { dial: '62', local: d };
  }
  if (digits.startsWith('0')) return { dial: '62', local: digits.replace(/^0+/, '') };
  if (digits.startsWith('62') && digits.length > 9) return { dial: '62', local: digits.slice(2) };
  return { dial: '62', local: digits };
}

export const buildPhone = (dial: string, local: string) => (local ? `+${dial} ${group(local)}` : '');

/** Pilih negara + isi nomor tanpa angka 0 di depan; otomatis dipisah dengan "-". Disimpan sebagai "+62 811-5007-036". */
export default function PhoneInput({ value, onChange, disabled, inputClassName }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; inputClassName?: string;
}) {
  const lang = useLang();
  const { dial, local } = parsePhone(value);
  const cur = COUNTRIES.find((c) => c.dial === dial) || COUNTRIES[0];
  const nm = (c: C) => (lang === 'id' ? c.id : c.en);
  return (
    <div className="ph-wrap">
      <Select
        value={cur.iso}
        disabled={disabled}
        className="ph-trigger"
        searchable
        searchPlaceholder={lang === 'id' ? 'Cari negara...' : 'Search country...'}
        popMinWidth={250}
        listMaxHeight={216}
        triggerContent={<span className="ph-cur"><Flag iso={cur.iso} /><b>+{cur.dial}</b></span>}
        onChange={(e) => onChange(buildPhone(COUNTRIES.find((c) => c.iso === e.target.value)!.dial, local))}
      >
        {COUNTRIES.map((c) => <option key={c.iso} value={c.iso} data-flag={c.iso} data-sub={`+${c.dial}`}>{nm(c)}</option>)}
      </Select>
      <input
        className={inputClassName}
        inputMode="numeric"
        disabled={disabled}
        value={group(local)}
        placeholder="811-5007-036"
        onChange={(e) => onChange(buildPhone(cur.dial, e.target.value.replace(/\D/g, '').replace(/^0+/, '').slice(0, 14)))}
      />
    </div>
  );
}
