import { Loader2 } from 'lucide-react';

export default function ChatMessageLoading() {
    return (
        <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-100 shadow-soft">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    <span className="text-sm text-gray-600 italic flex items-center gap-1">
                        Đang suy nghĩ
                        <span className="flex gap-0.5">
                            <span className="animate-bounce [animation-delay:0ms]">.</span>
                            <span className="animate-bounce [animation-delay:150ms]">.</span>
                            <span className="animate-bounce [animation-delay:300ms]">.</span>
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}

