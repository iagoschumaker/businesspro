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
    </div>
  );
};

export default Schedule;