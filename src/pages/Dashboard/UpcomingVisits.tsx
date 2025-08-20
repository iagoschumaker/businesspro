import React from 'react';
<<<<<<< HEAD
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, User } from 'lucide-react';

interface Visit {
  id: number;
  customer_name?: string;
  customer_id: any; // Can be ObjectId string or populated object
  time: string;
  date: string;
  location?: string;
  type?: string;
  notes?: string;
  status: string;
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

interface UpcomingVisitsProps {
  visits: Visit[];
}

const UpcomingVisits: React.FC<UpcomingVisitsProps> = ({ visits }) => {
<<<<<<< HEAD
  const navigate = useNavigate();
  // Determina se a visita está atrasada sem depender do status vindo da API
  const isOverdue = (visit: any) => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    const visitDate = (visit.rawDate || visit.date || '');
    if (!visitDate) return false;
    if (visitDate < todayStr) return true;
    if (visitDate > todayStr) return false;
    // mesma data: compara HH:mm
    const nowHH = String(today.getHours()).padStart(2, '0');
    const nowMM = String(today.getMinutes()).padStart(2, '0');
    const nowStr = `${nowHH}:${nowMM}`;
    const timeCandidate = (visit.rawTime || visit.time || '').toString();
    const hhmmMatch = timeCandidate.match(/^(\d{2}:\d{2})/);
    const visitTime = hhmmMatch ? hhmmMatch[1] : '23:59';
    return visitTime < nowStr;
  };

  // Filtrar apenas visitas não concluídas e não canceladas
  const filteredVisits = visits.filter(visit => 
    visit.status !== 'Concluído' && visit.status !== 'Cancelado'
  );

  const displayVisits = filteredVisits.map(visit => {
    // Manter valores crus separados para cálculos
    const rawDate = visit.date;
    const rawTime = visit.time;
    // Hoje em YYYY-MM-DD (sem timezone)
    const now = new Date();
    const YYYY = now.getFullYear();
    const MM = String(now.getMonth() + 1).padStart(2, '0');
    const DD = String(now.getDate()).padStart(2, '0');
    const todayStr = `${YYYY}-${MM}-${DD}`;

    // Montar exibição BR sem usar Date()
    const visitDateBR = (() => {
      const [y, m, d] = (rawDate || '').split('-');
      if (y && m && d) return `${d}/${m}/${y}`;
      return rawDate;
    })();
    const isToday = (rawDate || '') === todayStr;
    return {
      ...visit,
      rawDate,
      rawTime,
      displayDate: isToday ? 'Hoje' : visitDateBR,
    } as any;
  });

  if (displayVisits.length === 0) {
    return (
      <div className="text-center py-8">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-sm font-medium text-gray-900 dark:text-white">
          Nenhuma visita agendada
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Agende novas visitas na página Schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayVisits.map((visit, index) => (
        <div
          key={visit.id || (visit as any)._id || `visit-${index}`}
          className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          onClick={() => {
            const id = (visit as any).id || (visit as any)._id;
            const overdue = isOverdue(visit);
            const tab = overdue ? 'atrasadas' : 'pendentes';
            if (id) navigate(`/schedule?tab=${tab}&open=${encodeURIComponent(id)}`);
            else navigate(`/schedule?tab=${tab}`);
          }}
        >
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
<<<<<<< HEAD
            <div className="flex items-center gap-2 mb-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">
                {visit.customer_name || (visit.customer_id as any)?.name || `Cliente ID: ${visit.customer_id}`}
              </p>
              {(() => {
                const raw = (visit.status as any) || '';
                const base = String(raw).trim();
                const overdue = isOverdue(visit);
                const displayStatus = overdue ? 'Atrasada' : (base || 'Pendente');
                const colorClass =
                  displayStatus === 'Atrasada'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    : displayStatus === 'Pendente' || displayStatus === 'Agendado'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                    : displayStatus === 'Concluído'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
                return (
                  <div className="flex-shrink-0">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
                      {displayStatus}
                    </span>
                  </div>
                );
              })()}
            </div>
            <div className="flex items-center space-x-4 mt-1">
              {(() => {
                const overdue = isOverdue(visit);
                const timeCandidate = (visit.rawTime || visit.time || '').toString();
                const hhmmMatch = timeCandidate.match(/^(\d{2}:\d{2})/);
                const showTime = hhmmMatch ? hhmmMatch[1] : (timeCandidate || '');
                return (
                  <div className={`flex items-center text-xs ${overdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    <Clock className="h-3 w-3 mr-1" />
                    {showTime} - {visit.displayDate || visit.date}
                  </div>
                );
              })()}
              {visit.location && (
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3 w-3 mr-1" />
                  {visit.location}
                </div>
              )}
            </div>
            {visit.type && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {visit.type}
              </p>
            )}
            {visit.notes && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {visit.notes}
              </p>
            )}
          </div>
        </div>
      ))}
=======
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
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
    </div>
  );
};

export default UpcomingVisits;