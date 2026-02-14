// src/components/session/StartSessionButton.tsx
// Button to convert a regular conversation into a collaborative session.

import { UserRoundPlus } from 'lucide-react';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

interface StartSessionButtonProps {
  onClick?: () => void;
}

export default function StartSessionButton({
  onClick,
}: StartSessionButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className='flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700 transition-colors'
        >
          <UserRoundPlus size={16} />
        </button>
      </TooltipTrigger>

      <TooltipContent
        side='bottom'
        sideOffset={6}
      >
        Start collaborative session
      </TooltipContent>
    </Tooltip>
  );
}
