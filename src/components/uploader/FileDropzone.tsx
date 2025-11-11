import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import ProgressBar from '../common/ProgressBar';
import { validateFile } from '../../utils/file';
import Loading from '../ui/loading/loading';

interface Props {
  onUpload: (file: File, setProgress: (v: number) => void) => Promise<void>;
}

export default function FileDropzone({ onUpload }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    const { valid, errors } = validateFile(file);
    setErrors(errors);
    if (!valid) return;

    try {
      setIsLoading(true);
      await onUpload(file, setProgress);
    } catch (err) {
      console.error("❌ Upload error:", err);
      setErrors(["Failed to upload file. Please try again."]);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  return (
    <div className="relative rounded-xl border border-gray-200 bg-white p-4 sm:p-6">
      {/* Overlay loading */}
      {isLoading && <Loading text="Processing your PDF..." overlay className='text-orange-500' />} {/* 👈 */}

      {/* Inner dashed panel */}
      <div
        className={`rounded-lg border-2 border-dashed p-10 sm:p-12 text-center transition ${dragOver ? 'border-orange-400 bg-orange-50/40' : 'border-gray-200'
          } ${isLoading ? 'pointer-events-none opacity-50' : ''}`}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        {/* PDF badge */}
        <div className="mx-auto mb-5 flex h-16 w-14 items-center justify-center rounded-md bg-white shadow">
          <span className="text-xs font-semibold tracking-wide text-gray-600">
            PDF
          </span>
        </div>

        {/* Title */}
        <p className="text-lg font-medium text-gray-700">
          Drag and drop or click here to browse
        </p>
        <p className="mt-2 text-sm text-gray-500">Max. 100 MB per file</p>

        {/* Upload button */}
        <button
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-orange-500 px-4 py-2 text-white shadow-sm hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
          onClick={(e) => {
            e.stopPropagation();
            inputRef.current?.click();
          }}
          disabled={isLoading}
        >
          <Upload size={16} />
          Upload PDFs
        </button>

        {/* Hidden input */}
        <input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="application/pdf"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {/* Progress */}
        {progress > 0 && progress < 100 && (
          <div className="mx-auto mt-6 w-full max-w-md space-y-2">
            <ProgressBar value={progress} />
            <p className="text-sm text-gray-500">Uploading… {progress}%</p>
          </div>
        )}

        {/* Errors */}
        {!!errors.length && (
          <ul className="mx-auto mt-4 w-full max-w-md space-y-1 text-center text-sm text-red-600">
            {errors.map((er, i) => (
              <li key={i}>{er}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
