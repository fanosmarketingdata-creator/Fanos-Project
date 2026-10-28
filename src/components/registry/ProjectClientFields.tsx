'use client';

import { useEffect, useState } from 'react';
import SearchSelect from '@/components/registry/SearchSelect';
import { FvField } from '@/components/registry/RegistryModal';
import { ClientQuickModal, ProjectQuickModal } from '@/components/registry/QuickAddModals';
import { getProjectClientLookups } from '@/lib/quick-add-actions';

type Proj = { id: string; name: string; client_id: string | null };
type Cli = { id: string; company: string };

// Pilih Project (dari Master Project) dan Client, masing-masing dengan tombol tambah baru
// yang membuka form lengkap seperti di Master Data. Dipakai di BOQ Project dan Quotation manual.
export default function ProjectClientFields({
  projectName,
  clientId,
  onProjectName,
  onClientId,
  fallbackClients = [],
  hideProject,
}: {
  projectName: string;
  clientId: string;
  onProjectName: (name: string) => void;
  onClientId: (id: string) => void;
  fallbackClients?: { id: string; project_name: string }[];
  hideProject?: boolean; // Quotation dari BOQ: project mengikuti BOQ, hanya Client yang tampil
}) {
  const [projects, setProjects] = useState<Proj[]>([]);
  const [clients, setClients] = useState<Cli[]>(fallbackClients.map((c) => ({ id: c.id, company: c.project_name })));
  const [addProject, setAddProject] = useState(false);
  const [addClient, setAddClient] = useState(false);

  useEffect(() => {
    getProjectClientLookups()
      .then((d) => { setProjects(d.projects); setClients(d.clients.map((c) => ({ id: c.id, company: c.company }))); })
      .catch(() => {});
  }, []);

  const current = projects.find((p) => p.name.trim().toLowerCase() === projectName.trim().toLowerCase());
  // Nama project lama yang belum ada di Master tetap tampil sebagai pilihan.
  const projOptions = [
    ...projects.map((p) => ({ value: p.id, label: p.name })),
    ...(projectName.trim() && !current ? [{ value: '__current', label: projectName }] : []),
  ];

  return (
    <>
      {!hideProject && (
      <FvField label="Nama Project" required>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchSelect
              value={current?.id ?? (projectName.trim() ? '__current' : '')}
              onChange={(v) => {
                if (v === '__current') return;
                const p = projects.find((x) => x.id === v);
                onProjectName(p?.name ?? '');
                if (p?.client_id) onClientId(p.client_id);
              }}
              options={projOptions}
              placeholder="Pilih / cari project..."
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setAddProject(true)} title="Tambah project baru">
            <i className="fi fi-rr-plus" /> Baru
          </button>
        </div>
      </FvField>
      )}
      <FvField label="Client" required>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchSelect
              value={clientId}
              onChange={(v) => onClientId(v)}
              options={clients.map((c) => ({ value: c.id, label: c.company }))}
              placeholder="Cari client..."
            />
          </div>
          <button type="button" className="btn btn-secondary" onClick={() => setAddClient(true)} title="Tambah client baru">
            <i className="fi fi-rr-plus" /> Baru
          </button>
        </div>
      </FvField>

      {addProject && (
        <ProjectQuickModal
          defaultClientId={clientId}
          onClose={() => setAddProject(false)}
          onSaved={(p) => {
            setProjects((prev) => [{ id: p.id, name: p.name, client_id: p.client_id }, ...prev]);
            onProjectName(p.name);
            if (p.client_id) onClientId(p.client_id);
            setAddProject(false);
          }}
        />
      )}
      {addClient && (
        <ClientQuickModal
          onClose={() => setAddClient(false)}
          onSaved={(c) => {
            setClients((prev) => [...prev, { id: c.id, company: c.company }]);
            onClientId(c.id);
            setAddClient(false);
          }}
        />
      )}
    </>
  );
}
