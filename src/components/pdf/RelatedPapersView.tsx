import type { RelatedPapersResponse } from "../../utils/types";
import { BookMarked, ExternalLink, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";

type Props = {
  data: RelatedPapersResponse;
};

export default function RelatedPapersView({ data }: Props) {
  return (
    <div className="h-full overflow-y-auto bg-gray-50/50">
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        
        {/* === Header (Match SummaryView) === */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
            <BookMarked size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Related Research</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-medium text-gray-500">Found {data.results.length} papers similar to</span>
              <span className="text-sm font-bold text-gray-800 truncate max-w-[200px] md:max-w-xs" title={data.base_title}>
                "{data.base_title}"
              </span>
            </div>
          </div>
        </div>

        {/* === List === */}
        <div className="grid grid-cols-1 gap-4">
          {data.results.map((paper) => {
            const matchPercent = Math.round(paper.score * 100);
            
            return (
              <div
                key={paper.arxiv_id}
                className="group bg-white border border-gray-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                {/* Card Header */}
                <div className="flex justify-between items-start gap-4 mb-3">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-lg font-bold text-gray-900 hover:text-blue-600 hover:underline leading-snug flex-1"
                  >
                    {paper.title}
                  </a>
                  
                  {/* Match Score Badge */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                        matchPercent >= 85
                          ? "bg-green-50 text-green-700 border-green-200"
                          : matchPercent >= 70
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                      }`}
                    >
                      {matchPercent}% Match
                    </span>
                  </div>
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-1.5">
                    <Users size={14} className="text-gray-400" />
                    <span className="font-medium">{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 ? " et al." : ""}</span>
                  </div>
                  {paper.categories && (
                     <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600 border border-gray-200">
                          {paper.categories[0]}
                        </span>
                     </div>
                  )}
                </div>

                {/* Relevance Box */}
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-4">
                   <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">Why it's relevant</p>
                   <p className="text-sm text-gray-700 leading-relaxed">{paper.reason}</p>
                </div>

                {/* Abstract Collapsible */}
                <details className="group/details">
                  <summary className="flex items-center gap-2 text-sm font-semibold text-gray-500 cursor-pointer hover:text-blue-600 transition-colors w-fit select-none">
                     <span className="group-open/details:hidden flex items-center gap-1">
                        Read Abstract <ChevronDown size={14} />
                     </span>
                     <span className="hidden group-open/details:flex items-center gap-1">
                        Hide Abstract <ChevronUp size={14} />
                     </span>
                  </summary>
                  <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-600 leading-relaxed text-justify animate-in fade-in slide-in-from-top-1 duration-200">
                    {paper.abstract}
                  </div>
                </details>
                
                {/* External Link Action */}
                <div className="mt-4 flex justify-end">
                    <a 
                      href={paper.url}
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-wide"
                    >
                        View on Arxiv <ExternalLink size={12} />
                    </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}