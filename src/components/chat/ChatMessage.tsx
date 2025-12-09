import { useState } from 'react';
import ReactDOM from 'react-dom';
import type { ChatMessage as Msg, Citation } from '../../utils/types';
import ChatMessageLoading from './ChatMessageLoading';
import { usePaperStore } from '../../store/usePaperStore';
import { X } from 'lucide-react';

export default function ChatMessage({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  const setPendingJump = usePaperStore((s) => s.setPendingJump);
  const [openList, setOpenList] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const SourcesList = ({ cites }: { cites: Citation[] }) => {
    console.log("cites", cites.map(c => c.snippet));
    if (!cites?.length) return null;
    return (
      <div className='mt-3'>
        <button
          className='text-xs text-gray-600 hover:text-gray-800 flex items-center gap-2'
          onClick={() => setOpenList((v: boolean) => !v)}
        >
          <span>{cites.length} Sources</span>
          <span className={`transition ${openList ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {openList && (
          <div className='mt-2 space-y-3'>
            {cites.map((c: Citation, i: number) => (
              <div key={i} className='pt-3 border-t border-gray-200'>
                <div className='flex items-start gap-2'>
                  <span className='inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold'>
                    {i + 1}
                  </span>
                  <div className='flex-1'>
                    <div className='text-sm text-gray-700 line-clamp-2'>
                      {c.snippet ? c.snippet.replace(/\s+/g, ' ').trim() : (c.title ?? 'from this PDF')}
                    </div>
                    <div className='mt-2 flex items-center gap-3'>
                      <button
                        className='text-xs text-blue-600 hover:underline'
                        onClick={() => {
                          setActiveIdx(i);
                          setOpenModal(true);
                        }}
                      >
                        View source
                      </button>
                      {c.page && (
                        <button
                          className='text-xs text-gray-600 hover:underline'
                          onClick={() =>
                            setPendingJump?.(
                              c.rect
                                ? { pageNumber: c.page!, rect: c.rect }
                                : { pageNumber: c.page! }
                            )
                          }
                        >
                          Locate in PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const SourcesModal = ({ cites }: { cites: Citation[] }) => {
    if (!openModal || !cites?.length) return null;
    const c = cites[activeIdx] ?? cites[0];
    const portalRoot = document.getElementById('chat-dock-overlay');

    const modal = (
      <div className='absolute inset-0 z-50 pointer-events-auto'>
        <div className='absolute inset-0 bg-black/20' onClick={() => setOpenModal(false)} />
        {/* Panel anchored to bottom within chat dock, width matches dock with safe padding */}
        <div className='absolute left-3 right-3 bottom-3 bg-white rounded-lg shadow-xl overflow-hidden max-h-[70%]'>
          <div className='px-4 py-3 border-b flex items-center justify-between'>
            <div className='font-semibold'>Sources</div>
            <button className='p-1 rounded hover:bg-gray-100' onClick={() => setOpenModal(false)}>
              <X size={18} />
            </button>
          </div>
          <div className='p-4 overflow-auto'>
                {/* Tabs numbers */}
                <div className='flex items-center gap-2'>
                  {cites.map((_, i) => (
                    <button
                      key={i}
                      className={`w-7 h-7 rounded-full border text-sm ${i === activeIdx ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                      onClick={() => setActiveIdx(i)}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                {/* File name */}
                <div className='mt-3 font-medium text-gray-800'>
                  {c.title ?? 'from this PDF'}
                </div>

                {/* Actions */}
                <div className='mt-2'>
                  {c.page && (
                    <button
                      className='inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm hover:bg-gray-50'
                      onClick={() => {
                        // Jump to page but keep overlay open to allow picking another source
                        setPendingJump?.(
                          c.rect
                            ? { pageNumber: c.page!, rect: c.rect }
                            : { pageNumber: c.page! }
                        );
                      }}
                    >
                      Locate in PDF
                    </button>
                  )}
                </div>

                {/* Snippet */}
                {c.snippet && (
                  <div className='mt-4 text-sm text-gray-700 whitespace-pre-wrap'>{c.snippet}</div>
                )}
          </div>
        </div>
      </div>
    );

    if (portalRoot) {
      return ReactDOM.createPortal(modal, portalRoot);
    }
    return modal;
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-soft whitespace-pre-wrap ${isUser ? 'bg-gray-100 text-black' : 'bg-blue-100'
          }`}
      >
        {!isUser && (!msg.content || msg.content.trim() === '') ? (
          <ChatMessageLoading />
        ) : (
          <>
            {msg.imageDataUrl && (
              <div className='mb-2'>
                <img
                  src={msg.imageDataUrl}
                  alt='selected region'
                  className='rounded-md max-h-64 object-contain'
                />
              </div>
            )}
            {msg.content && (
              <div className='text-sm leading-relaxed'>{msg.content}</div>
            )}
            {msg.citations && <SourcesList cites={msg.citations} />}
            {msg.citations && <SourcesModal cites={msg.citations} />}
          </>
        )}
      </div>
    </div>
  );
}
