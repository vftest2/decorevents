import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntity } from '@/contexts/EntityContext';

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useEntity();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/auth');
    }
  }, [isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
};

export default Index;
