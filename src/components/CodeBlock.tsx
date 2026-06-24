'use client';

import { useEffect, useRef, useState } from 'react';
import hljs from 'highlight.js';
import 'highlight.js/styles/atom-one-dark.css';
import { Clipboard, Check } from 'lucide-react';

interface CodeBlockProps {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // Clear previous highlighting attributes if any
      codeRef.current.removeAttribute('data-highlighted');
      hljs.highlightElement(codeRef.current);
    }
  }, [code, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Human-friendly language names
  const getFriendlyLanguageName = (lang: string) => {
    const names: Record<string, string> = {
      javascript: 'JavaScript',
      typescript: 'TypeScript',
      python: 'Python',
      html: 'HTML',
      css: 'CSS',
      sql: 'SQL',
      json: 'JSON',
      bash: 'Bash',
      go: 'Go',
      rust: 'Rust',
      csharp: 'C#',
      java: 'Java',
      cpp: 'C++',
      php: 'PHP',
      ruby: 'Ruby',
      swift: 'Swift',
      kotlin: 'Kotlin',
      yaml: 'YAML',
      markdown: 'Markdown',
      xml: 'XML',
    };
    return names[lang.toLowerCase()] || lang;
  };

  return (
    <div className="relative rounded-xl border border-slate-800 bg-[#282c34] text-slate-100 overflow-hidden my-4">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-[#21252b] select-none">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase font-jetbrains">
          {getFriendlyLanguageName(language)}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 active:scale-95 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white transition-all"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-semibold">Copied</span>
            </>
          ) : (
            <>
              <Clipboard className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto p-4 font-jetbrains text-sm leading-relaxed">
        <pre className="m-0 bg-transparent p-0">
          <code ref={codeRef} className={`language-${language} font-jetbrains`}>
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
