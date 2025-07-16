import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, children }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-white">{title}</h1>
        {description && <p className="text-gray-400 mt-1">{description}</p>}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
};
