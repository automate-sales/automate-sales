interface AlertProps {
    message?: string;
    type?: 'error' | 'success';
  }
  
  const Alert: React.FC<{
    message?: string;
    type?: 'error' | 'success';
  }> = ({ message, type = 'error' }) => {
    if (!message) return null;
    const bgColor = type === 'error' ? 'bg-red-500' : 'bg-green-500';
    return (
      <div
        className={`${bgColor} text-white opacity-80 px-4 py-2 m-1 flex justify-center shadow-sm rounded-sm border border-transparent transition-all duration-500 ease-in-out transform translate-y-0 overflow-hidden`}
        style={{ animation: 'slide-down 0.5s ease forwards' }}
      >
        {message}
      </div>
    );
  };
  
  export default Alert;