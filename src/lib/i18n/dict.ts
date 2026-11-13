// Mesin terjemahan. Kosakata ada di dua berkas terpisah:
//   locales/en.ts  -> Indonesia -> Inggris (tampilan bahasa Inggris)
//   locales/id.ts  -> Inggris -> Indonesia (tampilan bahasa Indonesia)
import { ID_EN } from './locales/en';
import { EN_ID } from './locales/id';
export { ID_EN, EN_ID };

// Frasa Indonesia -> Inggris untuk bagian dinamis pada kalimat pola.
const NOUNS: Record<string, string> = {
  akun: 'account', client: 'client', 'credit note': 'credit note', defect: 'defect', invoice: 'invoice',
  pembayaran: 'payment', pengiriman: 'delivery', produk: 'product', project: 'project',
  'project classification': 'project classification', quotation: 'quotation', reminder: 'reminder',
  retur: 'return', 'team member': 'team member', vendor: 'vendor', 'Purchase Order': 'Purchase Order',
  'Sales Order': 'Sales Order', 'BOQ Project': 'BOQ Project', role: 'role',
};
const FIELDS: Record<string, string> = {
  Nama: 'Name', 'Nama lengkap': 'Full name', 'Nama perusahaan': 'Company name', 'Nama role': 'Role name',
  'Tanggal BOQ': 'BOQ date', 'Tanggal Invoice': 'Invoice date', 'Tanggal PO': 'PO date',
  'Tanggal Quotation': 'Quotation date', 'Tanggal SO': 'SO date', 'Tanggal jatuh tempo': 'Due date',
  'Tanggal pemeriksaan': 'Inspection date', 'Tanggal retur': 'Return date', Judul: 'Title',
};
const MONTHS: Record<string, string> = {
  Jan: 'Jan', Feb: 'Feb', Mar: 'Mar', Apr: 'Apr', Mei: 'May', Jun: 'Jun', Jul: 'Jul', Agu: 'Aug', Agt: 'Aug',
  Sep: 'Sep', Okt: 'Oct', Nov: 'Nov', Des: 'Dec',
  Januari: 'January', Februari: 'February', Maret: 'March', April: 'April', Juni: 'June', Juli: 'July',
  Agustus: 'August', September: 'September', Oktober: 'October', November: 'November', Desember: 'December',
};
const VERB: Record<string, string> = { dihapus: 'deleted', diperbarui: 'updated', ditambahkan: 'added', dibuat: 'created', disimpan: 'saved' };

type Rule = [RegExp, (m: RegExpMatchArray) => string];
const RULES: Rule[] = [
  [/^Notifikasi terkirim ke (\d+) perangkat$/, (m) => `Notification sent to ${m[1]} device${m[1] === '1' ? '' : 's'}`],
  [/^membuat project$/, () => 'created the project'],
  [/^memperbarui data project$/, () => 'updated the project'],
  [/^menambahkan (.+) ke tim$/, (m) => `added ${m[1]} to the team`],
  [/^membuat task "(.*)"$/, (m) => `created task "${m[1]}"`],
  [/^memindahkan "(.*)" ke (.*)$/, (m) => `moved "${m[1]}" to ${m[2]}`],
  [/^menghapus sebuah task$/, () => 'deleted a task'],
  [/^mengomentari sebuah task$/, () => 'commented on a task'],
  [/^menulis di diskusi$/, () => 'posted in the discussion'],
  [/^menambahkan board "(.*)"$/, (m) => `added board "${m[1]}"`],
  [/^menghapus board "(.*)"$/, (m) => `deleted board "${m[1]}"`],
  [/^(.+) \((\d+) task akan dipindah ke board pertama\)$/, (m) => `${m[1]} (${m[2]} tasks will be moved to the first board)`],
  [/^Qty (.+) melebihi sisa yang belum dikemas \((.+)\)$/, (m) => `Qty ${m[1]} exceeds the remaining unpacked balance (${m[2]})`],
  [/^SKU (.+) tidak ada di Sales Order ini$/, (m) => `SKU ${m[1]} is not on this Sales Order`],
  [/^Return Invoice tersimpan\. Credit Note (Rp .+) diterbitkan$/, (m) => `Return Invoice saved. Credit Note ${m[1]} issued`],
  [/^Qty retur (.+) melebihi sisa yang dapat diretur \((.+)\)$/, (m) => `Return qty of ${m[1]} exceeds the returnable balance (${m[2]})`],
  [/^Qty retur (.+) melebihi sisa yang dapat dikreditkan \((.+)\)$/, (m) => `Return qty of ${m[1]} exceeds the creditable balance (${m[2]})`],
  [/^SKU (.+) tidak ada di invoice ini$/, (m) => `SKU ${m[1]} is not on this invoice`],
  [/^Diskon Invoice \((.+)%\)$/, (m) => `Invoice Discount (${m[1]}%)`],
  [/^Pajak Invoice \((.+)%\)$/, (m) => `Invoice Tax (${m[1]}%)`],
  [/^Memotong Piutang Invoice \(sisa (.+)\)$/, (m) => `Reducing Invoice Receivable (remaining ${m[1]})`],
  [/^Invoice tidak cukup untuk menyerap seluruh Credit Note\. Sisa (Rp .+):$/, (m) => `The invoice cannot absorb the whole Credit Note. Remaining ${m[1]}:`],
  [/^Saldo Credit Note: (Rp .+)$/, (m) => `Credit Note balance: ${m[1]}`],
  [/^Jumlah melebihi saldo Credit Note \((Rp .+)\)\.$/, (m) => `Amount exceeds the Credit Note balance (${m[1]}).`],
  [/^Sisa (Rp .+)$/, (m) => `Remaining ${m[1]}`],
  [/^Jumlah payment \+ discount melebihi sisa tagihan \((Rp .+)\)\.$/, (m) => `Payment + discount exceeds the remaining balance (${m[1]}).`],
  [/^Payment ID "(.+)" sudah dipakai\.$/, (m) => `Payment ID "${m[1]}" is already used.`],
  [/^Qty (.+) tidak boleh kurang dari qty yang sudah dikirim \((.+)\)\.$/, (m) => `Qty ${m[1]} cannot be less than the quantity already shipped (${m[2]}).`],
  [/^Apakah Anda yakin ingin menghapus (.+?) untuk$/, (m) => `Are you sure you want to delete the ${m[1]} for`],
  [/^Apakah Anda yakin ingin menghapus (PO|.+?) ke$/, (m) => `Are you sure you want to delete the ${m[1]} to`],
  [/^\?\s*Delivery Order\s+terkait akan turut terhapus\.$/, () => '? The related Delivery Orders will also be deleted.'],
  [/^Tandai Sales Order (.+) sebagai (Verified|Completed)\?$/, (m) => `Mark Sales Order ${m[1]} as ${m[2]}?`],
  [/^Status gagal diubah:\s*(.*)$/, (m) => `Failed to change status: ${m[1]}`],
  [/^Pajak(?: (.+))? \((.+)%\)$/, (m) => `Tax${m[1] ? ' ' + m[1] : ''} (${m[2]}%)`],
  [/^(\d+) produk$/, (m) => `${m[1]} product${m[1] === '1' ? '' : 's'}`],
  [/^(\d+) item$/, (m) => `${m[1]} item${m[1] === '1' ? '' : 's'}`],
  [/^(\d+) akun$/, (m) => `${m[1]} account${m[1] === '1' ? '' : 's'}`],
  [/^Belum terdapat data (discount|tax|cashback|payment method|payment term|credit limit)$/, (m) => `No ${m[1]} data yet`],
  [/^Menampilkan (.+) dari (\d+) data$/, (m) => `Showing ${m[1]} of ${m[2]} entries`],
  [/^Data (.+) berhasil (dihapus|diperbarui|ditambahkan|dibuat|disimpan)$/, (m) => `${m[1]} data ${VERB[m[2]] ? 'was ' + VERB[m[2]] : m[2]} successfully`],
  [/^(\d+) dari (\d+) menu$/, (m) => `${m[1]} of ${m[2]} menus`],
  [/^Hak Akses Menu — (.+)$/, (m) => `Menu Access Rights — ${m[1]}`],
  [/^Kolom (.+) wajib diisi\.$/, (m) => `The ${FIELDS[m[1]] ?? m[1]} field is required.`],
  [/^Belum terdapat data (.+)$/, (m) => `No ${NOUNS[m[1]] ?? m[1]} data yet`],
  [/^Mohon pilih (.+) terlebih dahulu\.?$/, (m) => `Please select ${m[1]} first.`],
  [/^Hapus (.+)$/, (m) => `Delete ${m[1]}`],
  [/^Tambah (.+)$/, (m) => `Add ${m[1]}`],
  [/^\+ Tambah (.+)$/, (m) => `+ Add ${m[1]}`],
  [/^\+ Buat (.+)$/, (m) => `+ Create ${m[1]}`],
  [/^(\d+) hasil$/, (m) => `${m[1]} results`],
  [/^Aktif \((\d+)\)$/, (m) => `Active (${m[1]})`],
  [/^Tidak Aktif \((\d+)\)$/, (m) => `Inactive (${m[1]})`],
  [/^Hari ini · (.+)$/, (m) => `Today · ${m[1]}`],
  [/^Terlambat · (.+)$/, (m) => `Overdue · ${m[1]}`],
  [/^Catatan: (.+)$/, (m) => `Notes: ${m[1]}`],
  [/^Area & Produk \((\d+) item\)$/, (m) => `Areas & Products (${m[1]} items)`],
  [/^Kata sandi (baru )?minimal (\d+) karakter$/, (m) => `${m[1] ? 'New p' : 'P'}assword must be at least ${m[2]} characters`],
  [/^SKU (.+) tidak ada di invoice ini$/, (m) => `SKU ${m[1]} is not on this invoice`],
  [/^Qty retur (.+) melebihi sisa yang dapat diretur \((.+)\)$/, (m) => `Return qty for ${m[1]} exceeds the returnable balance (${m[2]})`],
  [/^Ship Qty untuk (.+) melebihi sisa \((.+)\)$/, (m) => `Ship Qty for ${m[1]} exceeds the remaining balance (${m[2]})`],
  [/^Jumlah pembayaran melebihi sisa tagihan \((.+)\)$/, (m) => `Payment amount exceeds the outstanding balance (${m[1]})`],
  [/^Retur berhasil disimpan\. Credit Note sebesar (.+) telah diterbitkan$/, (m) => `Return saved successfully. A Credit Note of ${m[1]} has been issued`],
  [/^Warna kursor (.+)$/, (m) => `Cursor color ${m[1]}`],
  [/^(Akun|Data) gagal (dihapus|disimpan):\s*(.*)$/, (m) => `Failed to ${m[2] === 'dihapus' ? 'delete' : 'save'} ${m[1] === 'Akun' ? 'account' : 'data'}: ${m[3]}`],
  [/^Unggah berkas gagal:\s*(.*)$/, (m) => `File upload failed: ${m[1]}`],
  // Fragmen kalimat yang terpecah oleh elemen <strong>.
  [/^Apakah Anda yakin ingin menghapus (.+?)\s*$/, (m) => `Are you sure you want to delete ${m[1]} `],
  [/^\?\s*Role yang masih digunakan oleh akun tidak dapat dihapus\.$/, () => '? A role that is still used by accounts cannot be deleted.'],
  [/^\?\s*Seluruh item terkait akan turut terhapus\.$/, () => '? All related items will also be deleted.'],
  [/^\?\s*Seluruh item dan pengiriman terkait akan turut terhapus\.$/, () => '? All related items and deliveries will also be deleted.'],
  [/^terkait akan turut terhapus\.$/, () => 'will also be deleted.'],
  [/^\??\s*Tindakan ini tidak dapat dibatalkan\.$/, () => '? This action cannot be undone.'],
  [/^akan dapat masuk ke sistem lagi\. Untuk menutup akses sementara, ubah statusnya menjadi Inactive\.$/, () => 'will be able to sign in again. To suspend access temporarily, change the status to Inactive.'],
  [/^Akun login-nya tidak ikut terhapus, hanya tautan ke team member ini yang dilepas\.$/, () => 'The login account is not deleted; only the link to this team member is removed.'],
];

const MONTH_RE = new RegExp(`\\b(\\d{1,2}) (${Object.keys(MONTHS).sort((a, b) => b.length - a.length).join('|')}) (\\d{4})\\b`, 'g');

const cache = new Map<string, string>();

// Terjemahkan satu potongan teks. Spasi di awal/akhir dipertahankan.
export function translateText(raw: string): string {
  if (!raw) return raw;
  const hit = cache.get(raw);
  if (hit !== undefined) return hit;

  const lead = raw.match(/^\s*/)![0];
  const trail = raw.match(/\s*$/)![0];
  const core = raw.trim();
  let out: string | undefined;

  if (core) {
    if (ID_EN[core] !== undefined) out = ID_EN[core];
    else {
      for (const [re, fn] of RULES) {
        const m = core.match(re);
        if (m) {
          out = fn(m);
          break;
        }
      }
    }
    // Kalimat "Awalan: pesan dinamis" (mis. "Detail gagal dimuat: <pesan>"): terjemahkan awalannya saja.
    if (out === undefined) {
      const ci = core.indexOf(':');
      if (ci > 2 && ci < core.length - 1) {
        const head = core.slice(0, ci + 1);
        if (ID_EN[head] !== undefined) out = ID_EN[head] + ' ' + translateText(core.slice(ci + 1).trim());
      }
    }
    if (out === undefined && MONTH_RE.test(core)) {
      MONTH_RE.lastIndex = 0;
      out = core.replace(MONTH_RE, (_m, d, mo, y) => `${MONTHS[mo]} ${d}, ${y}`);
    }
    MONTH_RE.lastIndex = 0;
  }

  const result = out === undefined ? raw : lead + out + trail;
  if (cache.size > 5000) cache.clear();
  cache.set(raw, result);
  return result;
}


const cacheId = new Map<string, string>();
// Terjemahan untuk bahasa Indonesia: teks sumber berbahasa Inggris -> Indonesia.
export function translateTextId(raw: string): string {
  if (!raw) return raw;
  const hit = cacheId.get(raw);
  if (hit !== undefined) return hit;
  const core = raw.trim();
  const lead = raw.match(/^\s*/)![0];
  const trail = raw.match(/\s*$/)![0];
  let out = core && Object.prototype.hasOwnProperty.call(EN_ID, core) ? lead + EN_ID[core] + trail : raw;
  if (out === raw && core) {
    const ci = core.indexOf(':');
    if (ci > 2 && ci < core.length - 1) {
      const head = core.slice(0, ci + 1);
      if (Object.prototype.hasOwnProperty.call(EN_ID, head)) out = lead + EN_ID[head] + ' ' + translateTextId(core.slice(ci + 1).trim()) + trail;
    }
  }
  if (cacheId.size > 3000) cacheId.clear();
  cacheId.set(raw, out);
  return out;
}
