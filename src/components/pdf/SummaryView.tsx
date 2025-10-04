import type { SummaryResponse } from '../../services/summaryApi';

type Props = {
    summaryData: SummaryResponse;
    onRegenerate: () => void;
    isGenerating: boolean;
};

export default function SummaryView({ summaryData, onRegenerate, isGenerating }: Props) {
    return (
        <div className='h-full overflow-auto p-4'>
            <div className='prose prose-sm max-w-none'>
                <div className='flex justify-between items-center mb-4'>
                    <h2 className='text-lg font-semibold'>Tóm tắt bài báo</h2>
                    <button
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className='px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50'
                    >
                        🔄 Tạo lại
                    </button>
                </div>

                {/* Full summary text */}
                <div className='whitespace-pre-wrap text-sm leading-relaxed mb-6'>
                    {summaryData.summary}
                </div>

                {/* Structured sections */}
                <div className='border-t pt-6'>
                    <h3 className='text-md font-semibold mb-4'>📊 Phân tích chi tiết</h3>

                    <div className='grid gap-4'>
                        {/* Objectives */}
                        <div className='bg-blue-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-blue-800 mb-2'>🎯 Mục tiêu</h4>
                            <ul className='text-sm text-blue-700 space-y-1'>
                                {summaryData.sections.objectives.map((obj, i) => (
                                    <li key={i}>• {obj}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Methodology */}
                        <div className='bg-green-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-green-800 mb-2'>🔬 Phương pháp</h4>
                            <p className='text-sm text-green-700'>{summaryData.sections.methodology}</p>
                        </div>

                        {/* Results */}
                        <div className='bg-purple-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-purple-800 mb-2'>📊 Kết quả</h4>
                            <ul className='text-sm text-purple-700 space-y-1'>
                                {summaryData.sections.results.map((result, i) => (
                                    <li key={i}>• {result}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Contributions */}
                        <div className='bg-orange-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-orange-800 mb-2'>💡 Đóng góp</h4>
                            <ul className='text-sm text-orange-700 space-y-1'>
                                {summaryData.sections.contributions.map((contrib, i) => (
                                    <li key={i}>• {contrib}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Limitations */}
                        <div className='bg-red-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-red-800 mb-2'>⚠️ Hạn chế</h4>
                            <ul className='text-sm text-red-700 space-y-1'>
                                {summaryData.sections.limitations.map((limit, i) => (
                                    <li key={i}>• {limit}</li>
                                ))}
                            </ul>
                        </div>

                        {/* Future Work */}
                        <div className='bg-indigo-50 p-4 rounded-lg'>
                            <h4 className='font-semibold text-indigo-800 mb-2'>🔮 Hướng phát triển</h4>
                            <ul className='text-sm text-indigo-700 space-y-1'>
                                {summaryData.sections.futureWork.map((work, i) => (
                                    <li key={i}>• {work}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
