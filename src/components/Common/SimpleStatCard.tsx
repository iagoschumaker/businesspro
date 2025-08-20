import React from 'react';

export interface SimpleStatCardProps {
  icon: React.ReactNode;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

const SimpleStatCard: React.FC<SimpleStatCardProps> = ({ icon, value, subtitle, className }) => {
  return (
    <div className={`text-center ${className ?? ''}`}>
      {icon}
      <div className="text-base md:text-2xl font-bold">{value}</div>
      {subtitle && (
        <div className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</div>
      )}
    </div>
  );
};

export default SimpleStatCard;
