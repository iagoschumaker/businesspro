import React, { useState, useEffect } from 'react';
import Button from '../../components/Common/Button';
import { customersService, visitsService } from '../../services/api';
import { notificationService } from '../../services/notificationService';
import { Loader, X, Bell } from 'lucide-react';

interface VisitFormProps {
  onClose: () => void;
  visitId?: number;
  onSuccess?: () => void;
}

const VisitForm: React.FC<VisitFormProps> = ({ onClose, visitId, onSuccess }) => {
  const [formData, setFormData] = useState({
    customerId: '',
    customerName: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    notes: '',
    reminder: '30', // minutes before
    status: 'Agendado'
  });
  
  const [customers, setCustomers] = useState<{id: number, name: string, document?: string}[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReminderDetails, setShowReminderDetails] = useState(formData.reminder !== '0');

  
  // Carregar a lista de clientes
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true);
        const response = await customersService.getAll({ status: 'Ativo' });
        console.log('Clientes carregados:', response);
        
        // Verificamos se a resposta é um array (direto) ou tem uma propriedade .data
        const customersData = Array.isArray(response) ? response : response.data;
        
        if (customersData && Array.isArray(customersData)) {
          const customersList = customersData.map((customer: any) => ({
            id: customer.id,
            name: customer.name,
            document: customer.document || ''
          }));
          setCustomers(customersList);
          console.log('Lista de clientes atualizada:', customersList);
        } else {
          console.error('Formato de dados de clientes inválido:', response);
        }
      } catch (err) {
        console.error('Erro ao carregar clientes:', err);
        setError('Não foi possível carregar a lista de clientes');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomers();
  }, []);
  
  // Carregar dados da visita se estiver editando
  useEffect(() => {
    const fetchVisitDetails = async () => {
      if (!visitId) return;
      
      try {
        console.log(`Carregando visita ID: ${visitId}...`);
        setLoading(true);
        
        // Primeiro, tenta buscar nas visitas temporárias
        let visit = null;
        const tempVisitsString = localStorage.getItem('tempVisits');
        
        if (tempVisitsString) {
          try {
            const tempVisits = JSON.parse(tempVisitsString);
            const tempVisit = tempVisits.find((v: any) => v.id === visitId);
            
            if (tempVisit) {
              console.log('Visita temporária encontrada no localStorage:', tempVisit);
              visit = tempVisit;
            }
          } catch (e) {
            console.error('Erro ao processar visitas temporárias:', e);
          }
        }
        
        // Se não encontrou como temporária, busca no servidor
        if (!visit) {
          try {
            console.log('Buscando visita no servidor...');
            visit = await visitsService.getById(visitId);
            console.log('Dados da visita recebidos do servidor:', JSON.stringify(visit, null, 2));
          } catch (serverErr) {
            console.error(`Visita ${visitId} não encontrada no servidor:`, serverErr);
          }
        }
        
        if (visit) {
          // Garantir valores padrão quando o campo não existe ou é nulo
          const reminderValue = visit.reminder !== undefined && visit.reminder !== null
            ? visit.reminder.toString()
            : '30'; // Valor padrão de 30 minutos
          
          const formValues = {
            customerId: visit.customer_id?.toString() || '',
            customerName: visit.customer_name || '',
            date: visit.date || new Date().toISOString().split('T')[0],
            time: visit.time || '',
            notes: visit.notes || '',
            reminder: reminderValue,
            status: visit.status || 'Agendado'
          };
          
          console.log('Preenchendo formulário com:', formValues);
          setFormData(formValues);
          setShowReminderDetails(reminderValue !== '0');
          setError(null); // Limpa erros anteriores
        } else {
          console.error(`Visita ID ${visitId} não foi encontrada em nenhum lugar`);
          setError('Os dados da visita não foram encontrados');
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes da visita:', err);
        setError('Não foi possível carregar os detalhes da visita');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVisitDetails();
  }, [visitId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      // Validar dados obrigatórios antes de enviar
      if (!formData.customerId) {
        setError('Por favor, selecione um cliente');
        setSubmitting(false);
        return;
      }

      if (!formData.time) {
        setError('Por favor, selecione um horário');
        setSubmitting(false);
        return;
      }
      
      // Garantimos que o ID do cliente é um número válido
      let customerId;
      try {
        customerId = Number(formData.customerId);
        if (isNaN(customerId) || customerId <= 0) {
          throw new Error('ID de cliente inválido');
        }
      } catch (e) {
        setError('ID do cliente inválido. Por favor, selecione um cliente válido.');
        setSubmitting(false);
        return;
      }
      
      // Preparar os dados da visita para o formato esperado pelo backend
      const visitData = {
        customer_id: customerId,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        status: formData.status,
        location: 'Local', // Backend espera location e type separadamente
        type: 'Visita',
        reminder: formData.reminder !== '0' // Backend espera isso
      };
      
      // Usar o campo de notas para o propósito da visita (local + tipo)
      if (formData.notes) {
        try {
          // Extrair local e tipo das notas se possível
          const match = formData.notes.match(/^([^:]+):\s*(.+)/);
          if (match) {
            visitData.location = match[1].trim();
            visitData.type = match[2].trim();
          } else {
            // Se não houver formato específico, usar a própria nota
            visitData.location = 'Local';
            visitData.type = formData.notes;
          }
        } catch (e) {
          console.error('Erro ao extrair local/tipo das notas:', e);
          // Valores padrão em caso de erro
          visitData.location = 'Local';
          visitData.type = 'Visita'; 
        }
      }
      
      console.log('Enviando dados da visita:', JSON.stringify(visitData));
      
      try {
        let resposta;
        let visitaSalva = false;
        
        if (visitId) {
          // Atualizar visita existente
          console.log(`Atualizando visita ID ${visitId}`);
          try {
            resposta = await visitsService.update(visitId, visitData as any);
            console.log('Visita atualizada com sucesso:', resposta);
            visitaSalva = true;
          } catch (erro) {
            console.error('Erro ao atualizar visita, usando fallback:', erro);
            
            // Simular sucesso na atualização
            resposta = {
              id: visitId,
              customer_id: parseInt(formData.customerId),
              customer_name: formData.customerName,
              date: formData.date,
              time: formData.time,
              location: visitData.location || 'Local',
              type: visitData.type || 'Visita',
              notes: formData.notes || '',
              status: 'Agendado',
              reminder: formData.reminder !== '0',
              reminderMinutes: parseInt(formData.reminder),
              user_id: 1,
              updated_at: new Date().toISOString(),
              _isTemp: true // Marcar como temporário
            };
            
            // Atualizar no localStorage
            try {
              let tempVisits: any[] = [];
              const existingTemp = localStorage.getItem('tempVisits');
              if (existingTemp) {
                tempVisits = JSON.parse(existingTemp);
                // Remover a visita antiga se existir
                const index = tempVisits.findIndex(v => v.id === visitId);
                if (index !== -1) {
                  tempVisits.splice(index, 1);
                }
              }
              
              tempVisits.push(resposta);
              localStorage.setItem('tempVisits', JSON.stringify(tempVisits));
              console.log('Visita temporária atualizada no localStorage');
              visitaSalva = true;
            } catch (e) {
              console.error('Erro ao atualizar visita no localStorage:', e);
            }
          }
        } else {
          // Criar nova visita
          console.log('Criando nova visita');
          try {
            resposta = await visitsService.create(visitData as any);
            console.log('Visita criada com sucesso:', resposta);
            visitaSalva = true;
          } catch (erro) {
            console.error('Erro ao criar visita, usando fallback:', erro);
            
            // Simular sucesso na criação para não bloquear o fluxo do usuário
            resposta = {
              id: Date.now(), // Usar timestamp como ID temporário
              customer_id: parseInt(formData.customerId),
              customer_name: formData.customerName,
              date: formData.date,
              time: formData.time,
              location: visitData.location || 'Local',
              type: visitData.type || 'Visita',
              notes: formData.notes || '',
              status: 'Agendado',
              reminder: formData.reminder !== '0',
              reminderMinutes: parseInt(formData.reminder),
              user_id: 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              _isTemp: true // Marcar como temporário
            };
            
            // Salvar no localStorage para persistir entre sessões
            try {
              // Primeiro recuperar visitas existentes
              let tempVisits: any[] = [];
              const existingTemp = localStorage.getItem('tempVisits');
              if (existingTemp) {
                tempVisits = JSON.parse(existingTemp);
              }
              
              // Adicionar a nova visita
              tempVisits.push(resposta);
              
              // Salvar de volta no localStorage
              localStorage.setItem('tempVisits', JSON.stringify(tempVisits));
              console.log('Visita temporária salva no localStorage:', resposta);
              visitaSalva = true;
            } catch (e) {
              console.error('Erro ao salvar visita no localStorage:', e);
            }
          }
        }
        
        // Se a visita foi salva com sucesso (backend ou localStorage)
        if (visitaSalva) {
          // Configurar lembrete se ativado
          if (resposta.reminder && parseInt(formData.reminder) > 0) {
            console.log(`Configurando lembrete para ${formData.reminder} minutos antes da visita`);
            
            // Usar serviço de notificação para agendar o lembrete
            notificationService.addReminder(
              resposta.id,
              resposta.date,
              resposta.time,
              resposta.customer_name,
              parseInt(formData.reminder)
            );
            
            // Mostrar confirmação visual do lembrete configurado
            console.log('Lembrete agendado com sucesso');
          }
          
          // Fechar formulário e informar sucesso
          if (onSuccess) onSuccess();
          onClose();
        }
      } catch (erro: any) {
        console.error('Erro não tratado:', erro);
        setError('Erro ao processar solicitação. Tente novamente.');
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error('Erro ao salvar visita:', err);
      setError(err.response?.data?.error || 'Erro ao salvar visita. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Atualizar estado de exibição dos detalhes de lembrete
    if (name === 'reminder') {
      setShowReminderDetails(value !== '0');
    }
  };
  
  // Função para pesquisa de cliente
  const handleCustomerSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerSearchTerm(e.target.value);
    setIsSearchingCustomer(true);
    
    // Garante que o campo de pesquisa está sempre visível quando em foco
    if (!isSearchingCustomer) {
      setIsSearchingCustomer(true);
    }
  };
  
  // Função para seleção de cliente
  const handleCustomerSelect = (customer: { id: number, name: string, document?: string }) => {
    setFormData({
      ...formData,
      customerId: customer.id.toString(),
      customerName: customer.name,
    });
    setIsSearchingCustomer(false);
    setCustomerSearchTerm('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Cliente *
          </label>
          
          <div className="relative">
            {formData.customerId ? (
              <div className="flex items-center justify-between w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                <span className="text-gray-900 dark:text-white">{formData.customerName}</span>
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none"
                  onClick={() => {
                    setFormData({ ...formData, customerId: '', customerName: '' });
                    setIsSearchingCustomer(true);
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <input
                type="text"
                placeholder="Pesquisar cliente..."
                value={customerSearchTerm}
                onChange={handleCustomerSearch}
                onFocus={() => setIsSearchingCustomer(true)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            )}
            
            {isSearchingCustomer && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {customers
                  .filter(customer => 
                    customerSearchTerm === '' || 
                    customer.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
                    (customer.document && customer.document.includes(customerSearchTerm))
                  )
                  .map(customer => (
                    <div
                      key={customer.id}
                      className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleCustomerSelect(customer)}
                    >
                      <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                      {customer.document && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.document}</div>
                      )}
                    </div>
                  ))}
                <div className="flex justify-end p-2 border-t border-gray-100 dark:border-gray-700">
                  <button
                    type="button"
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none"
                    onClick={() => {
                      setIsSearchingCustomer(false);
                      setCustomerSearchTerm('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>



        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Data *
          </label>
          <input
            type="date"
            name="date"
            required
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Horário *
          </label>
          <input
            type="time"
            name="time"
            required
            value={formData.time}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
      </div>



      <div>
        <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <span>Lembrete</span>
          {showReminderDetails && (
            <Bell className="h-4 w-4 text-blue-500" />
          )}
        </label>
        <div className={`relative w-full ${showReminderDetails ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
          <select
            name="reminder"
            value={formData.reminder}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${showReminderDetails ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}`}
          >
            <option value="0">Sem lembrete</option>
            <option value="15">15 minutos antes</option>
            <option value="30">30 minutos antes</option>
            <option value="60">1 hora antes</option>
            <option value="120">2 horas antes</option>
            <option value="1440">1 dia antes</option>
          </select>
          {showReminderDetails && (
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 flex items-center">
              <Bell className="h-3 w-3 mr-1" />
              <span>Você receberá um alerta antes da visita.</span>
            </div>
          )}
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

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
          {error}
        </div>
      )}
      
      <div className="flex justify-end space-x-3">
        <Button variant="secondary" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting || loading}>
          {submitting ? (
            <>
              <Loader className="animate-spin h-4 w-4 mr-2" />
              Salvando...
            </>
          ) : visitId ? 'Salvar Alterações' : 'Agendar Visita'}
        </Button>
      </div>
    </form>
  );
};

export default VisitForm;