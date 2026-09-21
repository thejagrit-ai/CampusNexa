import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function BackToCareer() {
  const navigate = useNavigate();
  return <Button variant="ghost" size="sm" className="-ml-3 mb-2 gap-2 text-muted-foreground" onClick={() => navigate('/career')}><ArrowLeft className="h-4 w-4" /> Back to Career Portal</Button>;
}
