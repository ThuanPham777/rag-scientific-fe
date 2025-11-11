import { Check, Eraser } from 'lucide-react';

type ColorPopupProps = {
  onSelectColor: (color: string) => void;
  onRemoveHighlight?: () => void;
  selectedColor?: string;
};

const HIGHLIGHT_COLORS = [
  '#ffd700', // yellow
  '#ff9999', // pink
  '#dda0dd', // purple
  '#90ee90', // light green
];

export default function ColorPopup({
  onSelectColor,
  onRemoveHighlight,
  selectedColor,
}: ColorPopupProps) {
  return (
    <div className='absolute z-30 bg-white rounded-md shadow-lg border border-gray-200 p-2 -mt-1 flex gap-2'>
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          className='w-6 h-6 rounded-full hover:ring-2 ring-gray-400 relative'
          style={{ backgroundColor: color }}
          onClick={() => onSelectColor(color)}
        >
          {selectedColor === color && (
            <span className='absolute inset-0 flex items-center justify-center'>
              <Check
                size={14}
                className='text-black'
              />
            </span>
          )}
        </button>
      ))}
      <button
        className='w-6 h-6 rounded-full border border-gray-300 hover:bg-gray-100 flex items-center justify-center'
        onClick={onRemoveHighlight}
      >
        <Eraser
          size={14}
          className='text-gray-600'
        />
      </button>
    </div>
  );
}
