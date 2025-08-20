import React, { useState, useEffect } from 'react';
import Button from '../../components/Common/Button';
import { billetsService, customersService } from '../../services/api';
import { Customer } from '../../services/api';

interface BilletFormProps {
  onClose: () => void;
  billetToEdit?: any; // Boleto para editar, se aplicável
  onSuccess?: () => void; // Callback para atualizar a lista após salvar
}

const BilletForm: React.FC<BilletFormProps> = ({ onClose, billetToEdit, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    amount: '',
    dueDate: '',
    description: '',
    instructions: 'Não receber após o vencimento. Sujeito a multa e juros.',
    interest: '2.0', // percentage per month
    fine: '2.0', // percentage
    discount: '0',
    discountDate: ''
  });
  
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Carregar clientes ao iniciar o formulário
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await customersService.getAll();
        if (response && response.data) {
          setCustomers(response.data);
        } else {
          setCustomers([]);
        }
        setLoading(false);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setError('Não foi possível carregar a lista de clientes.');
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  // Preencher o formulário se for uma edição
  useEffect(() => {
    if (billetToEdit) {
      // Converter do formato de API para o formato do formulário
      setFormData({
        customerId: billetToEdit.customer_id?.toString() || '',
        amount: billetToEdit.amount?.toString() || '',
        dueDate: billetToEdit.due_date || '',
        description: billetToEdit.description || '',
        instructions: billetToEdit.instructions || 'Não receber após o vencimento. Sujeito a multa e juros.',
        interest: billetToEdit.interest?.toString() || '2.0',
        fine: billetToEdit.fine?.toString() || '2.0',
        discount: billetToEdit.discount?.toString() || '0',
        discountDate: billetToEdit.discount_date || ''
      });
    }
  }, [billetToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    
    try {
      // Validar dados antes de enviar
      if (!formData.customerId) {
        throw new Error('Selecione um cliente');
      }
      
      if (!formData.amount || parseFloat(formData.amount) <= 0) {
        throw new Error('Informe um valor válido para o boleto');
      }

      if (!formData.dueDate) {
        throw new Error('Informe uma data de vencimento');
      }
      
      // Converter para o formato esperado pela API
      const apiData = {
        customer_id: parseInt(formData.customerId, 10),
        amount: parseFloat(formData.amount),
        due_date: formData.dueDate,
        instructions: formData.instructions,
        interest: parseFloat(formData.interest) || 2.0,
        fine: parseFloat(formData.fine) || 2.0,
        discount: parseFloat(formData.discount) || 0,
        discount_date: formData.discount && parseFloat(formData.discount) > 0 ? formData.discountDate : undefined
      };
      
      console.log('Enviando dados do boleto para API:', apiData);
      
      let response;
      if (billetToEdit?.id) {
        // Atualizar boleto existente
        response = await billetsService.update(billetToEdit.id, apiData);
        console.log('Boleto atualizado:', response);
      } else {
        // Criar novo boleto
        response = await billetsService.create(apiData);
        console.log('Boleto criado:', response);
      }
      
      setSuccess(true);
      setTimeout(() => {
        if (onSuccess) onSuccess(); // Atualizar a lista de boletos
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erro ao salvar boleto:', err);
      setError(err.message || 'Erro ao salvar boleto. Verifique os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  // A geração do código de barras deve ser feita pelo backend
  // A implementação anterior era apenas um mock e foi removida

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Remover geração de código de barras não utilizada
  // A geração real do código de barras deve ser feita pelo backend

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mensagens de erro ou sucesso */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          Boleto salvo com sucesso!
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cliente *
          </label>
          <select
            name="customerId"
            required
            value={formData.customerId}
            onChange={handleChange}
            disabled={loading || saving}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 disabled:text-gray-500 dark:disabled:bg-gray-800 dark:disabled:text-gray-400"
          >
            <option value="">Selecione um cliente</option>
            {loading ? (
              <option value="" disabled>Carregando clientes...</option>
            ) : (
              customers.map(customer => (
                <option key={customer.id} value={customer.id}>{customer.name}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Valor *
          </label>
          <input
            type="number"
            name="amount"
            step="0.01"
            required
            placeholder="0,00"
            value={formData.amount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data de Vencimento *
          </label>
          <input
            type="date"
            name="dueDate"
            required
            value={formData.dueDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Juros ao Mês (%)
          </label>
          <input
            type="number"
            name="interest"
            step="0.1"
            placeholder="2.0"
            value={formData.interest}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Multa (%)
          </label>
          <input
            type="number"
            name="fine"
            step="0.1"
            placeholder="2.0"
            value={formData.fine}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Desconto (%)
          </label>
          <input
            type="number"
            name="discount"
            step="0.1"
            placeholder="0"
            value={formData.discount}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>

      {parseFloat(formData.discount) > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data Limite para Desconto
          </label>
          <input
            type="date"
            name="discountDate"
            value={formData.discountDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Descrição
        </label>
        <input
          type="text"
          name="description"
          placeholder="Descrição do boleto"
          value={formData.description}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Instruções para o Banco
        </label>
        <textarea
          name="instructions"
          rows={3}
          placeholder="Instruções especiais para o banco..."
          value={formData.instructions}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          Configurações Automáticas:
        </h4>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          <li>• Registro automático no banco</li>
          <li>• Envio por e-mail para o cliente</li>
          <li>• Notificações de vencimento</li>
          <li>• Atualização automática de status</li>
        </ul>
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <span className="inline-block mr-2">Salvando...</span>
              <svg className="animate-spin h-4 w-4 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </>
          ) : (
            billetToEdit ? 'Atualizar Boleto' : 'Gerar Boleto'
          )}
        </Button>
      </div>
    </form>
  );
};

export default BilletForm;