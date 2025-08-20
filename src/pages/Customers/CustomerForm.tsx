import React, { useState } from 'react';
<<<<<<< HEAD
import { Customer } from '../../services/api';
import Button from '../../components/Common/Button';
import { customersService } from '../../services/api';
import { toast } from 'react-hot-toast';

interface CustomerFormProps {
  onClose: () => void;
  onCustomerAdded?: (customer: any) => void;
  initialData?: Partial<Customer>;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, onCustomerAdded, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cnpj: '',
    rg: '',
    ie: '',
    address: '',
    address_number: '',
    address_complement: '',
    district: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'BRASIL',
    person_type: 'JURIDICA',
    notes: '',
    birth_date: '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        ...initialData,
        zipCode: initialData.zip_code || '',
        rg: (initialData as any).rg || '',
        ie: (initialData as any).ie || '',
        address_number: (initialData as any).address_number || '',
        address_complement: (initialData as any).address_complement || '',
        district: (initialData as any).district || '',
        country: (initialData as any).country || 'BRASIL',
        person_type: (initialData as any).person_type || 'JURIDICA',
        // Formata a data de nascimento recebida em ISO (AAAA-MM-DD) para DD/MM/AAAA para exibição
        birth_date: (() => {
          const raw = (initialData as any).birth_date || '';
          if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return `${raw.slice(8,10)}/${raw.slice(5,7)}/${raw.slice(0,4)}`;
          }
          return raw || '';
        })(),
      }));
    }
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingCnpj, setIsFetchingCnpj] = useState(false);
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateDocument, setDuplicateDocument] = useState('');

  const sanitizeCnpj = (cnpj: string) => (cnpj || '').replace(/\D/g, '');

  const handleFetchCnpj = async () => {
    const digits = sanitizeCnpj(formData.cnpj);
    if (digits.length !== 14) {
      toast.error('CNPJ inválido. Informe 14 dígitos.');
      return;
    }
    try {
      setIsFetchingCnpj(true);
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
      if (!res.ok) throw new Error('Falha ao buscar CNPJ');
      const data = await res.json();

      // Campos possíveis na BrasilAPI (preferindo dados do estabelecimento quando disponíveis)
      const est = data.estabelecimento || (Array.isArray(data.estabelecimentos) ? data.estabelecimentos[0] : {}) || {};
      const razao = data.razao_social || data.nome_fantasia || est.nome_fantasia || '';
      // E-mail: tenta diversas chaves conhecidas (BrasilAPI)
      const emailCandidates = [
        (est as any).email,
        (est as any).contato_email,
        (est as any).email1,
        (est as any).email2,
        (data as any).email,
        (data as any).contato_email,
      ].filter((v: unknown) => typeof v === 'string' && (v as string).trim().length > 5) as string[];
      const email = (emailCandidates[0] || '').trim().toLowerCase();
      // Telefone: monta com DDD quando possível, com vários fallbacks
      const phonePairs: Array<[string | undefined, string | undefined]> = [
        [est.ddd1 as string | undefined, est.telefone1 as string | undefined],
        [est.ddd2 as string | undefined, est.telefone2 as string | undefined],
        [est.ddd as string | undefined, est.telefone as string | undefined],
      ];
      let telefoneDigits = '';
      for (const [ddd, t] of phonePairs) {
        const d = (ddd || '').toString().replace(/\D/g, '');
        const n = (t || '').toString().replace(/\D/g, '');
        if (n) {
          telefoneDigits = (d ? d : '') + n;
          break;
        }
      }
      if (!telefoneDigits) {
        const otherTel = [est.telefone, data.telefone, data.ddd_telefone_1, data.ddd_telefone_2]
          .map((v: any) => (v || '').toString().replace(/\D/g, ''))
          .find((v: string) => v.length >= 8) || '';
        telefoneDigits = otherTel;
      }
      const telefone = telefoneDigits;
      const logradouro = est.logradouro || data.logradouro || '';
      const numero = est.numero || data.numero || '';
      const bairro = est.bairro || data.bairro || '';
      const compValue = est.complemento || data.complemento || '';
      const municipio = est.cidade || est.municipio || data.municipio || data.cidade || '';
      const uf = est.estado || est.uf || data.uf || data.estado || '';
      const cep = ((est.cep || data.cep) || '').replace(/\D/g, '');
      // IE (Inscrição Estadual): lógica similar ao CompanyProfile
      const iesList = (
        (Array.isArray((est as any).inscricoes_estaduais) ? (est as any).inscricoes_estaduais : [])
      ).filter(Boolean);
      const companyUF = (uf || '').toString().toUpperCase();
      const iePickFromList = (() => {
        if (iesList.length === 0) return undefined as string | undefined;
        const norm: { ie: string; uf: string; ativo: boolean }[] = iesList.map((e: any) => ({
          ie: String(e?.inscricao_estadual || e?.ie || ''),
          uf: String(e?.estado || e?.uf || '').toUpperCase(),
          ativo: e?.ativo === true || String(e?.situacao || '').toUpperCase() === 'ATIVA',
        }));
        const byUfActive = norm.find(n => n.ie && companyUF && n.uf === companyUF && n.ativo);
        if (byUfActive) return byUfActive.ie;
        const byUf = norm.find(n => n.ie && companyUF && n.uf === companyUF);
        if (byUf) return byUf.ie;
        const anyActive = norm.find(n => n.ie && n.ativo);
        if (anyActive) return anyActive.ie;
        const first = norm.find(n => n.ie);
        return first?.ie;
      })();
      const isIsento = (v?: string) => typeof v === 'string' && v.trim().toUpperCase().startsWith('ISENT');
      let ieValue: string | undefined = (est as any).inscricao_estadual || iePickFromList || (data as any).inscricao_estadual || (data as any).ie;
      if (!ieValue && isIsento((est as any).inscricao_estadual)) ieValue = 'ISENTO';
      if (!ieValue && isIsento((data as any).inscricao_estadual)) ieValue = 'ISENTO';
      if (!ieValue && isIsento((data as any).ie)) ieValue = 'ISENTO';

      // Preencher campos separados corretamente
      const address = (logradouro || '').toString();

      setFormData(prev => ({
        ...prev,
        name: razao || prev.name,
        email: email || prev.email,
        phone: telefone || prev.phone,
        address: address || prev.address,
        address_number: (numero || '').toString(),
        address_complement: (compValue || '').toString(),
        district: bairro || prev.district,
        city: municipio || prev.city,
        state: uf || prev.state,
        zipCode: cep || prev.zipCode,
        country: 'BRASIL',
        person_type: 'JURIDICA',
        ie: ieValue || prev.ie,
      }));
      // Fallback 2: tentar outra API pública (publica.cnpj.ws) se IE ainda não encontrada
      if (!ieValue || !email) {
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
            const estEstadoObj = (est2 as any)?.estado;
            const estUf = typeof estEstadoObj === 'object' && estEstadoObj ? estEstadoObj.sigla : ((est2 as any)?.uf || (est2 as any)?.estado);
            const uf2 = String(estUf || (data2 as any)?.uf || '').toUpperCase();
            const pick = norm2.find((n) => n.ie && uf2 && n.uf === uf2 && n.ativo)
              || norm2.find((n) => n.ie && uf2 && n.uf === uf2)
              || norm2.find((n) => n.ie && n.ativo)
              || norm2.find((n) => n.ie);
            const ieFromFallback = pick?.ie;
            if (ieFromFallback || norm2.some(n => isIsento(n.ie))) {
              setFormData(prev => ({
                ...prev,
                ie: ieFromFallback || 'ISENTO',
              }));
            }
            // Email fallback pela pública
            if (!email && (est2 as any).email) {
              const email2 = String((est2 as any).email).trim().toLowerCase();
              if (email2) {
                setFormData(prev => ({ ...prev, email: email2 }));
              }
            }
          }
        } catch (e) {
          // silencia fallback
        }
      }
      if (!email) toast('E-mail não disponível para este CNPJ.');
      if (!telefone) toast('Telefone não disponível para este CNPJ.');
      toast.success('Dados do CNPJ preenchidos automaticamente.');
    } catch (err) {
      console.error(err);
      toast.error('Não foi possível buscar os dados do CNPJ.');
    } finally {
      setIsFetchingCnpj(false);
    }
  };

  const handleFetchCep = async () => {
    const digits = (formData.zipCode || '').replace(/\D/g, '');
    if (digits.length !== 8) {
      toast.error('CEP inválido. Informe 8 dígitos.');
      return;
    }
    try {
      setIsFetchingCep(true);
      // Tenta BrasilAPI v2
      let addressData: any | null = null;
      try {
        const res = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
        if (res.ok) {
          addressData = await res.json();
        }
      } catch (_) { /* silent */ }

      // Fallback ViaCEP
      if (!addressData) {
        try {
          const res2 = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
          if (res2.ok) {
            const data2 = await res2.json();
            if (!data2.erro) {
              addressData = {
                street: String(data2.logradouro || ''),
                neighborhood: String(data2.bairro || ''),
                city: String(data2.localidade || ''),
                state: String(data2.uf || ''),
              };
            }
          }
        } catch (_) { /* silent */ }
      }

      if (!addressData) {
        toast.error('Não foi possível buscar o endereço para este CEP.');
        return;
      }

      // Normaliza chaves da BrasilAPI v2
      const street = addressData.street || addressData.logradouro || addressData.address || '';
      const neighborhood = addressData.neighborhood || addressData.bairro || '';
      const city = addressData.city || addressData.localidade || addressData.municipio || '';
      const state = (addressData.state || addressData.uf || '').toString().toUpperCase();

      setFormData(prev => ({
        ...prev,
        address: street || prev.address,
        district: neighborhood || prev.district,
        city: city || prev.city,
        state: state || prev.state,
        country: 'BRASIL',
      }));
      toast.success('Endereço preenchido a partir do CEP.');
    } catch (e) {
      console.error(e);
      toast.error('Falha ao buscar CEP.');
    } finally {
      setIsFetchingCep(false);
    }
  };
=======
import Button from '../../components/Common/Button';
import { Search } from 'lucide-react';
import { customersService } from '../../services/api';
import axios from 'axios';

interface CustomerFormProps {
  onClose: () => void;
  customer?: {
    id: number;
    name: string;
    email: string;
    phone: string;
    document: string;
    address: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    status?: string;
  };
  isEditing?: boolean;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onClose, customer, isEditing = false }) => {
  // If customer is provided (for editing), initialize form with customer data
  // Otherwise use empty values for a new customer
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    email: customer?.email || '',
    phone: customer?.phone || '',
    document: customer?.document || '',
    address: customer?.address || '',
    city: customer?.city || '',
    state: customer?.state || '',
    zipCode: customer?.zipCode || '',
    notes: customer?.notes || '',
    status: customer?.status || 'Ativo'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false);
  const [cnpjError, setCnpjError] = useState('');
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
<<<<<<< HEAD
    try {
      // Normaliza e prepara dados para API
      const digitsOnly = (s?: string) => (s || '').replace(/\D/g, '');
      const normalizeBirthDate = (raw: string): string => {
        const v = (raw || '').trim();
        // Se vier no formato DD/MM/AAAA, converte para ISO AAAA-MM-DD
        const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) {
          const [_, dd, mm, yyyy] = m;
          return `${yyyy}-${mm}-${dd}`;
        }
        // Se já estiver em ISO ou outro formato conhecido, retorna como está
        return v;
      };
      const cpfDigits = digitsOnly(formData.cpf);
      const cnpjDigits = digitsOnly(formData.cnpj);
      const uf = (formData.state || '').trim().slice(0, 2).toUpperCase();
      // Email opcional; se fornecido, normalizamos
      const cleanedEmail = (formData.email || '').trim().toLowerCase();
      const country = (formData.country || '').trim().toUpperCase();
      const rawData: any = {
        name: (formData.name || '').trim(),
        email: cleanedEmail || undefined,
        phone: digitsOnly(formData.phone) || undefined,
        cpf: cpfDigits || undefined,
        cnpj: cnpjDigits || undefined,
        rg: (formData.rg || '').trim() || undefined,
        ie: (formData.ie || '').trim() || undefined,
        address: (formData.address || '').trim() || undefined,
        address_number: (formData.address_number || '').trim() || undefined,
        address_complement: (formData.address_complement || '').trim() || undefined,
        district: (formData.district || '').trim() || undefined,
        city: (formData.city || '').trim() || undefined,
        state: uf || undefined,
        zip_code: digitsOnly(formData.zipCode) || undefined,
        country: country || undefined,
        person_type: (formData.person_type || '').trim() || undefined,
        notes: (formData.notes || '').trim() || undefined,
        birth_date: normalizeBirthDate(formData.birth_date) || undefined,
        status: 'Ativo',
      };
      // Whitelist: somente campos aceitos pelo backend
      const allowedKeys = new Set(['name','email','cpf','cnpj','rg','ie','person_type','phone','address','address_number','address_complement','district','city','state','zip_code','country','notes','birth_date','status']);
      const customerData: any = {};
      Object.keys(rawData).forEach((k) => {
        if (allowedKeys.has(k) && rawData[k] !== '' && rawData[k] !== undefined && rawData[k] !== null) {
          customerData[k] = rawData[k];
        }
      });
      // Log de depuração
      console.log('Payload de cadastro:', customerData);

      // Salvar ou atualizar na API (com fallbacks de compatibilidade)
      let savedCustomer;
      const attemptCreateOrUpdate = async (payload: any) => {
        if (initialData && (initialData._id || initialData.id)) {
          const customerId = initialData._id ?? initialData.id;
          if (!customerId) {
            throw new Error('ID do cliente não encontrado para atualização.');
          }
          return customersService.update(customerId, payload);
        }
        return customersService.create(payload);
      };

      // Tenta criar/atualizar com payload filtrado
      savedCustomer = await attemptCreateOrUpdate(customerData);

      toast.success(initialData && (initialData._id || initialData.id) ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
      if (onCustomerAdded) {
        onCustomerAdded(savedCustomer);
      }
      onClose();
    } catch (error) {
      const resp = (error as any)?.response;
      const data = resp?.data;
      const status = resp?.status;
      const firstError = Array.isArray(data?.errors) ? data.errors[0] : undefined;
      const backendMsg = data?.message || data?.error || firstError?.message || firstError?.msg;
      console.error('Erro ao cadastrar cliente:', {
        message: (error as any)?.message,
        status,
        data,
        fullError: error,
        responseText: resp?.statusText,
        config: (error as any)?.config
      });
      console.error('Backend response data:', JSON.stringify(data, null, 2));
      
      // Mensagem específica para CPF/CNPJ duplicado
      if (data?.error === 'CPF/CNPJ já cadastrado') {
        const docType = formData.cnpj ? 'CNPJ' : 'CPF';
        const docValue = formData.cnpj || formData.cpf || '';
        setDuplicateDocument(`${docType}: ${docValue}`);
        setShowDuplicateModal(true);
      } else {
        toast.error(backendMsg ? `Erro: ${backendMsg}` : 'Erro ao cadastrar cliente. Tente novamente.');
      }
=======
    setSubmitError('');
    
    try {
      if (isEditing && customer?.id) {
        // Atualizando um cliente existente
        console.log('Atualizando cliente:', customer.id, formData);
        const response = await customersService.update(customer.id, formData);
        console.log('Cliente atualizado com sucesso:', response);
        setSubmitSuccess(true);
        
        // Chamar onClose imediatamente para atualizar a lista de clientes
        onClose();
      } else {
        // Criando um novo cliente
        console.log('Criando novo cliente:', formData);
        const response = await customersService.create(formData);
        console.log('Cliente criado com sucesso:', response);
        setSubmitSuccess(true);
        
        // Chamar onClose imediatamente para atualizar a lista de clientes
        onClose();
      }
    } catch (error: any) {
      console.error('Erro ao salvar cliente:', error);
      let errorMessage = 'Ocorreu um erro ao salvar o cliente.';
      
      // Tratamento específico para erros do Axios
      if (error?.response) {
        const status = error.response.status;
        
        // Verificar se é o erro de documento duplicado
        if (status === 500 && 
            (error.response.data?.error?.includes('UNIQUE constraint failed: customers.document') ||
             error.message?.includes('UNIQUE constraint'))) {
          errorMessage = 'O CPF/documento informado já está cadastrado para outro cliente. Por favor, verifique e tente novamente.';
          // Destacar o campo de documento como inválido
          const documentInput = document.querySelector('input[name="document"]') as HTMLInputElement;
          if (documentInput) {
            documentInput.classList.add('border-red-500');
            documentInput.focus();
          }
        } else if (status === 404) {
          errorMessage += ' Endpoint não encontrado ou você não tem permissão de acesso (404).';
        } else if (status === 401) {
          errorMessage += ' Sua sessão expirou ou você não está autenticado (401).';
        } else if (status === 403) {
          errorMessage += ' Você não tem permissão para esta ação (403).';
        } else {
          errorMessage += ` Erro ${status}: ${error.response.data?.error || 'Desconhecido'}`;
        }
      }
      
      setSubmitError(errorMessage);
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
<<<<<<< HEAD
    const name = e.target.name;
    let value = e.target.value;
    // Não aplicar maiúsculas em campos numéricos ou data
    if (!['cpf', 'cnpj', 'phone', 'phone2', 'whatsapp', 'birth_date', 'zipCode', 'email', 'address_number', 'person_type'].includes(name)) {
      value = value.toLocaleUpperCase();
    }
    // Máscara para Data de Nascimento: DD/MM/AAAA
    if (name === 'birth_date') {
      const digits = value.replace(/\D/g, '').slice(0, 8);
      const dd = digits.slice(0, 2);
      const mm = digits.slice(2, 4);
      const yyyy = digits.slice(4, 8);
      value = [dd, mm, yyyy].filter(Boolean).join('/');
    }
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome Completo *
            </label>
=======
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    
    // Limpa os erros de CNPJ quando o usuário altera o documento
    if (e.target.name === 'document') {
      setCnpjError('');
    }
  };
  
  // Função para buscar dados pelo CNPJ
  const fetchCNPJData = async () => {
    // Limpa mensagens de erro anteriores
    setCnpjError('');
    
    // Validação básica do CNPJ (remove caracteres especiais)
    const cnpj = formData.document.replace(/[^0-9]/g, '');
    
    if (cnpj.length !== 14) {
      setCnpjError('CNPJ inválido. Por favor, insira um CNPJ com 14 dígitos.');
      return;
    }
    
    try {
      setIsFetchingCNPJ(true);
      
      // Consulta a BrasilAPI para CNPJ (não tem problemas de CORS)
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
      const data = response.data;
      
      // Atualiza o formulário com os dados retornados
      setFormData(prevData => ({
        ...prevData,
        name: data.razao_social || prevData.name,
        email: prevData.email, // BrasilAPI não retorna email
        phone: data.ddd_telefone_1 || prevData.phone,
        address: data.logradouro ? `${data.logradouro}, ${data.numero}` : prevData.address,
        city: data.municipio || prevData.city,
        state: data.uf || prevData.state,
        zipCode: data.cep ? data.cep.replace(/[^0-9]/g, '') : prevData.zipCode,
      }));
      
      // Mostra mensagem de sucesso temporariamente
      const cnpjInfo = document.getElementById('cnpj-info');
      if (cnpjInfo) {
        cnpjInfo.innerHTML = '<span class="text-green-500">✓ Dados preenchidos com sucesso!</span>';
        setTimeout(() => {
          if (cnpjInfo) cnpjInfo.innerHTML = '';
        }, 3000);
      }
      
    } catch (error) {
      console.error('Erro ao buscar dados do CNPJ:', error);
      setCnpjError('Não foi possível obter dados deste CNPJ. Verifique se o CNPJ está correto ou preencha os dados manualmente.');
    } finally {
      setIsFetchingCNPJ(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nome Completo *
          </label>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <input
            type="text"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
<<<<<<< HEAD
            CPF
          </label>
          <input
            type="text"
            name="cpf"
            value={formData.cpf}
            onChange={handleChange}
            maxLength={14}
            placeholder="Apenas números"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CNPJ
          </label>
          <div className="relative">
            <input
              type="text"
              name="cnpj"
              value={formData.cnpj}
              onChange={handleChange}
              maxLength={18}
              placeholder="Apenas números"
              className="w-full pr-12 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={handleFetchCnpj}
              aria-label="Buscar CNPJ"
              disabled={isFetchingCnpj}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isFetchingCnpj ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="h-4 w-4 pointer-events-none">
                  <path fillRule="evenodd" d="M10.5 3a7.5 7.5 0 105.3 12.8l3.7 3.7a.75.75 0 101.06-1.06l-3.7-3.7A7.5 7.5 0 0010.5 3zm-6 7.5a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data de Nascimento
          </label>
          <input
            type="text"
            name="birth_date"
            placeholder="DD/MM/AAAA"
            inputMode="numeric"
            maxLength={10}
            value={formData.birth_date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
=======
            CPF/CNPJ *
          </label>
          <div className="flex">
            <input
              type="text"
              name="document"
              required
              value={formData.document}
              onChange={handleChange}
              placeholder="Digite CPF/CNPJ"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button 
              type="button" 
              onClick={fetchCNPJData}
              disabled={isFetchingCNPJ || !formData.document || formData.document.length < 14}
              title="Buscar dados do CNPJ"
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-r-lg flex items-center justify-center transition-colors disabled:bg-gray-400"
            >
              {isFetchingCNPJ ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <Search className="h-5 w-5" />
              )}
            </button>
          </div>
          <div id="cnpj-info" className="text-sm mt-1"></div>
          {cnpjError && (
            <p className="text-sm text-red-500 mt-1">{cnpjError}</p>
          )}
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            E-mail
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Telefone *
          </label>
          <input
            type="tel"
            name="phone"
            required
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

<<<<<<< HEAD
      

      {/* Documentos e Tipo de Pessoa */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Pessoa</label>
          <select
            name="person_type"
            value={formData.person_type}
            onChange={(e: any) => handleChange(e as any)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="FISICA">Física</option>
            <option value="JURIDICA">Jurídica</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">RG</label>
          <input
            type="text"
            name="rg"
            value={formData.rg}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IE (Inscrição Estadual)</label>
          <input
            type="text"
            name="ie"
            value={formData.ie}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">País</label>
          <input
            type="text"
            name="country"
            value={formData.country}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {/* Endereço (mover para cima do Número) */}
=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Endereço Completo
        </label>
        <input
          type="text"
          name="address"
          value={formData.address}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

<<<<<<< HEAD
      {/* Detalhes de endereço */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Número</label>
          <input
            type="text"
            name="address_number"
            value={formData.address_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Complemento</label>
          <input
            type="text"
            name="address_complement"
            value={formData.address_complement}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bairro</label>
          <input
            type="text"
            name="district"
            value={formData.district}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

=======
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cidade
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Estado
          </label>
          <input
            type="text"
            name="state"
            value={formData.state}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CEP
          </label>
<<<<<<< HEAD
          <div className="relative">
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleChange}
              maxLength={9}
              placeholder="Apenas números"
              className="w-full pr-12 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
            <button
              type="button"
              onClick={handleFetchCep}
              aria-label="Buscar CEP"
              disabled={isFetchingCep}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isFetchingCep ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" aria-hidden="true" className="h-4 w-4 pointer-events-none">
                  <path fillRule="evenodd" d="M10.5 3a7.5 7.5 0 105.3 12.8l3.7 3.7a.75.75 0 101.06-1.06l-3.7-3.7A7.5 7.5 0 0010.5 3zm-6 7.5a6 6 0 1112 0 6 6 0 01-12 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
=======
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          name="notes"
          rows={3}
          value={formData.notes}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

<<<<<<< HEAD
      <div className={`flex items-center mt-6 flex-wrap gap-3 ${initialData && (initialData._id || initialData.id) ? 'justify-between' : 'justify-end'}`}>
        {initialData && (initialData._id || initialData.id) && (
          <Button
            variant="danger"
            type="button"
            onClick={async () => {
              if (window.confirm('Tem certeza que deseja excluir este cliente? Esta ação não poderá ser desfeita.')) {
                try {
                  const customerId = initialData._id ?? initialData.id;
                  if (!customerId) {
                    toast.error('ID do cliente não encontrado.');
                    return;
                  }
                  await customersService.delete(customerId);
                  toast.success('Cliente excluído com sucesso!');
                  if (onCustomerAdded) onCustomerAdded(null);
                  onClose();
                } catch (error) {
                  toast.error('Erro ao excluir cliente.');
                }
              }
            }}
          >
            Excluir Cliente
          </Button>
        )}
        <div className="flex space-x-3 w-full sm:w-auto">
          <Button variant="secondary" type="button" onClick={onClose} className="flex-1 sm:flex-none">
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} className="flex-1 sm:flex-none">
            {isSubmitting ? 'Salvando...' : 'Salvar Cliente'}
          </Button>
        </div>
      </div>
    </form>

    {/* Modal de CPF/CNPJ Duplicado */}
    {showDuplicateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Documento Já Cadastrado
              </h3>
            </div>
          </div>
          <div className="mb-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              O documento <strong>{duplicateDocument}</strong> já está cadastrado no sistema.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Verifique os dados ou use um documento diferente para continuar.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowDuplicateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    )}
    </>
=======
      {/* Mensagem de erro */}
      {submitError && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {submitError}
        </div>
      )}
      
      {/* Mensagem de sucesso */}
      {submitSuccess && (
        <div className="p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {isEditing ? 'Cliente atualizado com sucesso!' : 'Cliente criado com sucesso!'}
        </div>
      )}
      
      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isEditing ? 'Atualizando...' : 'Salvando...'}
            </>
          ) : (
            isEditing ? 'Atualizar Cliente' : 'Salvar Cliente'
          )}
        </Button>
      </div>
    </form>
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  );
};

export default CustomerForm;