import { useState, useEffect } from 'react';
import PdfViewer from './PdfViewer';
import SummaryView from './SummaryView';
import type { Paper } from '../../utils/types';
import {
  generatePaperSummary,
  loadSummaryFromStorage,
  saveSummaryToStorage,
  type SummaryResponse,
} from '../../services/summaryApi';

type Props = {
  activePaper?: Paper;
};

export default function PdfPanel({ activePaper }: Props) {
  const [activeTab, setActiveTab] = useState<'pdf' | 'summary'>('pdf');
  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Load summary from storage when paper changes
  useEffect(() => {
    if (activePaper?.id) {
      const stored = loadSummaryFromStorage(activePaper.id);
      setSummaryData(stored);
    } else {
      setSummaryData(null);
    }
  }, [activePaper?.id]);

  // Generate summary function
  const generateSummary = async () => {
    if (!activePaper) return;

    setIsGeneratingSummary(true);
    try {
      const result = await generatePaperSummary({
        paperId: activePaper.id,
        paperName: activePaper.name,
        fileUrl: activePaper.localUrl,
      });

      setSummaryData(result);
      saveSummaryToStorage(activePaper.id, result);
    } catch (error) {
      console.error('Error generating summary:', error);
      // Handle error - show error message to user
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <section className='bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col'>
      {/* Tabs row */}
      <div className='px-4 pt-3 border-b border-gray-200 bg-white flex-shrink-0'>
        <div className='flex gap-6'>
          <button
            className={`pb-3 font-medium transition-colors ${
              activeTab === 'pdf'
                ? 'border-b-2 border-orange-500 text-orange-500'
                : 'text-gray-500 hover:text-orange-500'
            }`}
            onClick={() => setActiveTab('pdf')}
          >
            PDF file
          </button>
          <button
            className={`pb-3 font-medium transition-colors ${
              activeTab === 'summary'
                ? 'border-b-2 border-orange-500 text-orange-500'
                : 'text-gray-500 hover:text-orange-500'
            }`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className='flex-1 flex flex-col min-h-0'>
        {activeTab === 'pdf' ? (
          <div className='flex-1 min-h-0'>
            <PdfViewer
              fileUrl={activePaper?.localUrl}
              onAction={(action, payload) => {
                console.log('PdfPanel: onAction called with:', action, payload);
                if (action === 'explain' && payload.imageDataUrl) {
                  // Gửi ảnh sang backend / hiển thị trong chat:
                  // sendQuery(session.id, "Explain this image", session.activePaperId, payload.imageDataUrl)
                  console.log(
                    'Captured PNG:',
                    payload.imageDataUrl.slice(0, 64),
                    '...'
                  );
                } else {
                  console.log(
                    'PdfPanel: Not explain action or no imageDataUrl'
                  );
                }
              }}
            />
          </div>
        ) : (
          <div className='flex-1 overflow-auto p-4'>
            {!activePaper ? (
              <div className='flex items-center justify-center h-full text-gray-500'>
                <div className='text-center'>
                  <div className='text-4xl mb-4'>📄</div>
                  <p>Chọn một PDF để xem tóm tắt</p>
                </div>
              </div>
            ) : !summaryData ? (
              <div className='flex items-center justify-center h-full'>
                <div className='text-center max-w-md'>
                  <div className='text-4xl mb-4'>🤖</div>
                  <h3 className='text-lg font-semibold mb-2'>
                    Tạo tóm tắt bài báo
                  </h3>
                  <p className='text-gray-600 mb-6'>
                    AI sẽ phân tích và tóm tắt nội dung bài báo "
                    {activePaper.name}" cho bạn
                  </p>
                  <button
                    onClick={generateSummary}
                    disabled={isGeneratingSummary}
                    className='px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                  >
                    {isGeneratingSummary ? (
                      <>
                        <span className='inline-block animate-spin mr-2'>
                          ⏳
                        </span>
                        Đang phân tích...
                      </>
                    ) : (
                      <>
                        <span className='mr-2'>✨</span>
                        Tạo tóm tắt
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <SummaryView
                summaryData={summaryData}
                onRegenerate={generateSummary}
                isGenerating={isGeneratingSummary}
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
