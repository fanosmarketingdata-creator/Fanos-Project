import { createClient } from '@/lib/supabase/server';
import { orThrowAll } from '@/lib/query';
import TermsTemplatesTable from './TermsTemplatesTable';
import type { TermsTemplate } from './actions';

export default async function Page() {
  const supabase = createClient();
  const [{ data }] = orThrowAll(await Promise.all([
    supabase.from('quotation_terms_templates').select('id, name, lang, content, is_default').order('name'),
  ]));
  return <TermsTemplatesTable initialRows={(data ?? []) as TermsTemplate[]} />;
}
