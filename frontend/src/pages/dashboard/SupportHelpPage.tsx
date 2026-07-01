import { HelpCircle, MessageSquare, Book, ExternalLink } from 'lucide-react';
import { TopBar } from '../../components/layout/TopBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const resources = [
  { label: 'Documentation', desc: 'Integration guides, API reference, and examples', icon: Book, href: '#docs' },
  { label: 'Live chat support', desc: 'Chat with our team — available Mon–Fri 9am–6pm EST', icon: MessageSquare, href: '#chat' },
  { label: 'Community forum', desc: 'Ask questions, share ideas, and get help from the community', icon: HelpCircle, href: '#forum' },
];

export function SupportHelpPage() {
  return (
    <div className="flex flex-col h-full">
      <TopBar title="Support & Help" />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-headline-lg font-headline font-bold text-on-surface">Support & Help</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Get help with FUGU.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {resources.map((r) => (
            <Card key={r.label} className="flex flex-col hover:border-accent-violet/30 transition-colors cursor-pointer group">
              <div className="w-10 h-10 rounded-lg bg-accent-violet/10 flex items-center justify-center mb-4 group-hover:bg-accent-violet/20 transition-colors">
                <r.icon size={20} className="text-accent-violet" />
              </div>
              <h3 className="text-body-sm font-semibold text-on-surface mb-1">{r.label}</h3>
              <p className="text-body-sm text-on-surface-variant flex-1">{r.desc}</p>
              <Button variant="secondary" size="sm" className="mt-4">
                <ExternalLink size={13} /> Open
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
