import React, { useState } from 'react';
import Button from '../../components/Common/Button';
import { toast } from 'react-hot-toast';
import { customersService } from '../../services/api';

interface VisitFormProps {
  onClose: () => void;
  onSave?: () => void;
}

const VisitForm: React.FC<VisitFormProps> = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    customer_id: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    notes: '',
    reminder: '30' // minutes before
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Searchable customer field state
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const searchTimeoutRef = React.useRef<number | null>(null);
  const customerFieldRef = React.useRef<HTMLDivElement | null>(null);

  // Não pré-carregar clientes; mostrar apenas quando o usuário pesquisar

  // Click outside to close dropdown
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (customerFieldRef.current && !customerFieldRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCustomerInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomerSearch(value);
    const query = value.trim();
    // Exige ao menos 1 caractere para buscar e exibir a lista
    if (query.length < 1) {
      setFilteredCustomers([]);
      setShowCustomerDropdown(false);
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
      return;
    }
    setShowCustomerDropdown(true);

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        setCustomersLoading(true);
        const list = await customersService.getAll({ search: query, limit: 10 });
        setFilteredCustomers(list || []);
      } catch (err) {
        console.error('Erro ao buscar clientes:', err);
        setFilteredCustomers([]);
      } finally {
        setCustomersLoading(false);
      }
    }, 300);
  };

  const handleSelectCustomer = (customer: any) => {
    setFormData(prev => ({
      ...prev,
      customer_id: String(customer._id ?? customer.id ?? '')
    }));
    setCustomerSearch(customer.name || '');
    setShowCustomerDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Fix timezone issue: ensure date is sent in local timezone without conversion
      const selectedDate = new Date(formData.date + 'T00:00:00');
      const localDateString = selectedDate.getFullYear() + '-' + 
        String(selectedDate.getMonth() + 1).padStart(2, '0') + '-' + 
        String(selectedDate.getDate()).padStart(2, '0');

      const visitData = {
        customer_id: formData.customer_id, // Keep as string for MongoDB ObjectId
        date: localDateString, // Send date in YYYY-MM-DD format without timezone conversion
        time: formData.time,
        notes: formData.notes.trim(),
        reminder: parseInt(formData.reminder),
        status: 'Agendado'
      };

      // Import and use visits service
      const { visitsService } = await import('../../services/visitsService');
      await visitsService.create(visitData);

      toast.success('Visita agendada com sucesso!');
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Erro ao criar visita:', error);
      toast.error('Erro ao agendar visita');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div ref={customerFieldRef} className="relative max-w-xs">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cliente *
          </label>
          <input
            type="text"
            placeholder="Buscar cliente..."
            value={customerSearch}
            onChange={handleCustomerInputChange}
            onFocus={() => setShowCustomerDropdown(customerSearch.trim().length >= 1)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
          {/* Hidden actual value for validation */}
          <input type="hidden" name="customer_id" value={formData.customer_id} />
          {showCustomerDropdown && (
            <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
              {customersLoading ? (
                <div className="p-3 text-sm text-gray-600 dark:text-gray-300">Carregando...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="p-3 text-sm text-gray-600 dark:text-gray-300">Nenhum cliente encontrado</div>
              ) : (
                <ul className="py-1">
                  {filteredCustomers.map((c: any, index: number) => (
                    <li key={c.id ?? c._id ?? `customer-${index}`}>
                      <button
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100"
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {!formData.customer_id && (
            <p className="mt-1 text-xs text-gray-500">Selecione um cliente da lista</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data *
          </label>
          <div className="relative">
            <input
              type="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Horário *
          </label>
          <div className="relative">
            <input
              type="time"
              name="time"
              required
              value={formData.time}
              onChange={handleChange}
              className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-2 [&::-webkit-calendar-picker-indicator]:w-6 [&::-webkit-calendar-picker-indicator]:h-6 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Lembrete
          </label>
          <select
            name="reminder"
            value={formData.reminder}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="0">Sem lembrete</option>
            <option value="15">15 minutos antes</option>
            <option value="30">30 minutos antes</option>
            <option value="60">1 hora antes</option>
            <option value="120">2 horas antes</option>
            <option value="1440">1 dia antes</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Observações
        </label>
        <textarea
          name="notes"
          rows={4}
          placeholder="Digite informações importantes sobre a visita..."
          value={formData.notes}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || !formData.customer_id}>
          {isSubmitting ? 'Agendando...' : 'Agendar Visita'}
        </Button>
      </div>
    </form>
  );
};

export default VisitForm;