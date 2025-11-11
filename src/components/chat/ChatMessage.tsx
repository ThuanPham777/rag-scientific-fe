import type { ChatMessage as Msg } from '../../utils/types';

// function Citations({ cites }: { cites: NonNullable<Msg['citations']> }) {
//   if (!cites?.length) return null;
//   return (
//     <div className='mt-3 flex flex-wrap gap-2'>
//       {cites.map((c, i) => (
//         <a
//           key={i}
//           href={c.url ?? '#'}
//           target={c.url ? '_blank' : undefined}
//           className='text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-1'
//         >
//           🔖 <span>{c.title ?? `Page ${c.page ?? ''}`}</span>
//         </a>
//       ))}
//     </div>
//   );
// }

export default function ChatMessage({ msg }: { msg: Msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-soft whitespace-pre-wrap ${isUser ? 'bg-gray-100 text-black' : 'bg-blue-100'
          }`}
      >
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
        {/* {!isUser && msg.citations && <Citations cites={msg.citations} />} */}
      </div>
    </div>
  );
}
