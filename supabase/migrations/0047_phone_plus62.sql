-- 0047: Ubah nomor telepon lama (0811-..., 62811..., 811...) menjadi format internasional "+62 811-5007-036".
-- Aman dijalankan berulang (nomor yang sudah diawali "+" tidak diubah). Nomor berisi huruf, "/", "," atau ";"
-- (mis. dua nomor dalam satu kolom) sengaja DIBIARKAN agar tidak rusak.
--
-- Pratinjau sebelum menjalankan (opsional):
--   select phone, public.normalize_phone_id(phone) from public.clients where phone is distinct from public.normalize_phone_id(phone);

create or replace function public.normalize_phone_id(p text)
returns text
language plpgsql
immutable
as $$
declare
  raw text := btrim(coalesce(p, ''));
  d text;
  out text;
  i int;
begin
  if raw = '' then return p; end if;
  if raw like '+%' or raw like '00%' then return p; end if;     -- sudah internasional / negara lain
  if raw ~ '[A-Za-z/,;]' then return p; end if;                  -- bukan satu nomor tunggal
  d := regexp_replace(raw, '\D', '', 'g');
  if d like '62%' and length(d) > 9 then d := substr(d, 3); end if;
  d := regexp_replace(d, '^0+', '');
  if length(d) < 7 or length(d) > 13 then return p; end if;      -- panjang tidak wajar, jangan diubah
  out := substr(d, 1, 3);
  i := 4;
  while i <= length(d) loop
    out := out || '-' || substr(d, i, 4);
    i := i + 4;
  end loop;
  return '+62 ' || out;
end;
$$;

update public.clients      set phone = public.normalize_phone_id(phone) where phone is distinct from public.normalize_phone_id(phone);
update public.vendors      set phone = public.normalize_phone_id(phone) where phone is distinct from public.normalize_phone_id(phone);
update public.profiles     set phone = public.normalize_phone_id(phone) where phone is distinct from public.normalize_phone_id(phone);
update public.team_members set phone = public.normalize_phone_id(phone) where phone is distinct from public.normalize_phone_id(phone);

-- Kontak tambahan client (jsonb: [{name, position, phone, email}, ...])
update public.clients c
set contacts = (
  select coalesce(jsonb_agg(
    case when jsonb_typeof(e) = 'object' and e ? 'phone'
         then jsonb_set(e, '{phone}', to_jsonb(public.normalize_phone_id(e->>'phone')))
         else e end
    order by ord), '[]'::jsonb)
  from jsonb_array_elements(c.contacts) with ordinality as t(e, ord)
)
where jsonb_typeof(c.contacts) = 'array' and jsonb_array_length(c.contacts) > 0;

notify pgrst, 'reload schema';
