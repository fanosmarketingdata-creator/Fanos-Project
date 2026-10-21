-- Status Sales Order: DRAFT -> VERIFIED -> COMPLETED (diubah manual).
-- JALANKAN FILE INI SENDIRI (satu kali), LALU jalankan 0016 di query terpisah.
alter type doc_status add value if not exists 'VERIFIED';
