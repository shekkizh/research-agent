import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Download, Copy, CopyCheck, ClipboardCopy, ClipboardCheck } from 'lucide-react';
interface MarkdownReportProps {
  markdown: string;
}

const MarkdownReport: React.FC<MarkdownReportProps> = ({ markdown }) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [copyAllClicked, setCopyAllClicked] = useState(false);

  // Split the markdown into sections based on heading level 1 (#)
  const sections = React.useMemo(() => {
    return markdown
      .split(/(?=^# )/gm)
      .filter((section) => section.trim().length > 0);
  }, [markdown]);

  const downloadReport = (title: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.md`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyToClipboard = (text: string, sectionTitle?: string) => {
    if (sectionTitle) {
      setCopiedSection(sectionTitle);
      setCopyAllClicked(false);
      setTimeout(() => {
        setCopiedSection(null);
      }, 2000);
    } else {
      // For the "Copy All" button
      setCopyAllClicked(true);
      setTimeout(() => {
        setCopyAllClicked(false);
      }, 2000);
    }

    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const getSectionTitle = (section: string) => {
    const match = section.match(/^# (.+)$/m);
    return match ? match[1] : 'Section';
  };

  const toggleSection = (sectionTitle: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle]
    }));
  };

  // Initialize all sections as expanded by default
  React.useEffect(() => {
    const initialExpandedState = sections.reduce((acc, section) => {
      const title = getSectionTitle(section);
      return { ...acc, [title]: true };
    }, {});
    setExpandedSections(initialExpandedState);
  }, [markdown]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Research Report</CardTitle>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => copyToClipboard(markdown)}
          >
            {copyAllClicked ? <CopyCheck className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            Copy All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => downloadReport(getSectionTitle(sections[0]))}
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sections.map((section, index) => {
            const sectionTitle = getSectionTitle(section);
            const isExpanded = expandedSections[sectionTitle];
            const isCopied = copiedSection === sectionTitle;
            
            return (
              <Card key={index} className="border-2">
                <CardHeader className="p-4 cursor-pointer flex flex-row justify-between items-center">
                  <div className="flex-grow" onClick={() => toggleSection(sectionTitle)}>
                    <CardTitle className="text-lg">{sectionTitle}</CardTitle>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        copyToClipboard(section, sectionTitle);
                      }}
                    >
                        {isCopied ? <ClipboardCheck className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => toggleSection(sectionTitle)}
                    >
                      <span className="transition-transform duration-200">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </span>
                    </Button>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="p-4 border-t">
                    <div className="prose dark:prose-invert max-w-none">
                      <ReactMarkdown>{section}</ReactMarkdown>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MarkdownReport; 