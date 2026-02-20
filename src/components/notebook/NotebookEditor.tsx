import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Heading from '@tiptap/extension-heading';
import LinkExtension from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Grid3x3,
  ChevronDown,
  Plus,
  Columns3,
  Trash2,
  Undo,
  Redo,
  Link,
  Code,
  List,
  ListOrdered,
  CheckSquare,
} from 'lucide-react';
import notebookService from '@/services/notebookService';
import { listPapers, searchPapers } from '@/services/api/paper.api';
import { sendQuery } from '@/services/api/chat.api';
import { sanitizeLatex } from '@/utils/latexSanitizer';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/contrib/auto-render';
import { Node as TiptapNode, mergeAttributes } from '@tiptap/core';

type Props = {
  notebook: { id: string; title: string; content: string } | null;
  onUpdated?: (nb: any) => void;
};

export default function NotebookEditor({ notebook, onUpdated }: Props) {
  const [showFileMenu, setShowFileMenu] = useState(false);
  // open dialog state is only written; actual dialog UI handled elsewhere
  const [, setShowOpenDialog] = useState(false);
  const [allNotebooks, setAllNotebooks] = useState<any[]>([]);
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [showSelectionToolbar, setShowSelectionToolbar] = useState(false);
  const [selectionPos, setSelectionPos] = useState({ left: 0, top: 0 });
  const [title, setTitle] = useState(notebook?.title || '');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showCiteDialog, setShowCiteDialog] = useState(false);
  const [citeQuery, setCiteQuery] = useState('');
  const [citeResults, setCiteResults] = useState<any[]>([]);
  const [citeSearchResults, setCiteSearchResults] = useState<any | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showAskAIDialog, setShowAskAIDialog] = useState(false);
  const [askAIQuery, setAskAIQuery] = useState('');
  const [askAILoading, setAskAILoading] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const saveTimer = useRef<number | null>(null);
  const editorRef = useRef<any>(null); // must be declared before useEditor to be available in handlePaste

  // extension to allow arbitrary <span> markup (e.g. KaTeX output)
  const SpanNode = TiptapNode.create({
    name: 'span',
    inline: true,
    group: 'inline',
    atom: false,
    // allow nested inline content (KaTeX spans, styled text, etc.)
    content: 'inline*',
    addAttributes() {
      return {
        class: { default: null },
        style: { default: null },
      };
    },
    parseHTML() {
      return [{ tag: 'span' }];
    },
    renderHTML({ HTMLAttributes }) {
      return ['span', mergeAttributes(HTMLAttributes), 0];
    },
  });

  // Atomic node for KaTeX-rendered math. Being `atom: true` prevents TipTap
  // from parsing/editing the nested KaTeX span tree, which would flatten the
  // DOM and break superscript/subscript positioning.
  const MathInline = TiptapNode.create({
    name: 'mathInline',
    inline: true,
    group: 'inline',
    atom: true,
    selectable: true,
    draggable: false,
    addAttributes() {
      return {
        latex: {
          default: '',
          parseHTML: (element: HTMLElement) => {
            const annotation = element.querySelector('annotation');
            if (annotation?.textContent) return annotation.textContent;
            return element.getAttribute('data-latex') || element.textContent || '';
          },
          renderHTML: (attributes: Record<string, any>) => ({
            'data-latex': attributes.latex,
          }),
        },
        display: {
          default: false,
          parseHTML: (element: HTMLElement) => element.getAttribute('data-display') === 'true',
          renderHTML: (attributes: Record<string, any>) => (
            attributes.display ? { 'data-display': 'true' } : {}
          ),
        },
      };
    },
    parseHTML() {
      return [{ tag: 'span.katex', priority: 60 }];
    },
    renderHTML({ node }: { node: any }) {
      const attrs: Record<string, any> = { class: 'katex', 'data-latex': node.attrs.latex };
      if (node.attrs.display) attrs['data-display'] = 'true';
      return ['span', attrs];
    },
    addNodeView() {
      return ({ node }: { node: any }) => {
        const dom = document.createElement('span');
        const latex = (node.attrs.latex || '').replace(/[\u200B\u200C\u200D\uFEFF]/g, '');
        const isDisplay = !!node.attrs.display;
        if (!latex) {
          return { dom };
        }
        try {
          dom.innerHTML = katex.renderToString(latex, {
            throwOnError: false,
            displayMode: isDisplay,
            output: 'htmlAndMathml' as const,
          });
          if (isDisplay) {
            dom.style.display = 'block';
            dom.style.textAlign = 'center';
            dom.style.margin = '0.5em 0';
          }
        } catch {
          dom.textContent = latex;
        }
        return { dom };
      };
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        link: false,
        underline: false,
      }),
      Heading.configure({ levels: [1, 2, 3, 4] }),
      LinkExtension,
      Underline,
      SpanNode,
      MathInline,
      TaskList,
      TaskItem,
      TextStyle,
      FontFamily.configure({
        types: ['textStyle'],
      }),
      Color.configure({ types: ['textStyle'] }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Untitled note...' }),
    ],
    content: notebook?.content || '',
    editorProps: {
      handlePaste(view, event) {
        const clipboard = event.clipboardData;
        if (!clipboard) return false;
        // only paste plain text, never HTML (prevent pasting nasty KaTeX markup)
        let text = clipboard.getData('text/plain') || '';
        if (!text) return false;
        
        console.log('paste raw (first 150 chars):', text.substring(0, 150));
        
        // clean any HTML/KaTeX markup from pasted text
        const cleaned = cleanPastedText(text);
        console.log('cleaned paste (first 150 chars):', cleaned.substring(0, 150));
        
        view.dom.focus();
        const ed = editorRef.current;
        if (ed) {
          ed.chain().focus().insertContent(cleaned).run();
          event.preventDefault();
          return true;
        }
        return false;
      },
    },
  });

  // Sync editor instance to ref when it's available
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // When notebook prop changes, update editor content and title
  useEffect(() => {
    setTitle(notebook?.title || '');
    if (!editor) return;
    const newContent = notebook?.content || '';
    if (newContent !== editor.getHTML()) {
      editor.commands.setContent(newContent);
    }
  }, [notebook, editor]);

  // Debounced search-as-you-type for citation dialog
  useEffect(() => {
    if (!showCiteDialog) {
      // if dialog closed, reset results but don't query
      setCiteSearchResults(null);
      return;
    }
    if (citeQuery.trim() === '') {
      setCiteSearchResults(null);
      return;
    }

    const handle = setTimeout(async () => {
      setIsSearching(true);
      try {
        const resp = await searchPapers(citeQuery);
        setCiteSearchResults(resp);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(handle);
  }, [citeQuery, showCiteDialog]);

  // Debounced autosave for content and title
  const scheduleSave = async () => {
    if (!notebook) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        let html = '';
        try {
          html = editor?.getHTML() || '';
        } catch (serializationError) {
          // sometimes ProseMirror throws when the document contains a node
          // that violates its schema (e.g. a leaf node with children). try a
          // JSON round‑trip as a fallback to patch the bad state.
          console.warn('Primary serialization failed, attempting JSON fallback', serializationError);
          if (editor) {
            try {
              const doc = editor.getJSON();
              editor.commands.setContent(doc);
              html = editor.getHTML();
            } catch (fallbackError) {
              console.error('Fallback serialization also failed', fallbackError);
              // give up on this autosave cycle
              return;
            }
          }
        }
        // Only run LaTeX sanitizer on content that hasn't already been rendered
        // to KaTeX/MathML. This avoids stripping KaTeX HTML or generic tags,
        // which would make formulas show up as raw text.
        if (!html.includes('class="katex"') && !html.includes('<math')) {
          html = sanitizeLatex(html);
        }
        const payload: any = { title, content: html };
        const updated = await notebookService.update(notebook.id, payload);
        onUpdated?.(updated);
      } catch (err) {
        console.error('Autosave failed', err);
      }
    }, 1500);
  };

  // Listen to editor updates
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      scheduleSave();
      // After each update, re-render LaTeX inside the editor using KaTeX auto-render.
      // Use editor.view.dom instead of containerRef to target the actual TipTap content
      setTimeout(() => {
        if (editor?.view?.dom) {
          try {
            renderMathInElement(editor.view.dom, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false },
                { left: '$', right: '$', display: false },
              ],
              throwOnError: false,
              // Ignore already rendered math
              ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
              ignoredClasses: ['katex'],
            });
          } catch (err) {
            console.error('KaTeX auto-render failed', err);
          }
        }
      }, 50);
    };
    editor.on('update', handler);
    return () => {
      editor.off('update', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, notebook, title]);

  // Title change autosave
  useEffect(() => {
    if (!notebook) return;
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title]);

  const insertTable = () => {
    setShowTableDialog(true);
  };

  const confirmTableInsert = () => {
    if (!editor || tableRows < 1 || tableCols < 1) return;
    editor
      .chain()
      .focus()
      .insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true })
      .run();
    setShowTableDialog(false);
  };

  const addRowBelow = () => {
    editor?.chain().focus().addRowAfter().run();
  };

  const deleteRow = () => {
    editor?.chain().focus().deleteRow().run();
  };

  const addColAfter = () => {
    editor?.chain().focus().addColumnAfter().run();
  };

  const deleteCol = () => {
    editor?.chain().focus().deleteColumn().run();
  };

  const deleteTable = () => {
    if (confirm('Delete this table?')) {
      editor?.chain().focus().deleteTable().run();
    }
  };

  const applyFontFamily = (family: string) => {
    editor?.chain().focus().setMark('textStyle', { fontFamily: family }).run();
  };

  const applyFontSize = (size: string) => {
    // use textStyle mark to set inline style for font-size
    const style = `font-size: ${size}px`;
    editor?.chain().focus().setMark('textStyle', { style }).run();
  };

  const applyColor = (color: string) => {
    editor?.chain().focus().setMark('textStyle', { color }).run();
  };

  // NOTE: do not early-return here — keep hooks order stable across renders

  const currentHeading = () => {
    if (!editor) return 'paragraph';
    for (let lvl = 1; lvl <= 4; lvl++) {
      if (editor.isActive('heading', { level: lvl })) return String(lvl);
    }
    return 'paragraph';
  };

  // show floating toolbar when text selection inside editor is active
  useEffect(() => {
    const onSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        setShowSelectionToolbar(false);
        return;
      }
      if (!containerRef.current) {
        setShowSelectionToolbar(false);
        return;
      }

      const range = sel.getRangeAt(0);
      if (sel.isCollapsed) {
        setShowSelectionToolbar(false);
        return;
      }

      // ensure selection is inside the editor container
      const anchorNode = sel.anchorNode as Node | null; // DOM Node type now unambiguous
      if (!anchorNode || !containerRef.current.contains(anchorNode)) {
        setShowSelectionToolbar(false);
        return;
      }

      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      // position toolbar above selection, account for scroll
      const left = rect.left - containerRect.left + (containerRef.current.scrollLeft || 0);
      const top = rect.top - containerRect.top + (containerRef.current.scrollTop || 0) - 40;
      setSelectionPos({ left: Math.max(8, left), top: Math.max(8, top) });
      setShowSelectionToolbar(true);
    };

    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, [editor]);

    if (!notebook) {
      return (
        <div className='flex-1 p-6'>
          <div className='text-gray-500'>Select or create a notebook to begin writing.</div>
        </div>
      );
    }

    return (
    <div className='flex-1 flex flex-col border-l bg-white'>
      {/* top menu bar like docs */}
      <div className='px-4 py-2 bg-gray-100 border-b'>
        <ul className='flex gap-4 text-sm'>
          <li className='relative'>
            <button
              onClick={() => setShowFileMenu((v) => !v)}
              className='cursor-pointer hover:underline px-2 py-1'
            >
              File
            </button>

            {showFileMenu && (
              <ul className='absolute mt-1 left-0 w-40 bg-white border rounded shadow-lg z-50'>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={async () => {
                      // create new and open in new tab
                      try {
                        const created = await notebookService.create({ title: 'Untitled' });
                        window.open(`/notebooks/${created.id}`, '_blank');
                      } catch (err) {
                        console.error('Failed to create notebook', err);
                      }
                      setShowFileMenu(false);
                    }}
                  >
                    New
                  </button>
                </li>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={async () => {
                      // show open dialog
                      if (!allNotebooks.length) {
                        try {
                          const list = await notebookService.list();
                          setAllNotebooks(list);
                        } catch (err) {
                          console.error('Failed to list notebooks', err);
                        }
                      }
                      setShowOpenDialog(true);
                      setShowFileMenu(false);
                    }}
                  >
                    Open...
                  </button>
                </li>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      // export current content as Word-friendly HTML
                      try {
                        const html = `<html><head><meta charset="utf-8"></head><body>${editor?.getHTML() || notebook?.content || ''}</body></html>`;
                        const blob = new Blob([html], { type: 'application/msword' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `${notebook?.title || 'note'}.docx`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error('Export failed', err);
                      }
                      setShowFileMenu(false);
                    }}
                  >
                    Export as .docx
                  </button>
                </li>
              </ul>
            )}
          </li>
          <li className='relative'>
            <button
              onClick={() => setShowFormatMenu((v) => !v)}
              className='cursor-pointer hover:underline px-2 py-1'
            >
              Format
            </button>

            {showFormatMenu && (
              <ul className='absolute mt-1 left-0 w-40 bg-white border rounded shadow-lg z-50'>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      editor?.chain().focus().toggleBold().run();
                      setShowFormatMenu(false);
                    }}
                  >
                    Bold
                  </button>
                </li>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      editor?.chain().focus().toggleItalic().run();
                      setShowFormatMenu(false);
                    }}
                  >
                    Italic
                  </button>
                </li>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      editor?.chain().focus().toggleUnderline().run();
                      setShowFormatMenu(false);
                    }}
                  >
                    Underlined
                  </button>
                </li>
              </ul>
            )}
          </li>
          <li className='relative'>
            <button
              onClick={() => setShowToolsMenu((v) => !v)}
              className='cursor-pointer hover:underline px-2 py-1'
            >
              Tools
            </button>

            {showToolsMenu && (
              <ul className='absolute mt-1 left-0 w-48 bg-white border rounded shadow-lg z-50'>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={async () => {
                      // open cite dialog and preload papers
                      try {
                        const res = await listPapers(undefined, 200);
                        const items = (res.items || []).filter((p) => p.status === 'COMPLETED');
                        setCiteResults(items);
                        setCiteSearchResults(null);
                        setCiteQuery('');
                      } catch (err) {
                        console.error('Failed to load papers for cite', err);
                      }
                      setShowCiteDialog(true);
                      setShowToolsMenu(false);
                    }}
                  >
                    Cite
                  </button>
                </li>
                <li>
                  <button
                    className='block w-full text-left px-4 py-2 hover:bg-gray-100'
                    onClick={() => {
                      setShowAskAIDialog(true);
                      setShowToolsMenu(false);
                    }}
                  >
                    Ask AI
                  </button>
                </li>
              </ul>
            )}
          </li>
        </ul>
      </div>

      <div className='px-4 py-4 border-b bg-white'>
        {/* Title Row */}
        <div className='mb-4'>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder='Untitled'
            className='text-lg font-semibold w-full bg-transparent outline-none'
          />
        </div>

        {/* Toolbar Row */}
        <div className='flex gap-2 items-center flex-wrap'>
          <button
            onClick={() => editor?.chain().focus().undo().run()}
            title='Undo'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().redo().run()}
            title='Redo'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Redo size={16} />
          </button>

          <select
            value={currentHeading()}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'paragraph') {
                editor?.chain().focus().setParagraph().run();
              } else {
                const lvl = (parseInt(val, 10) as 1 | 2 | 3 | 4 | 5 | 6);
                editor?.chain().focus().toggleHeading({ level: lvl }).run();
              }
            }}
            className='border rounded px-2 py-1 text-sm'
          >
            <option value='paragraph'>Paragraph</option>
            <option value='1'>Heading 1</option>
            <option value='2'>Heading 2</option>
            <option value='3'>Heading 3</option>
            <option value='4'>Heading 4</option>
          </select>

          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            title='Bold'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            title='Italic'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            title='Underline'
            className='p-2 rounded hover:bg-gray-100'
          >
            <UnderlineIcon size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            title='Bullet list'
            className='p-2 rounded hover:bg-gray-100'
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            title='Numbered list'
            className='p-2 rounded hover:bg-gray-100'
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleTaskList().run()}
            title='Checkbox list'
            className='p-2 rounded hover:bg-gray-100'
          >
            <CheckSquare size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleLink().run()}
            title='Link'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Link size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleCode().run()}
            title='Code'
            className='p-2 rounded hover:bg-gray-100'
          >
            <Code size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().setTextAlign('left').run()}
            title='Align left'
            className='p-2 rounded hover:bg-gray-100'
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().setTextAlign('center').run()}
            title='Align center'
            className='p-2 rounded hover:bg-gray-100'
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => editor?.chain().focus().setTextAlign('right').run()}
            title='Align right'
            className='p-2 rounded hover:bg-gray-100'
          >
            <AlignRight size={16} />
          </button>

          <div className='border-l mx-1'></div>

          <div className='relative group'>
            <button
              onClick={() => setShowTableMenu(!showTableMenu)}
              title='Table operations'
              className='p-2 rounded hover:bg-gray-100 flex items-center gap-1'
            >
              <Grid3x3 size={16} />
              <ChevronDown size={12} />
            </button>

            {showTableMenu && (
              <div className='absolute top-full left-0 mt-1 bg-white border rounded shadow-lg z-40 min-w-max'>
                <button
                  onClick={() => {
                    insertTable();
                    setShowTableMenu(false);
                  }}
                  title='Insert table'
                  className='w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap'
                >
                  <Grid3x3 size={14} /> Insert Table
                </button>
                <button
                  onClick={() => {
                    addRowBelow();
                    setShowTableMenu(false);
                  }}
                  title='Add row below'
                  className='w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap'
                >
                  <Plus size={14} /> Add Row
                </button>
                <button
                  onClick={() => {
                    deleteRow();
                    setShowTableMenu(false);
                  }}
                  title='Delete row'
                  className='w-full text-left px-4 py-2 hover:bg-red-100 flex items-center gap-2 whitespace-nowrap text-red-600'
                >
                  <Trash2 size={14} /> Delete Row
                </button>
                <div className='border-t'></div>
                <button
                  onClick={() => {
                    addColAfter();
                    setShowTableMenu(false);
                  }}
                  title='Add column'
                  className='w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 whitespace-nowrap'
                >
                  <Columns3 size={14} /> Add Column
                </button>
                <button
                  onClick={() => {
                    deleteCol();
                    setShowTableMenu(false);
                  }}
                  title='Delete column'
                  className='w-full text-left px-4 py-2 hover:bg-red-100 flex items-center gap-2 whitespace-nowrap text-red-600'
                >
                  <Trash2 size={14} /> Delete Column
                </button>
                <div className='border-t'></div>
                <button
                  onClick={() => {
                    deleteTable();
                    setShowTableMenu(false);
                  }}
                  title='Delete table'
                  className='w-full text-left px-4 py-2 hover:bg-red-100 flex items-center gap-2 whitespace-nowrap text-red-600'
                >
                  <Trash2 size={14} /> Delete Table
                </button>
              </div>
            )}
          </div>

          <div className='border-l mx-1'></div>

          <select
            onChange={(e) => applyFontFamily(e.target.value)}
            className='border rounded px-2 py-1 text-sm'
            defaultValue=''
          >
            <option value=''>Font</option>
            <option value='Arial, Helvetica, sans-serif'>Arial</option>
            <option value='Georgia, serif'>Georgia</option>
            <option value='Times New Roman, Times, serif'>Times New Roman</option>
            <option value='Courier New, monospace'>Courier New</option>
          </select>

          <select
            onChange={(e) => applyFontSize(e.target.value)}
            className='border rounded px-2 py-1 text-sm'
            defaultValue=''
          >
            <option value=''>Size</option>
            <option value='12'>12</option>
            <option value='14'>14</option>
            <option value='16'>16</option>
            <option value='18'>18</option>
            <option value='20'>20</option>
            <option value='24'>24</option>
          </select>

          <input type='color' onChange={(e) => applyColor(e.target.value)} className='w-8 h-8 p-0 border rounded' />
        </div>
      </div>

      <div className='p-4 overflow-auto bg-white'>
        {/* make this container relative so floating toolbar can position inside */}
        <style>{`
          .tiptap table {
            border-collapse: collapse;
            width: 100%;
            margin: 1rem 0;
          }
          .tiptap table td, .tiptap table th {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          .tiptap table th {
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .tiptap table tr:hover {
            background-color: #f9f9f9;
          }
          /* Ensure KaTeX renders correctly in TipTap */
          .tiptap .katex {
            font-size: 1em !important;
            line-height: 1.2 !important;
            font-family: KaTeX_Main, "Times New Roman", serif !important;
          }
          .tiptap .katex-display {
            margin: 0.5em 0;
            overflow-x: auto;
            overflow-y: hidden;
          }
          .tiptap .katex-display > .katex {
            white-space: nowrap;
          }
          /* KaTeX's own CSS (katex.min.css) handles all positioning
             correctly. The atomic MathInline node preserves KaTeX DOM. */
        `}</style>
        <div ref={containerRef} className='prose max-w-none mx-0 relative'>
          <EditorContent editor={editor} />

          {/* floating selection toolbar */}
          {showSelectionToolbar && (
            <div
              className='absolute z-50 bg-white border rounded shadow-md flex items-center gap-2 px-2 py-1'
              style={{ left: selectionPos.left, top: selectionPos.top }}
            >
              <button
                title='Bold'
                onClick={() => editor?.chain().focus().toggleBold().run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <Bold size={14} />
              </button>
              <button
                title='Italic'
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <Italic size={14} />
              </button>
              <button
                title='Underline'
                onClick={() => editor?.chain().focus().toggleUnderline().run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <UnderlineIcon size={14} />
              </button>
              <div className='border-l h-6 mx-1' />
              <button
                title='Bullet list'
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <List size={14} />
              </button>
              <button
                title='Numbered list'
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <ListOrdered size={14} />
              </button>
              <div className='border-l h-6 mx-1' />
              <button
                title='Align left'
                onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <AlignLeft size={14} />
              </button>
              <button
                title='Align center'
                onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <AlignCenter size={14} />
              </button>
              <button
                title='Align right'
                onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                className='p-1 hover:bg-gray-100 rounded'
              >
                <AlignRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {showTableDialog && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
          <div className='bg-white rounded-lg shadow-lg p-6 w-96'>
            <h2 className='text-lg font-semibold mb-4'>Insert Table</h2>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Rows</label>
                <input
                  type='number'
                  min='1'
                  max='20'
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className='w-full border rounded px-3 py-2'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Columns</label>
                <input
                  type='number'
                  min='1'
                  max='20'
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className='w-full border rounded px-3 py-2'
                />
              </div>
              <div className='flex gap-2 justify-end'>
                <button
                  onClick={() => setShowTableDialog(false)}
                  className='px-4 py-2 rounded border hover:bg-gray-100'
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTableInsert}
                  className='px-4 py-2 bg-black text-white rounded hover:bg-gray-800'
                >
                  Insert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Cite Dialog */}
      {showCiteDialog && (
        <div className='fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20'>
          <div className='bg-white rounded-lg shadow-lg p-4 w-11/12 max-w-2xl'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-semibold'>Cite from my library</h3>
              <button onClick={() => setShowCiteDialog(false)} className='px-2 py-1'>Close</button>
            </div>
            <div className='mb-3 flex gap-2'>
              <input
                value={citeQuery}
                onChange={(e) => setCiteQuery(e.target.value)}
                placeholder='Enter phrase (exact match) to search inside papers'
                className='flex-1 border rounded px-3 py-2'
              />
              <button
                className='px-3 py-2 bg-black text-white rounded'
                onClick={async () => {
                  // manual override if user prefers button
                  setIsSearching(true);
                  try {
                    const resp = await searchPapers(citeQuery || '');
                    setCiteSearchResults(resp);
                  } catch (err) {
                    console.error('Search failed', err);
                  } finally {
                    setIsSearching(false);
                  }
                }}
              >
                Search
              </button>
            </div>
            <div className='max-h-64 overflow-auto space-y-2'>
              {isSearching && <div className='text-sm text-gray-500 mb-2'>Searching…</div>}
              {citeSearchResults ? (
                <div className='space-y-2'>
                  {((citeSearchResults.citations || []) as any[]).map((c, idx) => (
                    <div key={idx} className='border rounded px-3 py-2'>
                      <div className='text-sm mb-1'>{c.snippet || c.text || ''}</div>
                      <div className='text-xs text-gray-500 mb-2'>
                        Source: {c.sourcePaperTitle || c.sourcePaperId || c.source_id || 'Unknown'} — page {c.pageNumber || c.page || ''}
                      </div>
                      <div className='flex justify-end'>
                        <button
                          className='px-3 py-1 rounded border text-sm'
                          onClick={() => {
                            const snippet = c.snippet || c.text || '';
                            const source = c.sourceFileUrl ? ` (<a href=\"${c.sourceFileUrl}\" target=\"_blank\">source</a>)` : '';
                            editor?.chain().focus().insertContent(`<p>${snippet}${source}</p>`).run();
                            setShowCiteDialog(false);
                          }}
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  ))}
                  {citeSearchResults.sources && (
                    <div className='mt-2 border-t pt-2'>
                      <div className='text-sm font-medium mb-1'>Sources</div>
                      {(citeSearchResults.sources || []).map((s: any) => (
                        <div key={s.paperId} className='text-xs text-gray-600'>
                          {s.title} {s.fileUrl ? <a className='text-blue-600' href={s.fileUrl} target='_blank' rel='noreferrer'>Open</a> : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // fallback to listing metadata before search
                (citeResults || [])
                  .filter((p) => {
                    if (!citeQuery) return true;
                    const q = citeQuery.toLowerCase();
                    return (
                      (p.title || '').toLowerCase().includes(q) ||
                      (p.fileName || '').toLowerCase().includes(q) ||
                      (p.authors || '').toLowerCase().includes(q)
                    );
                  })
                  .map((p) => (
                    <div key={p.id} className='flex items-center justify-between border rounded px-3 py-2'>
                      <div className='text-sm'>
                        <div className='font-medium'>{p.title || p.fileName}</div>
                        <div className='text-xs text-gray-500'>{p.authors || p.source || ''}</div>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          className='px-3 py-1 rounded border text-sm'
                          onClick={() => {
                            const text = `${p.title || p.fileName}${p.fileUrl ? ' — ' + p.fileUrl : ''}`;
                            editor?.chain().focus().insertContent(`<p>${text}</p>`).run();
                            setShowCiteDialog(false);
                          }}
                        >
                          Insert
                        </button>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Ask AI Dialog (floating) */}
      {showAskAIDialog && (
        <div className='fixed inset-0 z-50 flex items-start justify-center pt-24'>
          <div className='bg-white rounded-lg shadow-lg p-4 w-11/12 max-w-xl'>
            <div className='flex items-center justify-between mb-2'>
              <h3 className='text-lg font-semibold'>Ask AI to write</h3>
              <button onClick={() => setShowAskAIDialog(false)} className='px-2 py-1'>Close</button>
            </div>
            <textarea
              value={askAIQuery}
              onChange={(e) => setAskAIQuery(e.target.value)}
              placeholder='Ask AI to write e.g., "Write an introduction summarizing recent work on X"'
              className='w-full border rounded px-3 py-2 min-h-[120px]'
            />
            <div className='flex items-center justify-end gap-2 mt-3'>
              <button
                className='px-4 py-2 rounded border'
                onClick={() => {
                  setAskAIQuery('');
                  setShowAskAIDialog(false);
                }}
              >
                Cancel
              </button>
              <button
                className='px-4 py-2 bg-black text-white rounded'
                onClick={async () => {
                  if (!askAIQuery) return;
                  try {
                    setAskAILoading(true);
                    const { assistantMsg } = await sendQuery(null, askAIQuery);
                    const raw = assistantMsg?.content || '';
                    // format the AI response before inserting (KaTeX is already rendered)
                    const content = formatAIGeneration(raw);
                    editor?.chain().focus().insertContent(content).run();
                    setShowAskAIDialog(false);
                    setAskAIQuery('');
                  } catch (err) {
                    console.error('AI request failed', err);
                  } finally {
                    setAskAILoading(false);
                  }
                }}
              >
                {askAILoading ? 'Generating...' : 'Insert into note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple plain-text cleaner for pasted content (strips KaTeX markup)
function cleanPastedText(text: string): string {
  if (!text) return text;
  // if it contains HTML/KaTeX markup, strip all tags
  if (text.includes('<') && text.includes('>')) {
    return text.replace(/<[^>]*>/g, '');
  }
  return text;
}

// Utility to massage AI freeform output so it renders nicely in the notebook editor.
// - sanitizeLatex ensures any $..$ math remains balanced and safe
// - convert double newlines into separate paragraphs
// - convert single newlines into <br/> so poetry/line‑oriented text preserves line breaks
function formatAIGeneration(text: string): string {
  if (!text) return text;

  // if the AI response already contains KaTeX-generated HTML, strip it back to
  // raw LaTeX/markdown so we don’t double‑render or end up với HTML rác.
  let formatted = text
    // fix missing space after <span (some copy/pastes collapse them)
    .replace(/<span(?=[A-Za-z])/g, '<span ')
    // extract original TeX from any existing KaTeX output
    .replace(
      /<span[^>]*class="?katex[^>]*>[\s\S]*?<annotation[^>]*>([\s\S]*?)<\/annotation>[\s\S]*?<\/span>/g,
      '$1',
    )
    // extract bare annotations even if span structure is broken
    .replace(
      /<annotation[^>]*>([\s\S]*?)<\/annotation>/g,
      '$1',
    )
    // remove MathML and SVG markup
    .replace(/<\/?math[^>]*>/g, '')
    .replace(/<\/?semantics[^>]*>/g, '')
    .replace(/<\/?mrow[^>]*>/g, '')
    .replace(/<\/?mi[^>]*>/g, '')
    .replace(/<\/?mo[^>]*>/g, '')
    .replace(/<\/?mn[^>]*>/g, '')
    .replace(/<\/?msup[^>]*>/g, '')
    .replace(/<\/?msupsub[^>]*>/g, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/g, '')
    // remove any remaining span tags
    .replace(/<\/?span[^>]*>/g, '');

  // Strip zero-width spaces that AI responses sometimes include
  formatted = formatted.replace(/[\u200B\u200C\u200D\uFEFF]/g, '');

  // Convert LaTeX delimiters to <span class="katex" data-latex="..."> tags
  // that the MathInline atom node will pick up and render via its NodeView.
  // We do NOT use renderMathInElement here to avoid double-rendering
  // (pre-render + NodeView), which caused formulas to appear multiple times.
  const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Display math: $$...$$ and \[...\]
  formatted = formatted.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex: string) =>
    `<span class="katex" data-latex="${escAttr(tex.trim())}" data-display="true"></span>`,
  );
  formatted = formatted.replace(/\\\[([\s\S]*?)\\\]/g, (_, tex: string) =>
    `<span class="katex" data-latex="${escAttr(tex.trim())}" data-display="true"></span>`,
  );
  // Inline math: $...$ and \(...\)
  formatted = formatted.replace(/\$([^\$\n]+?)\$/g, (_, tex: string) =>
    `<span class="katex" data-latex="${escAttr(tex.trim())}"></span>`,
  );
  formatted = formatted.replace(/\\\(([\s\S]*?)\\\)/g, (_, tex: string) =>
    `<span class="katex" data-latex="${escAttr(tex.trim())}"></span>`,
  );

  // split on two or more newlines for paragraphs, giữ \n đơn thành <br/>
  const paragraphs: string[] = formatted.split(/\n{2,}/);
  formatted = paragraphs
    .map((p: string) => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');

  return formatted;
}
