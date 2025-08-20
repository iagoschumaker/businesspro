import React, { useEffect, useRef, useState } from 'react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import { companyService } from '../../services/api';
import type { CompanyProfile } from '../../services/api';
import { toast } from 'react-hot-toast';

const CompanyProfile: React.FC = () => {
  const [form, setForm] = useState<CompanyProfile>({});
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [ieMissing, setIeMissing] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const isDirtyRef = useRef(false);
  const savingRef = useRef(false);
  const setEditingFlag = (v: boolean) => {
    try { (window as any).__bpEditingCompanyProfile = v === true; } catch {}
  };
  const lastScrollYRef = useRef<number | null>(null);
  const restoreTimerRef = useRef<number | null>(null);
  
  // Refs for uncontrolled inputs to prevent external interference
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const currentValues = useRef<CompanyProfile>({});

  // Debug flag: when true, block localStorage writes to 'companyProfile' while editing
  const DEBUG_BLOCK_PROFILE_LOCALSTORAGE = true;
  const DRAFT_KEY = 'companyProfile_draft';

  useEffect(() => {
    (async () => {
      // Prefer a draft if one exists to avoid losing text during unexpected remounts
      let draft: CompanyProfile | null = null;
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        draft = raw ? (JSON.parse(raw) as CompanyProfile) : null;
      } catch {}
      if (draft && Object.keys(draft).length) {
        setForm(draft);
        currentValues.current = { ...draft };
      } else {
        const data = await companyService.getProfile();
        setForm(data || {});
        currentValues.current = { ...data };
      }
      // Sync input values after mount
      setTimeout(() => {
        Object.keys(currentValues.current).forEach(key => {
          const input = inputRefs.current[key];
          if (input) {
            input.value = (currentValues.current as any)[key] || '';
          }
        });
      }, 0);
    })();
    try { console.debug('[CompanyProfile] mount'); } catch {}
    return () => {
      // ensure flag is cleared when leaving the page
      setEditingFlag(false);
      try { console.debug('[CompanyProfile] unmount'); } catch {}
    };
  }, []);

  // Wrap localStorage.setItem to debug/optionally block unintended writes while editing
  useEffect(() => {
    // Always take the original from the prototype to avoid already-patched versions
    const originalSetItem: (key: string, value: string) => void = (key: string, value: string) => {
      return (Storage.prototype.setItem as any).call(localStorage, key, value);
    };
    const patched: typeof localStorage.setItem = ((key: string, value: string) => {
      if (key === 'companyProfile') {
        try {
          // eslint-disable-next-line no-console
          console.debug('[CompanyProfile][Debug] localStorage.setItem("companyProfile") called', {
            isDirty: isDirtyRef.current,
            saving: savingRef.current,
            valuePreview: (() => { try { return JSON.parse(value); } catch { return value?.slice?.(0, 200); } })(),
            stack: new Error().stack,
          });
        } catch {}
        if (DEBUG_BLOCK_PROFILE_LOCALSTORAGE && isDirtyRef.current && !savingRef.current) {
          // Block write during typing to avoid visual autosave effects
          try { console.warn('[CompanyProfile][Debug] Blocked localStorage write to companyProfile while editing'); } catch {}
          return undefined as any;
        }
      }
      return (originalSetItem as any)(key, value);
    }) as any;
    try { (localStorage as any)._bp_originalSetItem = localStorage.setItem; } catch {}
    try { localStorage.setItem = patched as any; } catch {}
    return () => {
      // restore
      try {
        const orig = (localStorage as any)._bp_originalSetItem as typeof localStorage.setItem | undefined;
        if (orig && typeof orig === 'function') {
          localStorage.setItem = orig as any;
        } else {
          // fallback to prototype
          localStorage.setItem = (Storage.prototype.setItem as any).bind(localStorage);
        }
      } catch {
        try { localStorage.setItem = (Storage.prototype.setItem as any).bind(localStorage); } catch {}
      }
    };
  }, []);

  const handleInputChange = (name: string, value: string) => {
    // Update current values ref immediately
    currentValues.current = { ...currentValues.current, [name]: value };
    
    // Persist draft to survive unexpected remounts
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(currentValues.current)); } catch {}
    
    if (name === 'ie') {
      setIeMissing(!value);
    }
    if (!isDirtyRef.current) {
      isDirtyRef.current = true;
      setEditingFlag(true);
    }
  };


  // After form updates during editing, attempt to restore previous scroll position
  useEffect(() => {
    if (!isDirtyRef.current || savingRef.current) return;
    const y = lastScrollYRef.current;
    if (typeof y === 'number') {
      // restore on next tick to allow layout to settle
      if (restoreTimerRef.current) {
        try { window.clearTimeout(restoreTimerRef.current); } catch {}
      }
      restoreTimerRef.current = window.setTimeout(() => {
        try { window.scrollTo({ top: y, left: 0, behavior: 'instant' as any }); } catch { try { window.scrollTo(0, y); } catch {} }
      }, 0);
    }
    return () => {
      if (restoreTimerRef.current) {
        try { window.clearTimeout(restoreTimerRef.current); } catch {}
        restoreTimerRef.current = null;
      }
    };
  }, [form]);

  const openLogo = () => {
    const url = form.logoUrl || '';
    if (!url) return;
    const isHttp = /^https?:\/\//i.test(url);
    const isData = /^data:/i.test(url);
    if (isHttp) {
      // prefer anchor click for better popup compatibility
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
      return;
    }
    if (isData) {
      const win = window.open('', '_blank');
      if (!win) {
        toast.error('Popup bloqueado. Permita popups para abrir a imagem.');
        return;
      }
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>Logo</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>html,body{margin:0;height:100%;background:#111} .wrap{height:100%;display:flex;align-items:center;justify-content:center} img{max-width:100%;max-height:100%;}</style>
      </head><body><div class="wrap"><img src="${url}" alt="Logo" /></div></body></html>`;
      win.document.open();
      win.document.write(html);
      win.document.close();
      return;
    }
    // Fallback: tenta abrir com window.open
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSave = async () => {
    savingRef.current = true;
    // Allow cache writes during explicit save by clearing the global editing flag
    setEditingFlag(false);
    try { (window as any).__bpAllowSaveCompanyProfile = true; } catch {}
    setSaving(true);
    try {
      const toastId = toast.loading('Salvando perfil...');
      // Debug: ver o objeto que estamos salvando
      // Collect current values from inputs before saving
      const finalForm = { ...currentValues.current };
      console.debug('[CompanyProfile] Saving profile', finalForm);
      const saved = await companyService.saveProfile(finalForm);
      setForm(saved);
      currentValues.current = { ...saved };
      // Sync input values with saved data
      Object.keys(saved).forEach(key => {
        const input = inputRefs.current[key];
        if (input) {
          input.value = (saved as any)[key] || '';
        }
      });
      // Reset dirty state after an explicit successful save
      isDirtyRef.current = false;
      try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
      toast.success('Perfil salvo com sucesso', { id: toastId });
    } catch {
      toast.error('Falha ao salvar perfil');
    } finally {
      setSaving(false);
      savingRef.current = false;
      try { (window as any).__bpAllowSaveCompanyProfile = false; } catch {}
    }
  };

  const onlyDigits = (s?: string) => String(s || '').replace(/\D+/g, '');

  const handleFetchCNPJ = async () => {
    const raw = form.cnpj || '';
    const digits = onlyDigits(raw);
    if (digits.length !== 14) {
      toast.error('Informe um CNPJ válido (14 dígitos).');
      return;
    }
    setCnpjLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      const est = (data && typeof data === 'object' && (data as any).estabelecimento) || {};

      const enderecoParts = [
        est.logradouro || data.logradouro,
        est.numero || data.numero,
        est.complemento || data.complemento,
        est.bairro || data.bairro,
      ].filter(Boolean);

      // Try to resolve IE from multiple possible fields and prefer the active IE for the company's UF
      const iesList = (
        (Array.isArray(est.inscricoes_estaduais) ? est.inscricoes_estaduais : [])
          .concat(Array.isArray((data as any).inscricoes_estaduais) ? (data as any).inscricoes_estaduais : [])
      ).filter(Boolean);
      const companyUF = (est.uf || est.estado || data.uf || form.estado || '').toString().toUpperCase();
      const iePickFromList = (() => {
        if (iesList.length === 0) return undefined;
        // Normalize entries
        const norm: { ie: string; uf: string; ativo: boolean }[] = iesList.map((e: any) => ({
          ie: e?.inscricao_estadual || e?.ie || '',
          uf: (e?.estado || e?.uf || '').toString().toUpperCase(),
          ativo: e?.ativo === true || e?.ativo === 'Ativa' || e?.situacao === 'ATIVA',
        }));
        // Prefer active and UF match
        const byUfActive = norm.find((n: {ie:string; uf:string; ativo:boolean}) => n.ie && companyUF && n.uf === companyUF && n.ativo);
        if (byUfActive) return byUfActive.ie;
        const byUf = norm.find((n: {ie:string; uf:string; ativo:boolean}) => n.ie && companyUF && n.uf === companyUF);
        if (byUf) return byUf.ie;
        const anyActive = norm.find((n: {ie:string; uf:string; ativo:boolean}) => n.ie && n.ativo);
        if (anyActive) return anyActive.ie;
        const first = norm.find((n: {ie:string; uf:string; ativo:boolean}) => n.ie);
        return first?.ie;
      })();
      let ieValue: string | undefined = est.inscricao_estadual || (iePickFromList as string | undefined) || data.inscricao_estadual || data.ie;
      const isIsento = (v?: string) => typeof v === 'string' && v.trim().toUpperCase().startsWith('ISENT');
      if (!ieValue && isIsento(est.inscricao_estadual)) ieValue = 'ISENTO';
      if (!ieValue && isIsento(data.inscricao_estadual)) ieValue = 'ISENTO';
      if (!ieValue && isIsento(data.ie)) ieValue = 'ISENTO';

      // Resolve phone from multiple possibilities and format
      const rawPhone = est.telefone1 || est.telefone || data.telefone || data.ddd_telefone_1 || data.ddd_telefone || '';
      const digitsPhone = onlyDigits(rawPhone);
      const fmtPhone = (() => {
        if (digitsPhone.length === 11) return `(${digitsPhone.slice(0,2)}) ${digitsPhone.slice(2,7)}-${digitsPhone.slice(7)}`;
        if (digitsPhone.length === 10) return `(${digitsPhone.slice(0,2)}) ${digitsPhone.slice(2,6)}-${digitsPhone.slice(6)}`;
        if (digitsPhone.length > 0 && digitsPhone.length < 10) return digitsPhone; // evita formatar incorretamente
        return rawPhone || '';
      })();

      // Fallback 2: tentar outra API pública (publica.cnpj.ws) se IE ainda não encontrada
      if (!ieValue) {
        try {
          const res2 = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`);
          if (res2.ok) {
            const data2 = await res2.json();
            const est2 = (data2 && data2.estabelecimento) || {};
            const ies2 = Array.isArray(est2.inscricoes_estaduais) ? est2.inscricoes_estaduais : [];
            const norm2: { ie: string; uf: string; ativo: boolean }[] = ies2.map((e: any) => {
              const estadoObj = e?.estado;
              const ufFromEstado = typeof estadoObj === 'object' && estadoObj ? estadoObj.sigla : estadoObj;
              return {
                ie: String(e?.inscricao_estadual || e?.ie || ''),
                uf: String(ufFromEstado || e?.uf || '').toUpperCase(),
                ativo: e?.ativo === true || String(e?.situacao || '').toUpperCase() === 'ATIVA',
              };
            });
            const estEstadoObj = est2?.estado;
            const estUf = typeof estEstadoObj === 'object' && estEstadoObj ? estEstadoObj.sigla : (est2?.uf || est2?.estado);
            const uf = String(estUf || data2?.uf || '').toUpperCase();
            const pick = norm2.find((n) => n.ie && uf && n.uf === uf && n.ativo)
              || norm2.find((n) => n.ie && uf && n.uf === uf)
              || norm2.find((n) => n.ie && n.ativo)
              || norm2.find((n) => n.ie);
            ieValue = pick?.ie || ieValue;
            if (!ieValue && norm2.some(n => isIsento(n.ie))) {
              ieValue = 'ISENTO';
            }
            // também podemos complementar e-mail/telefone/endereço se vierem vazios
            if (!rawPhone && (est2.telefone1 || est2.telefone)) {
              const rp = est2.telefone1 || est2.telefone;
              const d = onlyDigits(rp);
              if (d.length === 11) {
                setForm((p) => ({ ...p, telefone: `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`}));
              } else if (d.length === 10) {
                setForm((p) => ({ ...p, telefone: `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`}));
              } else {
                setForm((p) => ({ ...p, telefone: rp }));
              }
            }
            if (!form.email && est2.email) setForm((p) => ({ ...p, email: est2.email }));
            if (!enderecoParts.length && (est2.logradouro || est2.numero || est2.bairro)) {
              // nota: não sobrescreveremos aqui; manteremos preenchimento consistente abaixo
            }
          }
        } catch {}
      }

      if (isIsento(ieValue)) {
        ieValue = 'ISENTO';
        toast.success('IE marcada como ISENTO pela base pública.');
      }
      if (!ieValue) {
        toast('Inscrição Estadual não encontrada para este CNPJ. Preencha manualmente.', { icon: '⚠️' });
        setIeMissing(true);
      } else {
        setIeMissing(false);
      }

      setForm((p) => ({
        ...p,
        cnpj: digits,
        razao_social: data.razao_social || p.razao_social,
        nome_fantasia: data.nome_fantasia || p.nome_fantasia,
        endereco: enderecoParts.join(', ') || p.endereco,
        cidade: est.municipio || data.municipio || p.cidade,
        estado: est.estado || data.uf || p.estado,
        cep: est.cep || data.cep || p.cep,
        ie: ieValue || p.ie,
        telefone: fmtPhone || p.telefone,
        email: est.email || data.email || p.email,
      }));
      toast.success('Dados do CNPJ preenchidos automaticamente.');
    } catch (e) {
      toast.error('Não foi possível buscar o CNPJ.');
    } finally {
      setCnpjLoading(false);
    }
  };

  const Field: React.FC<{ label: string; name: keyof CompanyProfile; placeholder?: string; rightSlot?: React.ReactNode; isError?: boolean; helperText?: string }>
  = ({ label, name, placeholder, rightSlot, isError, helperText }) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm text-gray-600 dark:text-gray-300">{label}</label>
    <div className="relative">
      <input
        ref={(el) => { inputRefs.current[name as string] = el; }}
        name={name as string}
        defaultValue={(form[name] as string) || ''}
        onInput={(e) => {
          const target = e.target as HTMLInputElement;
          handleInputChange(name as string, target.value);
        }}
        placeholder={placeholder}
        type="text"
        autoComplete="off"
        inputMode={
          name === 'cnpj' || name === 'telefone' || name === 'cep'
            ? 'numeric'
            : 'text'
        }
        onKeyDown={(e) => { e.stopPropagation(); }}
        className={
          `w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ` +
          (isError
            ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500')
        }
      />
      {rightSlot && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-2">
          {rightSlot}
        </div>
      )}
    </div>
    {isError && helperText && (
      <p className="text-xs text-red-600 mt-1">{helperText}</p>
    )}
  </div>
);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Perfil da Empresa</h1>
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Razão Social" name="razao_social" />
          <Field label="Nome Fantasia" name="nome_fantasia" />
          <Field
            label="CNPJ"
            name="cnpj"
            placeholder="00.000.000/0000-00"
            rightSlot={
              <button
                type="button"
                aria-label="Buscar CNPJ"
                onClick={handleFetchCNPJ}
                disabled={cnpjLoading}
                className="h-7 w-7 inline-flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600"
                title="Buscar dados do CNPJ na BrasilAPI"
              >
                {cnpjLoading ? (
                  <span className="h-4 w-4 inline-block rounded-full border-2 border-gray-500 border-t-transparent animate-spin" />
                ) : (
                  // Ícone de lupa (SVG)
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                )}
              </button>
            }
          />
          <Field label="Inscrição Estadual (IE)" name="ie" isError={ieMissing} helperText={ieMissing ? 'IE não encontrada. Por favor, preencha manualmente.' : undefined} />
          <Field label="Endereço" name="endereco" />
          <Field label="Cidade" name="cidade" />
          <Field label="Estado" name="estado" />
          <Field label="CEP" name="cep" placeholder="00000-000" />
          <Field label="Telefone" name="telefone" placeholder="(00) 0000-0000" />
          <Field label="E-mail" name="email" />
          <Field label="Website" name="website" placeholder="https://" />
          <Field
            label="Chave PIX"
            name="pixKey"
            placeholder="Chave PIX (e-mail, telefone, CPF/CNPJ ou chave aleatória)"
          />
          {/* Logo field with live preview and upload */}
          <div className="flex flex-col gap-1">
            <label className="text-sm text-gray-600 dark:text-gray-300">Logo</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
              <div className="sm:col-span-2">
                <input
                  ref={(el) => { inputRefs.current.logoUrl = el; }}
                  name="logoUrl"
                  defaultValue={form.logoUrl || ''}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement;
                    setLogoError(false);
                    handleInputChange('logoUrl', target.value);
                  }}
                  onKeyDown={(e) => { e.stopPropagation(); }}
                  placeholder="Cole a URL da imagem (ex: https://.../logo.png)"
                  className={
                    `w-full px-3 py-2 rounded-md border bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ` +
                    (logoError
                      ? 'border-red-500 dark:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 dark:border-gray-700 focus:ring-blue-500')
                  }
                />
                <div className="mt-2 flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const dataUrl = String(reader.result || '');
                          setLogoError(false);
                          handleInputChange('logoUrl', dataUrl);
                          const input = inputRefs.current.logoUrl;
                          if (input) {
                            input.value = dataUrl;
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M4 17V7a2 2 0 0 1 2-2h7l5 5v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path d="M8 13l2.5 2.5L14 12l4 4" />
                    </svg>
                    <span>Enviar imagem</span>
                  </label>
                  {form.logoUrl && (/^https?:\/\//i.test(form.logoUrl)
                    ? (
                      <a
                        href={form.logoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Abrir logo
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={openLogo}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Abrir logo
                      </button>
                    ))}
                </div>
                {logoError && (
                  <p className="text-xs text-red-600 mt-1">Não foi possível carregar esta imagem. Verifique a URL ou envie um arquivo.</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aceita URL pública ou upload de arquivo (armazenado localmente como Data URL).</p>
              </div>
              <div className="sm:col-span-1">
                <div className="w-full aspect-[3/1] border border-dashed border-gray-300 dark:border-gray-700 rounded-md flex items-center justify-center overflow-hidden bg-white dark:bg-gray-900">
                  {form.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logoUrl}
                      alt="Pré-visualização do logo"
                      className="object-contain w-full h-full"
                      onError={() => setLogoError(true)}
                      onLoad={() => setLogoError(false)}
                    />
                  ) : (
                    <span className="text-xs text-gray-500">Pré-visualização</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button type="button" onClick={handleSave} loading={saving} aria-label="Salvar perfil">Salvar</Button>
        </div>
      </Card>
    </div>
  );
};

export default CompanyProfile;
