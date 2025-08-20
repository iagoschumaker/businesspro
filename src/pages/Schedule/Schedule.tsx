<<<<<<< HEAD
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, CheckCircle, Clock, Trash2, Undo2 } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import VisitForm from './VisitForm';
import FloatingActionButton from '../../components/Common/FloatingActionButton';
import { visitsService, Visit } from '../../services/visitsService';
import { toast } from 'react-hot-toast';

const Schedule: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'pendentes' | 'atrasadas' | 'concluidas'>('pendentes');
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [visitToDelete, setVisitToDelete] = useState<Visit | null>(null);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [openVisitId, setOpenVisitId] = useState<string | number | null>(null);
  const [highlightId, setHighlightId] = useState<string | number | null>(null);

  // Load visits from API
  const loadVisits = async () => {
    try {
      setLoading(true);
      const data = await visitsService.getAll();
      setVisits(data);
    } catch (error) {
      console.error('Erro ao carregar visitas:', error);
      toast.error('Erro ao carregar visitas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ajusta a aba inicial a partir da URL (?tab=pendentes|atrasadas|concluidas)
    const tab = (searchParams.get('tab') || '').toLowerCase();
    if (tab === 'pendentes' || tab === 'atrasadas' || tab === 'concluidas') {
      setActiveTab(tab as any);
    }
    // Detecta alvo para abrir diretamente (?open=<id>)
    const openParam = searchParams.get('open');
    if (openParam) setOpenVisitId(openParam);
    loadVisits();
  }, []);

  // Atualização automática para mover visitas para atrasadas
  useEffect(() => {
    const interval = setInterval(() => {
      // Force re-render to update visit categorization based on current time
      setVisits(currentVisits => [...currentVisits]);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Handle deleting a visit
  const handleDeleteVisit = (visit: Visit) => {
    setVisitToDelete(visit);
  };

  const confirmDeleteVisit = async () => {
    if (!visitToDelete) return;
    
    const visitId = visitToDelete.id || (visitToDelete as any)._id;
    if (!visitId) {
      toast.error('ID da visita não encontrado');
      return;
    }
    
    setDeletingId(visitId);
    try {
      await visitsService.delete(visitId);
      toast.success('Visita excluída com sucesso!');
      loadVisits();
      setVisitToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir visita:', error);
      toast.error('Erro ao excluir visita');
    } finally {
      setDeletingId(null);
    }
  };

  const cancelDeleteVisit = () => {
    setVisitToDelete(null);
  };

  // Handle completing a visit
  const handleCompleteVisit = async (visit: Visit) => {
    const visitId = visit.id || (visit as any)._id;
    if (!visitId) {
      toast.error('ID da visita não encontrado');
      return;
    }
    
    try {
      await visitsService.updateStatus(visitId, 'Concluído');
      toast.success('Visita marcada como concluída!');
      loadVisits(); // Reload visits
    } catch (error) {
      console.error('Erro ao concluir visita:', error);
      toast.error('Erro ao concluir visita');
    }
  };

  // Handle undoing a completed visit
  const handleUndoCompleteVisit = async (visit: Visit) => {
    const visitId = visit.id || (visit as any)._id;
    if (!visitId) {
      toast.error('ID da visita não encontrado');
      return;
    }

    // Determina o status correto baseado na data/hora atual
    const isOverdue = isVisitOverdue(visit);
    const newStatus = isOverdue ? 'Pendente' : 'Agendado'; // Usa 'Pendente' para atrasadas e 'Agendado' para futuras
    
    try {
      await visitsService.updateStatus(visitId, newStatus);
      toast.success(`Visita revertida para ${isOverdue ? 'Pendente (Atrasada)' : 'Agendado'}!`);
      loadVisits(); // Reload visits
    } catch (error) {
      console.error('Erro ao reverter visita:', error);
      toast.error('Erro ao reverter visita');
    }
  };



  // Função para verificar se uma visita está atrasada
  const isVisitOverdue = (visit: Visit) => {
    const now = new Date();
    
    // Fix timezone issue: compare dates as strings to avoid timezone conversion
    const today = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0');
    
    // Se a data da visita é anterior a hoje, está atrasada
    if (visit.date < today) {
      return visit.status !== 'Concluído' && visit.status !== 'Cancelado';
    }
    
    // Se é hoje, verifica se passou do horário
    if (visit.date === today && visit.time) {
      const currentTime = String(now.getHours()).padStart(2, '0') + ':' + 
        String(now.getMinutes()).padStart(2, '0');
      return visit.time < currentTime && visit.status !== 'Concluído' && visit.status !== 'Cancelado';
    }
    
    return false;
  };

  // Categorizar visitas
  const categorizeVisits = (allVisits: Visit[]) => {
    return {
      todas: allVisits,
      pendentes: allVisits.filter(visit => 
        (visit.status === 'Agendado' || visit.status === 'Pendente') && !isVisitOverdue(visit)
      ),
      atrasadas: allVisits.filter(visit => isVisitOverdue(visit)),
      concluidas: allVisits.filter(visit => visit.status === 'Concluído')
    };
  };

  const categorizedVisits = categorizeVisits(visits);
  const filteredVisits = categorizedVisits[activeTab];

  // Deep-linking: localizar visita alvo, alternar aba correta e focar/destacar
  useEffect(() => {
    if (!openVisitId || !Array.isArray(visits) || visits.length === 0) return;
    const idStr = String(openVisitId);
    const target = visits.find(v => String((v as any).id || (v as any)._id) === idStr);
    if (!target) return;

    // Determina a aba correta para a visita
    const overdue = isVisitOverdue(target);
    const desiredTab = target.status === 'Concluído' ? 'concluidas' : (overdue ? 'atrasadas' : 'pendentes');
    if (activeTab !== desiredTab) {
      setActiveTab(desiredTab as any);
      // aguarda render da lista com a aba correta
      setTimeout(() => {
        try {
          const el = document.getElementById(`visit-${idStr}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightId(idStr);
            setTimeout(() => setHighlightId(null), 2500);
          }
        } catch {}
      }, 120);
    } else {
      // já estamos na aba correta
      setTimeout(() => {
        try {
          const el = document.getElementById(`visit-${idStr}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightId(idStr);
            setTimeout(() => setHighlightId(null), 2500);
          }
        } catch {}
      }, 100);
    }
  }, [visits, openVisitId, activeTab]);



  return (
    <div className="space-y-6">
      

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {/* Pendentes */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pendentes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-yellow-600 dark:text-yellow-400">{categorizedVisits.pendentes.length}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{categorizedVisits.pendentes.length} visitas</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </Card>
        {/* Atrasadas */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Atrasadas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-red-600 dark:text-red-400">{categorizedVisits.atrasadas.length}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{categorizedVisits.atrasadas.length} visitas</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <Clock className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </Card>
        {/* Concluídas */}
        <Card padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Concluídas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                <span className="text-green-600 dark:text-green-400">{categorizedVisits.concluidas.length}</span>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{categorizedVisits.concluidas.length} visitas</p>
            </div>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        {/* Abas de filtro */}
        <div className="mb-2">
          <div className="flex space-x-8 overflow-x-auto overflow-y-hidden">
            <button
              onClick={() => setActiveTab('pendentes')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'pendentes'
                  ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Agendadas ({categorizedVisits.pendentes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('atrasadas')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'atrasadas'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Atrasadas ({categorizedVisits.atrasadas.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('concluidas')}
              className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'concluidas'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Concluídas ({categorizedVisits.concluidas.length})</span>
            </button>
          </div>
        </div>


        {filteredVisits.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
              Nenhuma visita agendada
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comece agendando uma nova visita para esta data.
            </p>
            {/* Ação removida: usar o botão flutuante "+" */}
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Carregando visitas...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredVisits.map((visit, index) => {
              const vid = (visit as any).id || (visit as any)._id || index;
              const isHighlighted = String(highlightId || '') === String(vid || '');
              return (
                <div
                  key={vid}
                  id={`visit-${vid}`}
                  className={`p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    isHighlighted ? 'ring-2 ring-blue-400/60 bg-blue-50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  {/* Mobile cards - estilo Produtos */}
                  <div className="flex flex-col items-center sm:flex-row sm:items-center space-y-3 sm:space-y-0">
                    {/* Main content */}
                    <div className="flex-1 min-w-0 flex flex-col items-center text-center sm:items-start sm:text-left">
                        {/* Customer name */}
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate mb-2">
                          {visit.customer_name || (visit.customer_id as any)?.name || `Cliente ID: ${visit.customer_id}`}
                        </h4>
                        
                        {/* Status */}
                        <div className="mb-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            activeTab === 'pendentes' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                            activeTab === 'atrasadas' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          }`}>
                            {activeTab === 'pendentes' ? 'Agendado' :
                             activeTab === 'atrasadas' ? 'Atrasada' :
                             'Concluída'}
                          </span>
                        </div>
                        
                        {/* Date and time info */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>
                              {visit.date ? (() => {
                                // Fix timezone issue: format date string directly without Date conversion
                                const [year, month, day] = visit.date.split('-');
                                return `${day}/${month}/${year}`;
                              })() : 'Data não informada'}
                            </span>
                          </div>
                          <div className="flex items-center justify-center sm:justify-start text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>{visit.time || 'Horário não informado'}</span>
                          </div>
                        </div>
                        
                        {/* Notes */}
                        {visit.notes && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 line-clamp-2">
                            {visit.notes}
                          </div>
                        )}
                      </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-center space-x-2 flex-shrink-0 sm:ml-auto">
                      <Button
                        size="sm"
                        variant="danger"
                        aria-label="Excluir visita"
                        onClick={() => handleDeleteVisit(visit)}
                        className="p-2"
                      >
                        <Trash2 size={18} />
                      </Button>
                      {activeTab === 'concluidas' ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          aria-label="Desfazer conclusão"
                          onClick={() => handleUndoCompleteVisit(visit)}
                          className="p-2"
                        >
                          <Undo2 size={18} />
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="success"
                          aria-label="Concluir visita"
                          onClick={() => handleCompleteVisit(visit)}
                          className="p-2"
                        >
                          <CheckCircle size={18} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Visit Form Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nova Visita"
        size="md"
      >
        <VisitForm 
          onClose={() => setIsModalOpen(false)} 
          onSave={loadVisits}
        />
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal
        isOpen={!!visitToDelete}
        onClose={cancelDeleteVisit}
        title="Excluir Visita"
        size="sm"
      >
        <div className="py-2">
          <p className="text-lg text-gray-900 dark:text-white mb-4">
            Deseja realmente excluir esta visita? Esta ação não poderá ser desfeita.
          </p>
          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={cancelDeleteVisit}>
              Cancelar
            </Button>
            <Button 
              variant="danger" 
              onClick={confirmDeleteVisit} 
              loading={deletingId === visitToDelete?.id}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Floating Action Button */}
      <FloatingActionButton
        ariaLabel="Nova Visita"
        onClick={() => setIsModalOpen(true)}
      />
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    </div>
  );
};

<<<<<<< HEAD
export default Schedule;
=======
export default Schedule;
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
