import { CheckCircle, Clock, AlertCircle } from 'lucide-react';
import type { WorkflowStep } from '../types';

export default function WorkflowCard({ step }: { step: WorkflowStep }) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="text-green-500" />;
      case 'in_progress':
        return <Clock className="text-amber-400" />;
      case 'pending':
        return <AlertCircle className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
        {getStatusIcon()}
      </div>
      <p className="text-gray-600 mb-4">{step.description}</p>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
          {step.agent}
        </span>
      </div>
    </div>
  );
}