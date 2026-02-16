import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { TextStyle } from '@tiptap/extension-text-style';
import { FontFamily } from '@tiptap/extension-font-family';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, Grid3x3, ChevronDown, Plus, Columns3, Trash2 } from 'lucide-react';
import notebookService from '@/services/notebookService';

type Props = {
  notebook: { id: string; title: string; content: string } | null;
  onUpdated?: (nb: any) => void;
};

export default function NotebookEditor({ notebook, onUpdated }: Props) {
  const [title, setTitle] = useState(notebook?.title || '');
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const saveTimer = useRef<number | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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
  });

  // When notebook prop changes, update editor content and title
  useEffect(() => {
    setTitle(notebook?.title || '');
    if (!editor) return;
    const newContent = notebook?.content || '';
    if (newContent !== editor.getHTML()) {
      editor.commands.setContent(newContent);
    }
  }, [notebook, editor]);

  // Debounced autosave for content and title
  const scheduleSave = async () => {
    if (!notebook) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const payload: any = { title, content: editor?.getHTML() || '' };
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
    const handler = () => scheduleSave();
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

  if (!notebook) {
    return (
      <div className='flex-1 p-6'>
        <div className='text-gray-500'>Select or create a notebook to begin writing.</div>
      </div>
    );
  }

  return (
    <div className='flex-1 flex flex-col border-l'>
      <div className='px-6 py-4 border-b bg-white'>
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

      <div className='p-6 overflow-auto'>
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
        `}</style>
        <div className='prose max-w-none'>
          <EditorContent editor={editor} />
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
    </div>
  );
}
