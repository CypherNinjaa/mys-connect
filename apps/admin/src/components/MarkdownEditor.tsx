'use client';

import React, { useState, useRef } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Quote,
  List,
  ListOrdered,
  Eye,
  Edit3,
  Code,
} from 'lucide-react';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
  label?: string;
  error?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Write content here...',
  rows = 6,
  label,
  error,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormat = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;
    const newValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selectedText ? selectedText.length : 4)
      );
    }, 50);
  };

  // Simple Markdown Parser for Live Preview
  const renderPreview = (text: string) => {
    if (!text || text.trim() === '') {
      return <p className="text-gray-400 italic text-sm">Nothing to preview yet...</p>;
    }

    const lines = text.split('\n');
    return (
      <div className="prose prose-sm max-w-none text-gray-800 space-y-2">
        {lines.map((line, idx) => {
          let trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-2" />;

          // Headings
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-extrabold text-maroon border-b pb-1 mt-2">
                {trimmed.replace('# ', '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-gray-900 mt-2">
                {trimmed.replace('## ', '')}
              </h2>
            );
          }

          // Blockquote
          if (trimmed.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-amber-500 bg-amber-50/60 p-3 italic text-gray-700 rounded-r-lg font-serif"
              >
                "{trimmed.replace('> ', '')}"
              </blockquote>
            );
          }

          // Bullet List
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-gray-700">
                {trimmed.substring(2)}
              </li>
            );
          }

          // Render bold/italic inline parsing safely
          return (
            <p key={idx} className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[11px] text-gray-400 font-medium">Markdown Supported</span>
        </div>
      )}

      <div className="border border-gray-300 rounded-xl overflow-hidden shadow-xs bg-white focus-within:ring-2 focus-within:ring-maroon/20 focus-within:border-maroon transition-all">
        {/* Editor Header Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2">
          {/* Format Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => insertFormat('**', '**')}
              title="Bold (**text**)"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('*', '*')}
              title="Italic (*text*)"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <Italic className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => insertFormat('# ')}
              title="Heading 1"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('## ')}
              title="Heading 2"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('> ')}
              title="Quote"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <Quote className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => insertFormat('- ')}
              title="Bullet List"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => insertFormat('1. ')}
              title="Numbered List"
              className="p-1.5 text-gray-600 hover:text-maroon hover:bg-gray-200/70 rounded transition-colors"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-gray-200/80 p-0.5 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'edit'
                  ? 'bg-white text-maroon shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              Write
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-white text-maroon shadow-xs font-bold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>
        </div>

        {/* Input Area / Preview Box */}
        {activeTab === 'edit' ? (
          <textarea
            ref={textareaRef}
            rows={rows}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full p-3.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none resize-y font-sans leading-relaxed border-none"
          />
        ) : (
          <div className="p-4 bg-gray-50/50 min-h-[140px] max-h-[300px] overflow-y-auto">
            {renderPreview(value)}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
