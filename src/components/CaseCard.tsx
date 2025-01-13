import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import type { Case } from '../types';

export default function CaseCard({ case: caseData }: { case: Case }) {
  const getPriorityColor = () => {
    switch (caseData.priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-amber-100 text-amber-800';
      case 'low':
        return 'bg-green-100 text-green-800';
    }
  };

  const getStatusIcon = () => {
    switch (caseData.status) {
      case 'open':
        return <AlertTriangle className="text-amber-500" />;
      case 'in_progress':
        return <Clock className="text-blue-500" />;
      case 'closed':
        return <CheckCircle className="text-green-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{caseData.title}</h3>
          <p className="text-sm text-gray-500">Last updated: {new Date(caseData.last_updated).toLocaleDateString()}</p>
        </div>
        {getStatusIcon()}
      </div>
      
      <p className="text-gray-600 mb-4 line-clamp-2">{caseData.description}</p>
      
      <div className="flex items-center gap-2">
        <span className={`px-3 py-1 rounded-full text-sm ${getPriorityColor()}`}>
          {caseData.priority} priority
        </span>
      </div>
    </div>
  );
}