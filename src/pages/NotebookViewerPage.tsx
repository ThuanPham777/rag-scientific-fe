import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import notebookService from '@/services/notebookService';
import NotebookEditor from '@/components/notebook/NotebookEditor';
// exporting will produce a Word‑readable HTML document (saved with .docx extension).
// This avoids problematic dependencies such as html-docx-js which use `with`.


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
    <div className='h-screen w-full bg-gray-100 flex flex-col'>
      {/* simple header like docs/word */}
      <div className='flex items-center justify-between px-6 py-3 border-b bg-white shadow-sm relative'>
        <div className='flex items-center gap-4'>
          <button
            onClick={() => window.history.back()}
            className='p-1 rounded hover:bg-gray-200'
            title='Back'
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className='text-lg font-semibold truncate max-w-xs'>{notebook?.title || 'Untitled'}</h1>
        </div>

      

        <div className='flex items-center gap-4'>
          <select className='text-sm border rounded px-1'>
            <option>en</option>
            {/* other langs could go here */}
          </select>
        </div>
      </div>
      <div className='flex-1 max-w-6xl mx-auto h-full p-6'>
        <div className='bg-white h-full shadow rounded'>
          <NotebookEditor notebook={notebook} onUpdated={handleUpdated} />
        </div>
      </div>

      
    </div>
  );
}
