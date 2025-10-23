import { useNavigate } from 'react-router-dom';
import FileDropzone from '../components/uploader/FileDropzone';
import { startSession, uploadPdf } from '../services/api';
import { usePaperStore } from '../store/usePaperStore';

export default function HomeUpload() {
  const nav = useNavigate();
  const setPaper = usePaperStore((s) => s.setPaper);
  const setSession = usePaperStore((s) => s.setSession);

  const onUpload = async (file: File, setProgress: (v: number) => void) => {
    const { paper } = await uploadPdf(file, setProgress);
    console.log('HomeUpload - uploaded paper:', paper);
    setPaper(paper);
    const { sessionId } = await startSession([paper.id]);
    console.log('HomeUpload - created session:', sessionId);
    setSession({
      id: sessionId,
      paperIds: [paper.id],
      messages: [],
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
