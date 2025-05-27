import React from 'react';
import { useNavigate } from 'react-router-dom';
import PiketSpktChatPage from '@/components/ui/PiketSpktChatPage';

const PiketSpkt: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div className="h-screen">
      <PiketSpktChatPage onBack={handleBack} />
    </div>
  );
};

export default PiketSpkt; 