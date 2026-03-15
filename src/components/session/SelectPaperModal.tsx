import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, Plus, UploadCloud, Library } from 'lucide-react';
import { usePapers } from '../../hooks/queries/usePaperQueries';
import FileDropzone from '../uploader/FileDropzone';
import { uploadPdf } from '../../services';
import { useQueryClient } from '@tanstack/react-query';
import { paperKeys } from '../../hooks/queries';

interface SelectPaperModalProps {
    isOpen: boolean;
    onClose: () => void;
    // For library selection
    onSelect: (paperId: string) => void;
    // For direct upload (returns the newly uploaded paper ID)
    onUploadSuccess?: (paperId: string) => void;
    // For optimistic direct upload (returns the file immediately)
    onUploadFile?: (file: File) => void;
    excludePaperIds?: string[];
}

export function SelectPaperModal({
    isOpen,
    onClose,
    onSelect,
    onUploadSuccess,
    onUploadFile,
    excludePaperIds = [],
}: SelectPaperModalProps) {
    const { data: papers, isLoading } = usePapers();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
    const queryClient = useQueryClient();

    const displayPapers = papers
        .filter((p) => p.status === 'COMPLETED')
        .filter((p) => !excludePaperIds.includes(p.id))
        .filter((p) =>
            p.fileName.toLowerCase().includes(search.toLowerCase()),
        );

    const handleUpload = async (files: File[], setProgress: (v: number) => void) => {
        try {
            const file = files[0];
            if (onUploadFile) {
                onUploadFile(file);
                onClose();
                return;
            }
            const { paper } = await uploadPdf(file, setProgress);
            queryClient.invalidateQueries({ queryKey: paperKeys.all });
            if (onUploadSuccess) {
                onUploadSuccess(paper.id);
            } else {
                onSelect(paper.id);
            }
            onClose();
        } catch (error) {
            console.error('Upload failed:', error);
            throw error;
        }
    };

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose],
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            setSearch('');
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    const modalContent = (
        <div
            className='fixed inset-0 z-[9999] flex items-center justify-center'
            role='dialog'
            aria-modal='true'
        >
            {/* Backdrop */}
            <div
                className='absolute inset-0 bg-black/30 backdrop-blur-sm'
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className='relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200'
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 shrink-0">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">
                        Add Paper to Session
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-1 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 pt-2 shrink-0">
                    <button
                        onClick={() => setActiveTab('library')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'library' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <Library className="w-4 h-4" />
                        From Library
                    </button>
                    <button
                        onClick={() => setActiveTab('upload')}
                        className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'upload' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                    >
                        <UploadCloud className="w-4 h-4" />
                        Upload New PDF
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    {activeTab === 'library' ? (
                        <>
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search your library..."
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                />
                            </div>

                            <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-md divide-y divide-gray-100">
                                {isLoading ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                                ) : displayPapers.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">
                                        No matching papers found.
                                    </div>
                                ) : (
                                    displayPapers.map((p) => (
                                        <div
                                            key={p.id}
                                            className="p-3 hover:bg-gray-50 flex items-center justify-between group cursor-pointer transition-colors"
                                            onClick={() => {
                                                onSelect(p.id);
                                                onClose();
                                            }}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileText className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                                                <div className="truncate">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        {p.fileName}
                                                    </p>
                                                </div>
                                            </div>
                                            <button className="text-gray-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition-all p-1">
                                                <Plus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-4">
                            <div className="w-full">
                                <FileDropzone onUpload={handleUpload} multiple={false} />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
}
