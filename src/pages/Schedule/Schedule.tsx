import React, { useState } from 'react';
import { Plus, Calendar, Clock, MapPin, User } from 'lucide-react';
import Card from '../../components/Common/Card';
import Button from '../../components/Common/Button';
import Modal from '../../components/Common/Modal';
import VisitForm from './VisitForm';

const Schedule: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const visits = [
    {
      id: 1,
      customer: 'João Silva',
      date: '2024-01-15',
      time: '09:00',
      location: 'Centro, São Paulo',
      type: 'Visita Comercial',
      status: 'Agendado',
      notes: 'Apresentação de novos produtos'
    },
    {
      id: 2,
      customer: 'Maria Santos',
      date: '2024-01-15',
      time: '14:30',
      location: 'Vila Olímpia, São Paulo',
      type: 'Apresentação',
      status: 'Confirmado',
      notes: 'Demonstração do sistema'
    },
    {
      id: 3,
      customer: 'Carlos Oliveira',
      date: '2024-01-16',
      time: '10:00',
      location: 'Moema, São Paulo',
      type: 'Follow-up',
      status: 'Agendado',
      notes: 'Acompanhamento da proposta'
    },
    {
      id: 4,
      customer: 'Ana Costa',
      date: '2024-01-17',
      time: '16:00',
      location: 'Pinheiros, São Paulo',
      type: 'Demonstração',
      status: 'Pendente',
      notes: 'Primeira reunião'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'Agendado':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'Pendente':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'Concluído':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Visita Comercial':
        return User;
      case 'Apresentação':
        return Calendar;
      case 'Follow-up':
        return Clock;
      default:
        return MapPin;
    }
  };

  const filteredVisits = visits.filter(visit => visit.date === selectedDate);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Agenda de Visitas
        </h1>
        <Button icon={Plus} onClick={() => setIsModalOpen(true)}>
          Nova Visita
        </Button>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Selecionar Data
          </h2>
          <div className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {visits.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Total de Visitas
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {visits.filter(v => v.status === 'Confirmado').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Confirmadas
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {visits.filter(v => v.status === 'Pendente').length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Pendentes
              </div>
            </div>
          </Card>
          <Card padding="sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {filteredVisits.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Hoje
              </div>
            </div>
          </Card>
        </div>
      </Card>

      {/* Visits for Selected Date */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Visitas para {new Date(selectedDate).toLocaleDateString('pt-BR')}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredVisits.length} visita(s) agendada(s)
          </span>
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
            <div className="mt-6">
              <Button onClick={() => setIsModalOpen(true)}>
                Agendar Visita
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVisits.map((visit) => {
              const TypeIcon = getTypeIcon(visit.type);
              return (
                <div key={visit.id} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <TypeIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                            {visit.customer}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                            {visit.status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4 mr-2" />
                            {visit.time}
                          </div>
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4 mr-2" />
                            {visit.location}
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">
                            {visit.type}
                          </div>
                          {visit.notes && (
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                              {visit.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="secondary">
                        Editar
                      </Button>
                      <Button size="sm" variant="success">
                        Concluir
                      </Button>
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
        size="lg"
      >
        <VisitForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Schedule;