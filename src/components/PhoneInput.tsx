'use client';

import { useMemo, useState } from 'react';
import { useLang } from '@/components/I18nProvider';
import Select, { Flag } from '@/components/ui/Select';

type C = { iso: string; dial: string };
// Kode negara (ISO-3166) + kode telepon. Nama negara diambil dari Intl.DisplayNames sesuai bahasa aktif.
const RAW = 'AF93 AL355 DZ213 AD376 AO244 AG1268 AR54 AM374 AU61 AT43 AZ994 BS1242 BH973 BD880 BB1246 BY375 BE32 BZ501 BJ229 BT975 BO591 BA387 BW267 BR55 BN673 BG359 BF226 BI257 CV238 KH855 CM237 CA1 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CR506 CI225 HR385 CU53 CY357 CZ420 DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FJ679 FI358 FR33 GA241 GM220 GE995 DE49 GH233 GR30 GD1473 GT502 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 IL972 IT39 JM1876 JP81 JO962 KZ7 KE254 KI686 KP850 KR82 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MR222 MU230 MX52 FM691 MD373 MC377 MN976 ME382 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NZ64 NI505 NE227 NG234 MK389 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RO40 RU7 RW250 KN1869 LC1758 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SK421 SI386 SB677 SO252 ZA27 SS211 ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TO676 TT1868 TN216 TR90 TM993 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VA379 VE58 VN84 YE967 ZM260 ZW263 XK383';
const PRIORITY = ['ID', 'MY', 'SG', 'TH', 'PH', 'VN', 'BN', 'AU', 'JP', 'KR', 'CN', 'IN', 'US'];
export const COUNTRIES: C[] = RAW.split(' ').map((t) => ({ iso: t.slice(0, 2), dial: t.slice(2) }));

const byDial = (dial: string) => COUNTRIES.find((c) => c.dial === dial && ['US', 'RU'].includes(c.iso)) || COUNTRIES.find((c) => c.dial === dial);

const dn: Record<string, Intl.DisplayNames | null> = {};
function countryName(iso: string, lang: string): string {
  try {
    dn[lang] ??= new Intl.DisplayNames([lang], { type: 'region' });
    return dn[lang]!.of(iso) || iso;
  } catch { return iso; }
}
function sortedCountries(lang: string): C[] {
  const top = PRIORITY.map((i) => COUNTRIES.find((c) => c.iso === i)!);
  const rest = COUNTRIES.filter((c) => !PRIORITY.includes(c.iso)).sort((a, b) => countryName(a.iso, lang).localeCompare(countryName(b.iso, lang), lang));
  return [...top, ...rest];
}

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
    const hit = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length).map((c) => (d.startsWith(c.dial) ? byDial(c.dial) : undefined)).find(Boolean);
    if (hit) return { dial: hit.dial, local: d.slice(hit.dial.length).replace(/^0+/, '') };
    return { dial: '62', local: d };
  }
  if (digits.startsWith('0')) return { dial: '62', local: digits.replace(/^0+/, '') };
  if (digits.startsWith('62') && digits.length > 9) return { dial: '62', local: digits.slice(2) };
  return { dial: '62', local: digits };
}

/** Tampilan nomor + bendera negara (untuk daftar & detail). */
export function PhoneText({ value }: { value: string | null | undefined }) {
  if (!value || !value.trim()) return <>-</>;
  const { dial, local } = parsePhone(value);
  const c = byDial(dial) || COUNTRIES.find((x) => x.iso === 'ID')!;
  const shown = value.trim().startsWith('+') ? value.trim() : buildPhone(dial, local) || value;
  return <span className="ph-text"><Flag iso={c.iso} />{shown}</span>;
}

export const buildPhone = (dial: string, local: string) => (local ? `+${dial} ${group(local)}` : '');

/** Pilih negara + isi nomor tanpa angka 0 di depan; otomatis dipisah dengan "-". Disimpan sebagai "+62 811-5007-036". */
export default function PhoneInput({ value, onChange, disabled, inputClassName }: {
  value: string; onChange: (v: string) => void; disabled?: boolean; inputClassName?: string;
}) {
  const lang = useLang();
  const { dial, local } = parsePhone(value);
  const [pick, setPick] = useState<string | null>(null);
  const byPick = pick ? COUNTRIES.find((c) => c.iso === pick && (!local || c.dial === dial)) : undefined;
  const cur = byPick || byDial(dial) || COUNTRIES.find((c) => c.iso === 'ID')!;
  const nm = (c: C) => countryName(c.iso, lang === 'id' ? 'id' : 'en');
  const list = useMemo(() => sortedCountries(lang === 'id' ? 'id' : 'en'), [lang]);
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
        onChange={(e) => { setPick(e.target.value); onChange(buildPhone(COUNTRIES.find((c) => c.iso === e.target.value)!.dial, local)); }}
      >
        {list.map((c) => <option key={c.iso} value={c.iso} data-flag={c.iso} data-sub={`+${c.dial}`}>{nm(c)}</option>)}
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
