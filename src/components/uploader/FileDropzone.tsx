import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import { validateFiles } from '../../utils/file';

interface Props {
  onUpload: (files: File[], setProgress: (v: number) => void) => Promise<void>;
}

export default function FileDropzone({ onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (list: FileList | null) => {
    if (!list) return;
    const files = Array.from(list);
    const { valid, errors } = validateFiles(files);
    setErrors(errors);
    if (valid.length) await onUpload(valid, setProgress);
  };

  return (
    <div className='rounded-xl border border-gray-200 bg-white p-4 sm:p-6'>
      {/* Inner dashed panel */}
      <div
        className={`rounded-lg border-2 border-dashed p-10 sm:p-12 text-center transition
        ${dragOver ? 'border-brand-400 bg-brand-50/40' : 'border-gray-200'}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        {/* PDF badge */}
        <div className='mx-auto mb-5 flex h-16 w-14 items-center justify-center rounded-md bg-white shadow'>
          <span className='text-xs font-semibold tracking-wide text-gray-600'>
            PDF
          </span>
        </div>

        {/* Title + subtitle */}
        <p className='text-lg font-medium text-gray-700'>
          Drag and drop or click here to browse
        </p>
        <p className='mt-2 text-sm text-gray-500'>Max. 100 MB per file</p>

        {/* Upload button */}
        <button
          className='mt-5 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300'
          onClick={(e) => {
            // Prevent the outer panel click handler from running twice
            e.stopPropagation();
            inputRef.current?.click();
          }}
        >
          <Upload size={16} />
          Upload PDFs
        </button>

        {/* Hidden input */}
        <input
          ref={inputRef}
          className='hidden'
          type='file'
          accept='application/pdf'
          multiple
          onChange={(e) => handleFiles(e.target.files)}
        />

        {/* Try sample link */}
        <div className='mt-4 text-sm'>
          Or{' '}
          <button
            type='button'
            className='text-brand-600 hover:underline'
            onClick={(e) => {
              // Prevent outer click handler
              e.stopPropagation();
              // TODO: trigger load of a sample PDF if you have one
              console.log('Try a sample pdf');
            }}
          >
            Try a sample pdf
          </button>
        </div>

        {/* Progress */}
        {progress > 0 && progress < 100 && (
          <div className='mx-auto mt-6 w-full max-w-md space-y-2'>
            <ProgressBar value={progress} />
            <p className='text-sm text-gray-500'>Uploading… {progress}%</p>
          </div>
        )}

        {/* Errors */}
        {!!errors.length && (
          <ul className='mx-auto mt-4 w-full max-w-md space-y-1 text-left text-sm text-red-600'>
            {errors.map((er, i) => (
              <li key={i}>• {er}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
