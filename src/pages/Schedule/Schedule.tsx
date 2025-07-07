import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Edit, 
  Loader, 
  MapPin, 
  Plus, 
  RefreshCw, 
  Check, 
  Trash, 
  AlertTriangle 
} from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import { visitsService } from '../../services/api';
import Modal from '../../components/Common/Modal';
import VisitForm from './VisitForm';

// Tipos
interface Visit {
  id: number;
  customer_id?: number;
  customer_name?: string;
  date?: string;
  time?: string;
  notes?: string;
  status: string;
  type?: string;
  location?: string;
  reminder?: number;
  _isTemp?: boolean;
}

interface NotificationType {
  type: 'success' | 'error' | 'info';
  message: string;
}


// Função para formatar data no formato brasileiro
const formatDateBr = (isoDate: string): string => {
  if (!isoDate) return '';
  
  try {
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return isoDate;
  }
};

// Função auxiliar para determinar as cores baseadas no status
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Agendado':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'Em andamento':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'Concluído':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'Cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

const Schedule: React.FC<{}> = () => {
  // Estados
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [visits, setVisits] = useState<Visit[]>([]);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
  const [notification, setNotification] = useState<NotificationType | null>(null);
  const [loadingAction, setLoadingAction] = useState<number | null>(null);

  // Função para buscar visitas
  const fetchVisits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar visitas da API
      const response = await visitsService.getAll();
      console.log('Visitas carregadas:', response);
      
      let visitsData = Array.isArray(response) ? response : (response.data || []);
      
      // Verificar se há visitas temporárias no localStorage
      const tempVisitsString = localStorage.getItem('tempVisits');
      if (tempVisitsString) {
        try {
          const tempVisits = JSON.parse(tempVisitsString);
          if (Array.isArray(tempVisits) && tempVisits.length > 0) {
            // Adicionar flag _isTemp para identificar visitas temporárias
            const tempVisitsWithFlag = tempVisits.map((visit: Visit) => ({
              ...visit,
              _isTemp: true
            }));
            // Concatenar com as visitas da API
            visitsData = [...visitsData, ...tempVisitsWithFlag];
          }
        } catch (err) {
          console.error('Erro ao processar visitas temporárias:', err);
        }
      }
      
      setVisits(visitsData);
    } catch (err) {
      console.error('Erro ao buscar visitas:', err);
      setError('Não foi possível carregar as visitas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Carregar visitas ao montar o componente
  useEffect(() => {
    fetchVisits();
    
    // Atualizar automaticamente a cada 30 segundos
    const intervalId = setInterval(() => {
      fetchVisits();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchVisits]);
  
  // Filtrar visitas quando a data selecionada ou a lista de visitas mudar
  useEffect(() => {
    let filtered = [...visits];
    
    if (!showAllVisits) {
      filtered = filtered.filter(visit => visit.date === selectedDate);
    }
    
    // Ordenar por data e hora
    filtered.sort((a, b) => {
      // Primeiro por data
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA < dateB) return -1;
      if (dateA > dateB) return 1;
      
      // Se as datas são iguais, ordenar por hora
      const timeA = a.time || '';
      const timeB = b.time || '';
      if (timeA < timeB) return -1;
      if (timeA > timeB) return 1;
      
      return 0;
    });
    
    setFilteredVisits(filtered);
  }, [selectedDate, visits, showAllVisits]);

  // Verifica se uma visita está atrasada
  const isVisitOverdue = (visit: Visit) => {
    if (visit.status === 'Concluído' || visit.status === 'Cancelado') {
      return false;
    }
    const now = new Date();
    if (!visit.date || !visit.time) return false;
    const [year, month, day] = visit.date.split('-').map(Number);
    const [hours, minutes] = visit.time.split(':').map(Number);
    const visitDate = new Date(year, month - 1, day, hours, minutes, 0);
    return visitDate < now;
  };



  // Função para criar uma nova visita
  const handleNewVisit = () => {
    setIsEditMode(false);
    setSelectedVisitId(null);
    setIsModalOpen(true);
  };

  // Função para editar uma visita
  const handleEditVisit = (visitId: number) => {
    setSelectedVisitId(visitId);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  // Função para concluir uma visita
  const handleConcludeVisit = async (visitId: number) => {
    try {
      setLoadingAction(visitId);
      const isTemp = visits.find(v => v.id === visitId)?._isTemp;
      const visit = visits.find(v => v.id === visitId);
      if (!visit) throw new Error('Visita não encontrada');
      if (isTemp) {
        const tempVisitsString = localStorage.getItem('tempVisits');
        if (tempVisitsString) {
          const tempVisits = JSON.parse(tempVisitsString);
          const updatedVisits = tempVisits.map((v: any) =>
            v.id === visitId ? { ...v, status: 'Concluído' } : v
          );
          localStorage.setItem('tempVisits', JSON.stringify(updatedVisits));
          setNotification({ type: 'success', message: 'Visita concluída com sucesso!' });
          await fetchVisits();
        }
      } else {
        await visitsService.update(visitId, { ...visit, status: 'Concluído' });
        setNotification({ type: 'success', message: 'Visita concluída com sucesso!' });
        await fetchVisits();
      }
    } catch (err) {
      console.error('Erro ao concluir visita:', err);
      setNotification({ type: 'error', message: 'Erro ao concluir visita. Tente novamente.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Função para excluir uma visita
  const handleDeleteVisit = async (visitId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta visita?')) return;
    
    try {
      setLoadingAction(visitId);
      const isTemp = visits.find(v => v.id === visitId)?._isTemp;
      
      if (isTemp) {
        const tempVisitsString = localStorage.getItem('tempVisits');
        if (tempVisitsString) {
          const tempVisits = JSON.parse(tempVisitsString);
          const updatedVisits = tempVisits.filter((v: any) => v.id !== visitId);
          localStorage.setItem('tempVisits', JSON.stringify(updatedVisits));
          setNotification({ type: 'success', message: 'Visita excluída com sucesso!' });
          await fetchVisits();
        }
      } else {
        await visitsService.delete(visitId);
        setNotification({ type: 'success', message: 'Visita excluída com sucesso!' });
        await fetchVisits();
      }
    } catch (err) {
      console.error('Erro ao excluir visita:', err);
      setNotification({ type: 'error', message: 'Erro ao excluir visita. Tente novamente.' });
    } finally {
      setLoadingAction(null);
    }
  };

  // Função chamada quando o formulário de visita é salvo com sucesso
  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchVisits();
    setNotification({
      type: 'success',
      message: isEditMode ? 'Visita atualizada com sucesso!' : 'Visita agendada com sucesso!'
    });
  };

  // Efeito para limpar notificações após 5 segundos
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);
  
  // Agrupar visitas por data para exibição quando mostrar todas
  const visitsByDate = React.useMemo(() => {
    if (!showAllVisits) return {};
    
    return filteredVisits.reduce((acc: Record<string, Visit[]>, visit) => {
      const date = visit.date || 'Sem data';
      if (!acc[date]) acc[date] = [];
      acc[date].push(visit);
      return acc;
    }, {});
  }, [filteredVisits, showAllVisits]);

  // Renderização do componente
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Agenda de Visitas</h1>
        
        <div className="flex items-center space-x-4">
          {/* Seletor de Data */}
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          {/* Botão Atualizar */}
          <Button 
            onClick={() => fetchVisits()}
            variant="secondary"
            disabled={loading}
            className="px-3 py-2"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          {/* Botão Nova Visita */}
          <Button onClick={handleNewVisit} className="px-4 py-2">
            <Plus className="h-5 w-5 mr-1" />
            Nova Visita
          </Button>
        </div>
      </div>
      
      {/* Checkbox para mostrar todas as visitas */}
      <div className="mb-6">
        <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
          <input 
            type="checkbox" 
            checked={showAllVisits}
            onChange={(e) => setShowAllVisits(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 dark:bg-gray-700"
          />
          <span>Mostrar todas as visitas</span>
        </label>
      </div>
      
      {/* Área de notificações */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg ${notification.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
          {notification.message}
        </div>
      )}
      
      {/* Mensagem de carregamento */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <Loader className="animate-spin h-8 w-8 text-blue-500" />
          <span className="ml-2 text-gray-600 dark:text-gray-400">Carregando visitas...</span>
        </div>
      )}
      
      {/* Mensagem de erro */}
      {error && !loading && (
        <Card className="mb-6 border-red-300 dark:border-red-700">
          <div className="p-4 text-red-800 dark:text-red-400 flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
            <div>
              <p className="font-medium">Erro ao carregar dados</p>
              <p>{error}</p>
              <Button onClick={fetchVisits} variant="secondary" className="mt-2">
                Tentar novamente
              </Button>
            </div>
          </div>
        </Card>
      )}
      
      {/* Sem visitas */}
      {!loading && !error && filteredVisits.length === 0 && (
        <Card className="text-center py-12">
          <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            {showAllVisits ? 'Nenhuma visita agendada' : 'Nenhuma visita para esta data'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {showAllVisits ? 'Você não possui visitas agendadas no sistema.' : `Não há visitas agendadas para ${formatDateBr(selectedDate)}.`}
          </p>
          <Button onClick={handleNewVisit}>
            <Plus className="h-5 w-5 mr-1" />
            Agendar Visita
          </Button>
        </Card>
      )}
      
      {/* Lista de visitas */}
      {!loading && !error && filteredVisits.length > 0 && (
        <div className="space-y-6">
          {/* Se estiver mostrando todas as visitas, agrupadas por data */}
          {showAllVisits ? (
            Object.entries(visitsByDate).sort(([dateA], [dateB]) => dateA.localeCompare(dateB)).map(([date, dateVisits]) => (
              <Card key={date} className="overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium text-gray-700 dark:text-gray-300">
                    {date === 'Sem data' ? 'Sem data definida' : formatDateBr(date)}
                  </h3>
                </div>
                
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {dateVisits.map((visit) => (
                    <div 
                      key={visit.id} 
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isVisitOverdue(visit) && visit.status !== 'Concluído' && visit.status !== 'Cancelado' ? 'bg-red-50 dark:bg-red-900/20' : visit._isTemp ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium text-gray-800 dark:text-white">
                            {visit.customer_name || 'Cliente não especificado'}
                          </h4>
                          
                          <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600 dark:text-gray-400">
                            {visit.time && (
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                <span>{visit.time}</span>
                              </div>
                            )}
                            
                            {visit.location && (
                              <div className="flex items-center">
                                <MapPin className="h-4 w-4 mr-1" />
                                <span>{visit.location}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Status da visita */}
                          <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                            {visit.status}
                          </span>
                          
                          {/* Observações */}
                          {visit.notes && (
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                              {visit.notes}
                            </p>
                          )}
                        </div>
                        
                        {/* Botões de ação */}
                        <div className="flex space-x-2">
                          {visit.status !== 'Concluído' && visit.status !== 'Cancelado' && (
                            <Button 
                              onClick={() => handleEditVisit(visit.id)}
                              variant="secondary"
                              size="sm"
                              className="p-1"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {visit.status !== 'Concluído' && visit.status !== 'Cancelado' && (
                            <Button 
                              onClick={() => handleConcludeVisit(visit.id)}
                              variant="secondary"
                              size="sm"
                              className="p-1 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                              disabled={loadingAction === visit.id}
                            >
                              {loadingAction === visit.id ? 
                                <Loader className="h-4 w-4 animate-spin" /> : 
                                <Check className="h-4 w-4" />
                              }
                            </Button>
                          )}
                          
                          <Button 
                            onClick={() => handleDeleteVisit(visit.id)}
                            variant="secondary"
                            size="sm"
                            className="p-1 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                            disabled={loadingAction === visit.id}
                          >
                            {loadingAction === visit.id ? 
                              <Loader className="h-4 w-4 animate-spin" /> : 
                              <Trash className="h-4 w-4" />
                            }
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          ) : (
            /* Visitas filtradas pela data selecionada */
            <Card>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredVisits.map((visit) => (
                  <div 
                    key={visit.id} 
                    className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${isVisitOverdue(visit) && visit.status !== 'Concluído' && visit.status !== 'Cancelado' ? 'bg-red-50 dark:bg-red-900/20' : visit._isTemp ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-800 dark:text-white">
                          {visit.customer_name || 'Cliente não especificado'}
                        </h4>
                        
                        <div className="flex items-center mt-1 space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          {visit.time && (
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{visit.time}</span>
                            </div>
                          )}
                          
                          {visit.location && (
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              <span>{visit.location}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Status da visita */}
                        <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(visit.status)}`}>
                          {visit.status}
                        </span>
                        
                        {/* Observações */}
                        {visit.notes && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
                            {visit.notes}
                          </p>
                        )}
                      </div>
                      
                      {/* Botões de ação */}
                      <div className="flex space-x-2">
                        {visit.status !== 'Concluído' && visit.status !== 'Cancelado' && (
                          <Button 
                            onClick={() => handleEditVisit(visit.id)}
                            variant="secondary"
                            size="sm"
                            className="p-1"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {visit.status !== 'Concluído' && visit.status !== 'Cancelado' && (
                          <Button 
                            onClick={() => handleConcludeVisit(visit.id)}
                            variant="secondary"
                            size="sm"
                            className="p-1 text-green-600 hover:text-green-700 dark:text-green-500 dark:hover:text-green-400"
                            disabled={loadingAction === visit.id}
                          >
                            {loadingAction === visit.id ? 
                              <Loader className="h-4 w-4 animate-spin" /> : 
                              <Check className="h-4 w-4" />
                            }
                          </Button>
                        )}
                        
                        <Button 
                          onClick={() => handleDeleteVisit(visit.id)}
                          variant="secondary"
                          size="sm"
                          className="p-1 text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400"
                          disabled={loadingAction === visit.id}
                        >
                          {loadingAction === visit.id ? 
                            <Loader className="h-4 w-4 animate-spin" /> : 
                            <Trash className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
      
      {/* Modal para criar/editar visitas */}
      <Modal 
        isOpen={isModalOpen}
        title={isEditMode ? 'Editar Visita' : 'Agendar Nova Visita'}
        onClose={() => setIsModalOpen(false)}
      >
        <VisitForm 
          onClose={() => setIsModalOpen(false)}
          visitId={selectedVisitId || undefined}
          onSuccess={handleFormSuccess}
        />
      </Modal>
    </div>
  );
};

export default Schedule;
