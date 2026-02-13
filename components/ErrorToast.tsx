// FIX: Implemented the ErrorToast component.
import React, { useEffect } from 'react';

interface ErrorToastProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorToast: React.FC<ErrorToastProps> = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 5000); // Dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-5 right-5 bg-red-600 text-white py-3 px-5 rounded-lg shadow-lg flex items-center justify-between z-30 border border-red-800 animate-fade-in-down">
      <style>{`
        @keyframes fade-in-down {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.3s ease-out forwards;
        }
      `}</style>
      <p className="mr-4">{message}</p>
      <button 
        onClick={onDismiss} 
        className="font-bold text-red-100 hover:text-white"
      >
        &times;
      </button>
    </div>
  );
};
