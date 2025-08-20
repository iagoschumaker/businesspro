import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Card from '../../components/Common/Card';

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: LucideIcon;
<<<<<<< HEAD
  color: 'green' | 'blue' | 'purple' | 'orange';
=======
  color: 'green' | 'blue' | 'purple' | 'orange' | 'indigo' | 'red';
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change, trend, icon: Icon, color }) => {
  const colorClasses = {
    green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
<<<<<<< HEAD
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
=======
    orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
  };

  const trendColors = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400'
  };

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
<<<<<<< HEAD
          <p className="text-base md:text-2xl font-bold text-gray-900 dark:text-white mt-1">
=======
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
>>>>>>> 5a4704ac2e2c756460ac5e41df854892cb2a6d8b
            {value}
          </p>
          <div className="flex items-center mt-2">
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-500" />
            )}
            <span className={`text-sm font-medium ml-1 ${trendColors[trend]}`}>
              {change}
            </span>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </Card>
  );
};

export default StatsCard;