import React, { useState, useMemo } from "react";
import ReactDOM from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  X,
  BookOpen,
  ChevronDown,
  ChevronUp,
  MapPin,
  FileText,
  ExternalLink,
} from "lucide-react";
import type { ChatMessage as Msg, Citation } from "../../utils/types";
import ChatMessageLoading from "./ChatMessageLoading";
import { usePaperStore } from "../../store/usePaperStore";

export default function ChatMessage({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const setPendingJump = usePaperStore((s) => s.setPendingJump);
  const [openList, setOpenList] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  // --- Logic xử lý Jump khi bấm vào Citation ---
  const handleJumpToCitation = (citationId: string) => {
    if (!msg.citations) return;

    // 1. Tìm citation theo sourceId (ví dụ "S1")
    let citation = msg.citations.find((c) => c.sourceId === citationId);

    // Fallback: Tìm theo index
    if (!citation) {
      const numericId = parseInt(citationId.replace(/\D/g, ""), 10);
      if (
        !isNaN(numericId) &&
        numericId > 0 &&
        numericId <= msg.citations.length
      ) {
        citation = msg.citations[numericId - 1];
      }
    }

    // 2. Thực hiện Jump
    if (citation && citation.page) {
      setPendingJump({
        pageNumber: citation.page,
        rect: citation.rect,
      });
    }
  };

  // --- Helper Render Text kèm Citation Link ---
  const renderTextWithCitations = (text: string) => {
    const regex = /\[((?:S|cite:\s*)?\d+)\]/g;
    const nodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.slice(lastIndex, match.index));
      }

      const fullMatch = match[0]; // VD: "[1]"
      const id = match[1].replace("cite:", "").trim(); // VD: "1"

      // Render dạng Text Link (Subtle style)
      nodes.push(
        <button
          key={`${id}-${match.index}`}
          type="button"
          // Style mới: Giống link, không box, màu cam nhẹ, hover underline
          className="inline text-orange-600 font-medium hover:underline hover:text-orange-800 cursor-pointer text-xs align-baseline ml-0.5 px-0.5 rounded hover:bg-orange-50 transition-colors select-none"
          onClick={(e) => {
            e.stopPropagation();
            handleJumpToCitation(id);
          }}
          title={`Jump to source ${id}`}
        >
          {fullMatch}
        </button>
      );

      lastIndex = match.index + fullMatch.length;
    }

    if (lastIndex < text.length) {
      nodes.push(text.slice(lastIndex));
    }

    return nodes;
  };

  // --- Style cho Markdown ---
  const markdownComponents = useMemo(
    () => ({
      p: ({ node, children, ...props }: any) => (
        <p
          className="mb-3 last:mb-0 leading-7 text-gray-800 break-words min-w-0"
          {...props}
        >
          {React.Children.map(children, (child) => {
            if (typeof child === "string") {
              return renderTextWithCitations(child);
            }
            return child;
          })}
        </p>
      ),
      li: ({ node, children, ...props }: any) => (
        <li className="pl-1 break-words" {...props}>
          {React.Children.map(children, (child) => {
            if (typeof child === "string") {
              return renderTextWithCitations(child);
            }
            return child;
          })}
        </li>
      ),
      a: ({ node, ...props }: any) => (
        <a
          className="text-blue-600 hover:underline break-all"
          target="_blank"
          rel="noreferrer"
          {...props}
        />
      ),
      ul: ({ node, ...props }: any) => (
        <ul
          className="list-disc list-outside ml-5 mb-3 space-y-1 text-gray-800"
          {...props}
        />
      ),
      ol: ({ node, ...props }: any) => (
        <ol
          className="list-decimal list-outside ml-5 mb-3 space-y-1 text-gray-800"
          {...props}
        />
      ),
      table: ({ node, ...props }: any) => (
        <div className="overflow-x-auto my-4 border border-gray-200 rounded-lg bg-white max-w-full">
          <table
            className="min-w-full divide-y divide-gray-200 text-sm"
            {...props}
          />
        </div>
      ),
      thead: ({ node, ...props }: any) => (
        <thead className="bg-gray-50 text-gray-700" {...props} />
      ),
      th: ({ node, ...props }: any) => (
        <th
          className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
          {...props}
        />
      ),
      td: ({ node, ...props }: any) => (
        <td className="px-3 py-2 text-gray-600 align-top" {...props} />
      ),
      code: ({ node, inline, className, children, ...props }: any) => {
        return inline ? (
          <code
            className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-red-500 break-all whitespace-pre-wrap"
            {...props}
          >
            {children}
          </code>
        ) : (
          <pre
            className="bg-gray-900 text-gray-100 p-3 rounded-lg overflow-x-auto text-sm my-3 font-mono max-w-full"
            {...props}
          >
            <code>{children}</code>
          </pre>
        );
      },
    }),
    [msg.citations]
  );

  // --- Component: Sources List Toggle ---
  const SourcesSection = ({ cites }: { cites: Citation[] }) => {
    if (!cites?.length) return null;

    return (
      <div className="mt-3 pt-3 border-t border-gray-100/50 w-full min-w-0 max-w-full">
        <button
          className={`group flex items-center gap-2 text-xs font-medium transition-all px-3 py-1.5 rounded-full border ${
            openList
              ? "bg-orange-50 text-orange-700 border-orange-200"
              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
          }`}
          onClick={() => setOpenList((v) => !v)}
        >
          <BookOpen
            size={14}
            className={
              openList
                ? "text-orange-600"
                : "text-gray-400 group-hover:text-gray-600"
            }
          />
          <span>{cites.length} Sources</span>
          {openList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>

        {openList && (
          <div className="mt-3 flex flex-col gap-2 w-full min-w-0">
            {cites.map((c: Citation, i: number) => (
              <div
                key={i}
                className="group relative flex flex-col bg-white border border-gray-200 rounded-lg p-2.5 hover:border-orange-300 hover:shadow-sm transition-all w-full min-w-0"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold mt-0.5 group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div
                      className="text-xs font-semibold text-gray-800 truncate mb-0.5 pr-2"
                      title={c.title}
                    >
                      {c.title || "Unknown Source"}
                    </div>

                    <div className="text-[11px] text-gray-500 line-clamp-1 mb-2 break-all">
                      {c.snippet
                        ? c.snippet.replace(/\s+/g, " ").trim()
                        : "No preview"}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        className="flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        onClick={() => {
                          setActiveIdx(i);
                          setOpenModal(true);
                        }}
                      >
                        <ExternalLink size={10} />
                        Details
                      </button>

                      {c.page && (
                        <button
                          className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-800 transition-colors hover:bg-gray-100 px-1.5 py-0.5 rounded"
                          onClick={() =>
                            setPendingJump?.(
                              c.rect
                                ? { pageNumber: c.page!, rect: c.rect }
                                : { pageNumber: c.page! }
                            )
                          }
                        >
                          <MapPin size={10} />
                          Page {c.page}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // --- Component: Modal ---
  const SourcesModal = ({ cites }: { cites: Citation[] }) => {
    if (!openModal || !cites?.length) return null;
    const c = cites[activeIdx] ?? cites[0];
    const portalRoot = document.getElementById("chat-dock-overlay");

    const modal = (
      <div className="absolute inset-0 z-50 flex flex-col justify-end pointer-events-auto">
        <div
          className="absolute inset-0 bg-black/20 backdrop-blur-[1px] transition-opacity"
          onClick={() => setOpenModal(false)}
        />
        <div className="relative bg-white rounded-t-xl shadow-2xl border-t border-gray-200 h-[70%] max-h-[500px] flex flex-col animate-in slide-in-from-bottom-5 duration-200 w-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-t-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
              <FileText size={16} className="text-orange-500" />
              Citation Details
            </div>
            <button
              className="p-1.5 rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
              onClick={() => setOpenModal(false)}
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 overflow-y-auto min-h-0 flex-1 bg-white">
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide w-full">
              {cites.map((_, i) => (
                <button
                  key={i}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg border text-xs font-medium transition-all ${
                    i === activeIdx
                      ? "bg-orange-500 text-white border-orange-500 shadow-md transform scale-105"
                      : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setActiveIdx(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Source Title
                </h4>
                <p className="text-sm font-semibold text-gray-900 leading-snug break-words">
                  {c.title ?? "Unknown Section"}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Excerpt
                </h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed border border-gray-100 whitespace-pre-wrap font-serif break-words">
                  "{c.snippet || "No text content available."}"
                </div>
              </div>

              {c.page && (
                <div className="sticky bottom-0 pt-4 bg-white border-t border-gray-50 mt-4">
                  <button
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 text-sm font-semibold rounded-lg hover:bg-orange-100 transition-colors border border-orange-200"
                    onClick={() => {
                      setPendingJump?.(
                        c.rect
                          ? { pageNumber: c.page!, rect: c.rect }
                          : { pageNumber: c.page! }
                      );
                    }}
                  >
                    <MapPin size={16} />
                    Jump to Page {c.page}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );

    if (portalRoot) {
      return ReactDOM.createPortal(modal, portalRoot);
    }
    return modal;
  };

  return (
    <div
      className={`flex w-full mb-6 ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`relative max-w-[90%] md:max-w-[85%] rounded-2xl px-5 py-4 shadow-sm border transition-all ${
          isUser
            ? "bg-blue-600 text-white border-blue-600 rounded-br-none"
            : "bg-white text-gray-800 border-gray-200 rounded-bl-none shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
        }`}
      >
        {!isUser && (!msg.content || msg.content.trim() === "") ? (
          <ChatMessageLoading />
        ) : (
          <div className="min-w-0 w-full overflow-hidden">
            {msg.imageDataUrl && (
              <div className="mb-4">
                <img
                  src={msg.imageDataUrl}
                  alt="selected region"
                  className="rounded-lg border border-gray-200/50 shadow-sm max-h-60 object-contain bg-gray-50 mx-auto sm:mx-0"
                />
              </div>
            )}

            {isUser ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                {msg.content}
              </div>
            ) : (
              <div className="text-sm leading-relaxed markdown-content w-full min-w-0">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>
            )}

            {msg.citations && <SourcesSection cites={msg.citations} />}
            {msg.citations && <SourcesModal cites={msg.citations} />}
          </div>
        )}
      </div>
    </div>
  );
}
