import React, { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatBRDateTime } from '../../utils/date';

const FloatingClock: React.FC = () => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 select-none">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg px-3 py-2 flex items-center space-x-2">
        <Clock className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        <div className="text-sm font-medium text-gray-800 dark:text-gray-100">
          {formatBRDateTime(now)}
        </div>
      </div>
    </div>
  );
};

export default FloatingClock;
