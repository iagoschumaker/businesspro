import React from 'react';

export type PeriodOption = 'today' | '7d' | '30d' | 'thisMonth' | 'lastMonth' | 'all' | 'custom';

interface StatsHeaderProps {
  title?: React.ReactNode;
  period?: PeriodOption;
  onChangePeriod?: (p: PeriodOption) => void;
  showPeriod?: boolean;
  actions?: React.ReactNode; // buttons/extra controls on the right
  className?: string;
  customDays?: number;
  onChangeCustomDays?: (n: number) => void;
  customStart?: string; // YYYY-MM-DD
  customEnd?: string;   // YYYY-MM-DD
  onChangeCustomStart?: (s: string) => void;
  onChangeCustomEnd?: (s: string) => void;
}

const StatsHeader: React.FC<StatsHeaderProps> = ({
  title,
  period = '30d',
  onChangePeriod,
  showPeriod = false,
  actions,
  className,
  customStart,
  customEnd,
  onChangeCustomStart,
  onChangeCustomEnd,
}) => {
  return (
    <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-3 ${className ?? ''}`}>
      <div className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
        {title}
      </div>
      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-start md:justify-end">
        {showPeriod && (
          <>
            <label className="text-xs text-gray-500 dark:text-gray-400">Período:</label>
            <select
              className="shrink-0 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
              value={period}
              onChange={(e) => onChangePeriod?.(e.target.value as PeriodOption)}
            >
              <option value="today">Hoje</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="thisMonth">Este mês</option>
              <option value="lastMonth">Mês passado</option>
              <option value="all">Todos</option>
              <option value="custom">Personalizado</option>
            </select>
            {period === 'custom' && (
              <div className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400">De:</span>
                  <input
                    type="date"
                    value={customStart || ''}
                    onChange={(e) => onChangeCustomStart?.(e.target.value)}
                    className="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Até:</span>
                  <input
                    type="date"
                    value={customEnd || ''}
                    onChange={(e) => onChangeCustomEnd?.(e.target.value)}
                    className="w-full sm:w-auto rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 dark:text-white"
                  />
                </div>
              </div>
            )}
          </>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
};

export default StatsHeader;
