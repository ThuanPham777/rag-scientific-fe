// src/pages/ChatHistoryPage.tsx
import { History } from 'lucide-react';
import ChatHistoryTable from '@/components/chat/ChatHistoryTable';

export default function ChatHistoryPage() {
  return (
    <div className='flex flex-col h-[calc(100vh-56px)] bg-white'>
      {/* Header */}
      <header className='flex items-center gap-3 px-6 py-4 border-b shrink-0'>
        <History className='h-5 w-5 text-gray-500' />
        <h2 className='text-xl font-semibold text-gray-900'>Session History</h2>
      </header>

      {/* Table */}
      <div className='flex-1 overflow-auto'>
        <ChatHistoryTable />
      </div>
    </div>
  );
}
