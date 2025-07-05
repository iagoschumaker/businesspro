import React from 'react';
import { Clock, MapPin, User } from 'lucide-react';

interface Visit {
  id: number;
  customer_name: string;
  time: string;
  date: string;
  location: string;
  type: string;
}

interface UpcomingVisitsProps {
  visits: Visit[];
}

const UpcomingVisits: React.FC<UpcomingVisitsProps> = ({ visits }) => {
  // Se não há dados, mostrar dados de exemplo
  const defaultVisits = [
    {
      id: 1,
      customer_name: 'João Silva',
      time: '09:00',
      date: 'Hoje',
      location: 'Centro, São Paulo',
      type: 'Visita Comercial'
    },
    {
      id: 2,
      customer_name: 'Maria Santos',
      time: '14:30',
      date: 'Hoje',
      location: 'Vila Olímpia, São Paulo',
      type: 'Apresentação'
    },
    {
      id: 3,
      customer_name: 'Carlos Oliveira',
      time: '10:00',
      date: 'Amanhã',
      location: 'Moema, São Paulo',
      type: 'Follow-up'
    },
    {
      id: 4,
      customer_name: 'Ana Costa',
      time: '16:00',
      date: 'Quarta-feira',
      location: 'Pinheiros, São Paulo',
      type: 'Demonstração'
    }
  ];

  const displayVisits = visits.length > 0 ? visits.map(visit => ({
    ...visit,
    date: new Date(visit.date).toLocaleDateString('pt-BR') === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : new Date(visit.date).toLocaleDateString('pt-BR')
  })) : defaultVisits;

  return (
    <div className="space-y-4">
      {displayVisits.map((visit) => (
        <div key={visit.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {visit.customer_name}
            </p>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {visit.time} - {visit.date}
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <MapPin className="h-3 w-3 mr-1" />
                {visit.location}
              </div>
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {visit.type}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default UpcomingVisits;