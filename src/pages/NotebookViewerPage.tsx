import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';

export default function NotebookViewerPage() {
  const { id } = useParams<{ id?: string }>();
  const [notebook, setNotebook] = useState<any | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const d = await notebookService.get(id);
        setNotebook(d);
      } catch (err) {
        console.error('Failed to load notebook', err);
      }
    };
    load();
  }, [id]);

  const handleUpdated = (updated: any) => {
    setNotebook(updated);
    qc.invalidateQueries({ queryKey: ['notebooks'] });
  };

  return (
    <div className='h-screen w-full bg-white'>
      <div className='max-w-6xl mx-auto h-full'>
        <NotebookEditor notebook={notebook} onUpdated={handleUpdated} />
      </div>
    </div>
  );
}
