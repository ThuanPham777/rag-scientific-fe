import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronUp, Sparkles, X, Lightbulb } from 'lucide-react';
import {
  useSuggestedQuestions,
  useGenerateSuggestedQuestions,
} from '../../hooks';

type Tab = 'general' | 'my-questions';

type Props = {
  onSelect: (text: string) => void;
  /** Conversation ID – used to generate/fetch suggested questions */
  conversationId?: string;
  disabled?: boolean;
  /** Current text from the chat input – drives search filtering & contextual brainstorm */
  inputText?: string;
};

const PREDEFINED_QUESTIONS = [
  'Generate summary of this paper',
  'Results of the paper',
  'Conclusions from the paper',
  'Explain Abstract of this paper',
  'What are the contributions of this paper',
  'Explain the practical implications of this paper',
  'Summarise introduction of this paper',
  'Literature survey of this paper',
  'Methods used in this paper',
  'What data has been used in this paper',
  'Limitations of this paper',
  'Future works suggested in this paper',
];

export default function ChatQuickActions({
  onSelect,
  conversationId,
  disabled,
  inputText = '',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // ── React Query: load saved questions on mount / after brainstorm ──
  const { data: savedQuestionsResult } = useSuggestedQuestions(conversationId);
  const generateMutation = useGenerateSuggestedQuestions();

  // Merge saved (DB) questions + newly generated ones (from latest mutation)
  const [latestGenerated, setLatestGenerated] = useState<string[]>([]);

  // Track questions newly generated in the LATEST brainstorm call (for dot highlight)
  const [newlyGeneratedSet, setNewlyGeneratedSet] = useState<Set<string>>(
    new Set(),
  );

  // Whether we're showing the "brainstorm results" view (all questions merged)
  const [showBrainstormResults, setShowBrainstormResults] = useState(false);

  // Saved questions from DB (loaded on mount / page reload)
  const savedQuestions = useMemo(
    () => (savedQuestionsResult?.questions || []).map((q) => q.question),
    [savedQuestionsResult],
  );

  // All "My Questions" = savedQuestions ∪ latestGenerated (deduplicated)
  const dynamicQuestions = useMemo(() => {
    const set = new Set([...savedQuestions, ...latestGenerated]);
    return Array.from(set);
  }, [savedQuestions, latestGenerated]);

  // ── Derived values ────────────────────────────────────────
  const searchTerm = inputText.trim().toLowerCase();

  /** Filter questions by search term (every word must match) */
  const filterBySearch = useCallback(
    (questions: string[]) => {
      if (!searchTerm) return questions;
      const words = searchTerm.split(/\s+/).filter(Boolean);
      return questions.filter((q) => {
        const lower = q.toLowerCase();
        return words.every((w) => lower.includes(w));
      });
    },
    [searchTerm],
  );

  const filteredGeneral = useMemo(
    () => filterBySearch(PREDEFINED_QUESTIONS),
    [filterBySearch],
  );

  const filteredDynamic = useMemo(
    () => filterBySearch(dynamicQuestions),
    [filterBySearch, dynamicQuestions],
  );

  // ── Search mode: merge all questions into one list ──────
  const isSearchMode = !!searchTerm;
  const filteredAll = useMemo(
    () => filterBySearch([...PREDEFINED_QUESTIONS, ...dynamicQuestions]),
    [filterBySearch, dynamicQuestions],
  );

  // Show merged view when searching OR after brainstorm results
  const isMergedView = isSearchMode || showBrainstormResults;

  const activeQuestions = isMergedView
    ? filteredAll
    : activeTab === 'general'
      ? filteredGeneral
      : filteredDynamic;

  const totalResults = isMergedView
    ? filteredAll.length
    : filteredGeneral.length + filteredDynamic.length;

  // ── Brainstorm handler (uses mutation) ──────────────────
  const isBrainstorming = generateMutation.isPending;

  const handleBrainstorm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!conversationId || isBrainstorming) return;

    try {
      const textInput = searchTerm || undefined;
      const res = await generateMutation.mutateAsync({
        conversationId,
        textInput,
      });
      // Immediately show newly generated questions in the UI
      const newQuestions = (res.data.questions || []).map(
        (q: { question: string }) => q.question,
      );
      const allExisting = new Set([
        ...PREDEFINED_QUESTIONS,
        ...dynamicQuestions,
      ]);
      const uniqueNew = newQuestions.filter((q: string) => !allExisting.has(q));
      setLatestGenerated((prev) => [...prev, ...uniqueNew]);

      // Mark ALL questions from this brainstorm call for dot highlight
      setNewlyGeneratedSet(new Set(newQuestions));

      // Switch to merged "search result" view showing all questions
      setShowBrainstormResults(true);
      setIsOpen(true);
    } catch (error) {
      console.error('Brainstorm failed:', error);
    }
  };

  // Auto-open panel when user starts typing and there are results
  useEffect(() => {
    if (searchTerm && totalResults > 0 && !isOpen) {
      setIsOpen(true);
    }
  }, [searchTerm]);

  // ── Brainstorm button label ────────────────────────────────
  const brainstormLabel = searchTerm
    ? `Brainstorm Questions on "${inputText.trim().length > 30 ? inputText.trim().slice(0, 30) + '…' : inputText.trim()}"`
    : 'Brainstorm Questions';

  // ── Preview text for collapsed bar ──────────────────────
  const allQuestions = [...PREDEFINED_QUESTIONS, ...dynamicQuestions];
  const previewText = allQuestions.slice(0, 2).join(', ');
  const moreCount = totalResults > 2 ? totalResults - 2 : 0;

  const closePanel = () => {
    setIsOpen(false);
    setShowBrainstormResults(false);
    setNewlyGeneratedSet(new Set());
  };

  return (
    <div className='relative pt-2'>
      {/* ═══ EXPANDED PANEL — overlays trigger bar, full ChatDock width ═══ */}
      {isOpen && (
        <div className='absolute bottom-0 left-0 right-0 z-[60] animate-in slide-in-from-bottom-2 fade-in duration-200'>
          <div className='bg-white overflow-hidden flex flex-col max-h-[400px]'>
            {/* ── Header ── */}
            <div className='flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white shrink-0'>
              <div className='flex items-center gap-2'>
                <Sparkles
                  size={15}
                  className='text-orange-600'
                />
                <span className='text-sm font-bold text-gray-700'>
                  Suggestions
                </span>
                <span className='text-xs text-gray-400 font-medium'>
                  ({totalResults} results)
                </span>
              </div>
              <button
                onClick={closePanel}
                className='flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-gray-100 text-gray-400 text-xs transition-colors'
              >
                esc <X size={14} />
              </button>
            </div>

            {/* ── Tabs (hidden when in merged view) ── */}
            {!isMergedView && (
              <div className='flex border-b border-gray-100 shrink-0'>
                <button
                  onClick={() => {
                    setActiveTab('general');
                    setShowBrainstormResults(false);
                    setNewlyGeneratedSet(new Set());
                  }}
                  className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors relative ${
                    activeTab === 'general'
                      ? 'text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  General ({filteredGeneral.length})
                  {activeTab === 'general' && (
                    <span className='absolute bottom-0 left-2 right-2 h-[2px] bg-orange-500 rounded-full' />
                  )}
                </button>
                <button
                  onClick={() => {
                    setActiveTab('my-questions');
                    setShowBrainstormResults(false);
                    setNewlyGeneratedSet(new Set());
                  }}
                  className={`flex-1 px-4 py-2 text-xs font-semibold transition-colors relative ${
                    activeTab === 'my-questions'
                      ? 'text-gray-800'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  My questions ({filteredDynamic.length})
                  {activeTab === 'my-questions' && (
                    <span className='absolute bottom-0 left-2 right-2 h-[2px] bg-orange-500 rounded-full' />
                  )}
                </button>
              </div>
            )}

            {/* ── Scrollable question list ── */}
            <div className='p-3 overflow-y-auto custom-scrollbar bg-gray-50/30 flex-1 min-h-0'>
              {activeQuestions.length > 0 ? (
                <ul className='space-y-1'>
                  {activeQuestions.map((q, idx) => {
                    const isHighlighted = newlyGeneratedSet.has(q);
                    return (
                      <li key={`${isMergedView ? 'merged' : activeTab}-${idx}`}>
                        <button
                          onClick={() => {
                            onSelect(q);
                            closePanel();
                          }}
                          disabled={disabled}
                          className='w-full text-left px-3 py-2 rounded-lg text-xs text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors disabled:opacity-50 flex items-start gap-2'
                        >
                          <span
                            className={`mt-0.5 text-lg leading-none ${isHighlighted ? 'text-orange-500' : 'text-gray-300'}`}
                          >
                            •
                          </span>
                          <span className='leading-relaxed'>{q}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className='py-6 text-center text-xs text-gray-400'>
                  {isMergedView
                    ? 'No matching questions found.'
                    : activeTab === 'my-questions'
                      ? 'No brainstormed questions yet. Click below to generate!'
                      : 'No questions available.'}
                </div>
              )}
            </div>

            {/* ── Brainstorm button (sticky bottom inside panel) ── */}
            {(activeTab === 'my-questions' || isMergedView) && (
              <div className='px-3 py-2 border-gray-100 bg-white shrink-0'>
                <button
                  onClick={handleBrainstorm}
                  disabled={isBrainstorming || !conversationId}
                  className='w-full flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-bold bg-white border-2 border-dashed border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 justify-center'
                >
                  {isBrainstorming ? (
                    <span className='animate-spin'>⏳</span>
                  ) : (
                    <Lightbulb size={14} />
                  )}
                  {isBrainstorming ? 'Generating ideas...' : brainstormLabel}
                  {isSearchMode && !isBrainstorming && (
                    <span className='text-[10px] text-gray-400 ml-1'>
                      press ctrl + G
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TRIGGER BAR — hidden (invisible) when panel is open ═══ */}
      <div className={`px-3 ${isOpen ? 'invisible' : ''}`}>
        <button
          onClick={() => setIsOpen(true)}
          className='w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-200 rounded-lg hover:border-orange-300 hover:shadow-sm text-gray-600 transition-all duration-200 group'
        >
          <span className='text-sm text-gray-500 truncate mr-2'>
            {previewText}
            {previewText.length > 0 && '...'}
          </span>
          <span className='flex items-center gap-2 shrink-0'>
            {moreCount > 0 && (
              <span className='text-xs text-orange-500 font-medium'>
                +{moreCount} more
              </span>
            )}
            <ChevronUp
              size={16}
              className='text-gray-400'
            />
          </span>
        </button>
      </div>
    </div>
  );
}
