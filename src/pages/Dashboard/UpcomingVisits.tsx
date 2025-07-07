import React from 'react';
import { Clock, User, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Visit {
  id: number;
  customer_name: string;
  time: string;
  date: string;
  location: string;
  type: string;
  _isTemp?: boolean; // Indicador para visitas temporárias
}

interface UpcomingVisitsProps {
  visits: Visit[];
}

const UpcomingVisits: React.FC<UpcomingVisitsProps> = ({ visits }) => {
  // Formatar as datas para exibição amigável
  const formatVisitDate = (dateString: string) => {
    try {
      const [year, month, day] = dateString.split('-').map(Number);
      
      // Verificar se temos uma data válida
      if (!year || !month || !day) {
        return dateString;
      }
      
      // Criar uma data com os componentes
      const visitDate = new Date(year, month - 1, day);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      // Comparar apenas as datas sem o tempo
      const visitDay = new Date(visitDate.getFullYear(), visitDate.getMonth(), visitDate.getDate());
      const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      
      // Verifica se é hoje
      if (visitDay.getTime() === todayDay.getTime()) {
        return 'Hoje';
      }
      // Verifica se é amanhã
      else if (visitDay.getTime() === tomorrowDay.getTime()) {
        return 'Amanhã';
      }
      // Caso contrário, retorna a data formatada
      else {
        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const displayVisits = visits.map(visit => ({
    ...visit,
    displayDate: formatVisitDate(visit.date)
  }));

  return (
    <div className="space-y-4">
      {visits.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-500 dark:text-gray-400">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
          <p>Nenhuma visita agendada</p>
          <p className="text-sm mt-1">Suas próximas visitas aparecerão aqui.</p>
        </div>
      ) : (
        displayVisits.map((visit) => (
        <div key={visit.id} className={`flex items-center space-x-4 p-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${visit._isTemp ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800' : 'bg-gray-50 dark:bg-gray-700/50'}`}>
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {visit.customer_name}
              </p>
              {/* Tag de visita temporária removida */}
            </div>
            <div className="flex items-center space-x-4 mt-1">
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 mr-1" />
                {visit.time} - {visit.displayDate}
              </div>
              {/* Localização removida */}
            </div>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {visit.type}
            </p>
          </div>
        </div>
      )))
      }
      {visits.length > 0 && (
        <div className="flex justify-center mt-4">
          <Link 
            to="/schedule" 
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            Gerenciar visitas
          </Link>
        </div>
      )}
    </div>
  );
};

export default UpcomingVisits;