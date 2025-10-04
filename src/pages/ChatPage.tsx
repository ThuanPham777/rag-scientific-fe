import { useEffect } from 'react';
import { usePapersStore } from '../store/usePapersStore';
import { pollMessages, sendQuery } from '../services/api';
import PdfPanel from '../components/pdf/PdfPanel';
import ChatPanel from '../components/chat/ChatPanel';

export default function ChatPage() {
  const { session, addMessage, papers } = usePapersStore();
  const activePaper =
    papers.find((p) => p.id === session?.activePaperId) ?? papers[0];

  useEffect(() => {
    let t: any;
    const run = async () => {
      if (!session) return;
      try {
        const res = await pollMessages(session.id);
        res.messages.forEach((m: any) => addMessage(m));
      } catch {}
      t = setTimeout(run, 1200);
    };
    run();
    return () => clearTimeout(t);
  }, [session?.id]);

  if (!session)
    return (
      <div className='min-h-[calc(100vh-4rem)] pl-16 pt-16 flex items-center justify-center'>
        No session. Go back and upload PDFs.
      </div>
    );

  const onSend = async (text: string) => {
    addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    });
    await sendQuery(session.id, text, session.activePaperId);
  };

  return (
    <div className='pt-8 pl-8 pb-6'>
      {/* đặt chiều cao khung làm việc một lần */}
      <div className='h-[calc(100vh-4.5rem)] grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 px-3'>
        {/* LEFT: PDF Panel */}
        <PdfPanel activePaper={activePaper} />

        {/* RIGHT: Chat Panel */}
        {session && (
          <ChatPanel
            session={session}
            onSend={onSend}
          />
        )}
      </div>
    </div>
  );
}
