import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showCopy?: boolean;
  className?: string;
}

export function CodeBlock({ code, language, showCopy = true, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative rounded-card overflow-hidden ${className ?? ''}`}>
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-ink-dark border-b border-ink-dark-border">
        <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
        <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
        <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
        {language && (
          <span className="ml-2 text-code-sm font-code text-on-primary-container">{language}</span>
        )}
        {showCopy && (
          <button
            onClick={handleCopy}
            className="ml-auto text-on-primary-container hover:text-white transition-colors p-1 rounded"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>
        )}
      </div>
      <pre className="bg-ink-dark-hover p-4 overflow-x-auto text-code-md font-code text-on-primary-container leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
