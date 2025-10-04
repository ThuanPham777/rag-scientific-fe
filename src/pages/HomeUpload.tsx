//import { uploadPdfs, startSession } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import FileDropzone from '../components/uploader/FileDropzone';
import { usePapersStore } from '../store/usePapersStore';
import { startSession, uploadPdfs } from '../services/api';

export default function HomeUpload() {
  const nav = useNavigate();
  const setPapers = usePapersStore((s) => s.setPapers);
  const setSession = usePapersStore((s) => s.setSession);

  const onUpload = async (files: File[], setProgress: (n: number) => void) => {
    const { papers } = await uploadPdfs(files, setProgress);
    console.log('HomeUpload - uploaded papers:', papers);
    setPapers(papers);
    const { sessionId } = await startSession(papers.map((p) => p.id));
    console.log('HomeUpload - created session:', sessionId);
    setSession({
      id: sessionId,
      paperIds: papers.map((p) => p.id),
      messages: [],
      activePaperId: papers[0]?.id,
    });
    nav(`/chat`);
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center p-6'>
      <div className='max-w-3xl w-full'>
        <h1 className='text-3xl font-semibold text-center mb-6'>
          Chat with your Papers
        </h1>
        <p className='text-md text-center mb-6'>
          Upload any PDF to SciSpace Chat PDF, ask a question, and get concise,
          citation-linked answers, summaries, and follow-ups in seconds—free
          tier, 256-bit encrypted, no data training, supports 75 + languages.
        </p>
        <FileDropzone onUpload={onUpload} />
      </div>
    </div>
  );
}
