import React, { useState } from 'react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
          <input
            type="text"
            name="zipCode"
            value={formData.zipCode}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
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
  );
};

export default CustomerForm;