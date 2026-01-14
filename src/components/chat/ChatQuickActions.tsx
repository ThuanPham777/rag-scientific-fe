import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X, Lightbulb } from "lucide-react";
import { brainstormQuestions } from "../../services/api";

type Props = {
  onSelect: (text: string) => void;
  fileId?: string;
  disabled?: boolean;
};

const PREDEFINED_QUESTIONS = [
  "Generate summary of this paper",
  "Results of the paper",
  "Conclusions from the paper",
  "Explain Abstract of this paper",
  "What are the contributions of this paper",
  "Explain the practical implications of this paper",
  "Summarise introduction of this paper",
  "Literature survey of this paper",
  "Methods used in this paper",
  "What data has been used in this paper",
  "Limitations of this paper",
  "Future works suggested in this paper",
];

export default function ChatQuickActions({
  onSelect,
  fileId,
  disabled,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [dynamicQuestions, setDynamicQuestions] = useState<string[]>([]);
  const [isBrainstorming, setIsBrainstorming] = useState(false);

  const allQuestions = [...PREDEFINED_QUESTIONS, ...dynamicQuestions];

  const handleBrainstorm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!fileId || isBrainstorming) return;

    try {
      setIsBrainstorming(true);
      const newQuestions = await brainstormQuestions(fileId);
      const uniqueNew = newQuestions.filter((q) => !allQuestions.includes(q));
      setDynamicQuestions((prev) => [...prev, ...uniqueNew]);
    } catch (error) {
      console.error("Brainstorm failed:", error);
    } finally {
      setIsBrainstorming(false);
    }
  };

  return (
    <div className="relative w-full px-3 pt-2">
      {/* 1. EXPANDED PANEL (Overlay lên trên) */}
      {isOpen && (
        <div className="absolute bottom-full left-3 right-3 mb-2 z-50 animate-in slide-in-from-bottom-2 fade-in duration-200 origin-bottom">
          <div className="bg-white/95 backdrop-blur-sm border border-gray-200 shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[320px]">
            {/* Header Panel */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-2 text-orange-700 font-bold text-sm">
                <Sparkles size={16} />
                <span>Suggested Questions</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* List Content */}
            <div className="p-3 overflow-y-auto custom-scrollbar bg-gray-50/50">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleBrainstorm}
                  disabled={isBrainstorming || !fileId}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white border border-orange-200 text-orange-600 shadow-sm hover:bg-orange-50 hover:border-orange-300 transition-all disabled:opacity-50 w-full justify-center mb-1 dashed-border"
                  style={{ borderStyle: "dashed", borderWidth: "2px" }}
                >
                  {isBrainstorming ? (
                    <span className="animate-spin mr-1">⏳</span>
                  ) : (
                    <Lightbulb size={14} />
                  )}
                  {isBrainstorming
                    ? "Generating ideas..."
                    : "Brainstorm more questions"}
                </button>

                {allQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelect(q);
                      setIsOpen(false);
                    }}
                    disabled={disabled}
                    className="px-3 py-2 rounded-xl text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:text-orange-700 hover:shadow-md transition-all text-left active:scale-[0.98]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. TRIGGER BAR (Luôn hiển thị, Static, Full Width) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2 bg-white border border-gray-200 transition-all duration-200 group ${
          isOpen
            ? "rounded-t-lg border-b-0 border-orange-200 bg-orange-50/30 text-orange-800" // Khi mở: nối liền với panel ảo
            : "rounded-lg hover:border-orange-300 hover:shadow-sm text-gray-600" // Khi đóng: bo tròn
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles
            size={14}
            className={
              isOpen
                ? "text-orange-600"
                : "text-orange-500 group-hover:rotate-12 transition-transform"
            }
          />
          <span>Suggested Questions</span>
        </div>

        {isOpen ? (
          <ChevronDown
            size={16}
            className="text-orange-400 rotate-180 transition-transform"
          />
        ) : (
          <ChevronUp size={16} className="text-gray-400" />
        )}
      </button>
    </div>
  );
}
