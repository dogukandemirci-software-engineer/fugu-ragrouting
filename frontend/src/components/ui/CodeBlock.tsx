import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative rounded-lg border border-outline-variant bg-ink-dark overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-[11px] uppercase tracking-wider text-white/40 font-mono">{language}</span>
        <button onClick={copy} className="text-white/40 hover:text-white transition-colors" aria-label="Copy code">
          {copied ? <Check size={13} className="text-accent-teal-glow" /> : <Copy size={13} />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-white/80">
        <code>{code}</code>
      </pre>
    </div>
  );
}
