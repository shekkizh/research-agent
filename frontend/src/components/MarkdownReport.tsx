import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MarkdownReportProps {
  markdown: string;
}

const MarkdownReport: React.FC<MarkdownReportProps> = ({ markdown }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Split the markdown into sections based on heading level 2 (##)
  const sections = markdown
    .split(/(?=## )/g)
    .filter((section) => section.trim().length > 0);

  const downloadReport = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'research-report.md';
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const getSectionTitle = (section: string) => {
    const match = section.match(/^## (.+)$/m);
    return match ? match[1] : 'Introduction';
  };

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
            <svg 
              width="15" 
              height="15" 
              viewBox="0 0 15 15" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
            >
              <path 
                d="M5 2V1H10V2H5ZM4.75 0C4.33579 0 4 0.335786 4 0.75V1H3.5C2.67157 1 2 1.67157 2 2.5V12.5C2 13.3284 2.67157 14 3.5 14H11.5C12.3284 14 13 13.3284 13 12.5V2.5C13 1.67157 12.3284 1 11.5 1H11V0.75C11 0.335786 10.6642 0 10.25 0H4.75ZM11 2V2.25C11 2.66421 10.6642 3 10.25 3H4.75C4.33579 3 4 2.66421 4 2.25V2H3.5C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V2.5C12 2.22386 11.7761 2 11.5 2H11Z" 
                fill="currentColor" 
                fillRule="evenodd" 
                clipRule="evenodd"
              />
            </svg>
            Copy All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadReport}
          >
            <svg 
              width="15" 
              height="15" 
              viewBox="0 0 15 15" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
              className="mr-2 h-4 w-4"
            >
              <path 
                d="M7.50005 1.04999C7.74858 1.04999 7.95005 1.25146 7.95005 1.49999V8.41359L10.1819 6.18179C10.3576 6.00605 10.6425 6.00605 10.8182 6.18179C10.994 6.35753 10.994 6.64245 10.8182 6.81819L7.81825 9.81819C7.64251 9.99392 7.35759 9.99392 7.18185 9.81819L4.18185 6.81819C4.00611 6.64245 4.00611 6.35753 4.18185 6.18179C4.35759 6.00605 4.64251 6.00605 4.81825 6.18179L7.05005 8.41359V1.49999C7.05005 1.25146 7.25152 1.04999 7.50005 1.04999ZM2.5 10C2.77614 10 3 10.2239 3 10.5V12C3 12.5539 3.44565 13 3.99635 13H11.0012C11.5529 13 12 12.5539 12 12V10.5C12 10.2239 12.2239 10 12.5 10C12.7761 10 13 10.2239 13 10.5V12C13 13.1046 12.1049 14 11.0012 14H3.99635C2.89532 14 2 13.1046 2 12V10.5C2 10.2239 2.22386 10 2.5 10Z" 
                fill="currentColor" 
                fillRule="evenodd" 
                clipRule="evenodd"
              />
            </svg>
            Download
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sections.map((section, index) => {
            const sectionTitle = getSectionTitle(section);
            const isExpanded = expandedSection === sectionTitle || expandedSection === null;
            
            return (
              <Card key={index} className="border-2">
                <CardHeader className="p-4 cursor-pointer flex flex-row justify-between items-center" 
                  onClick={() => setExpandedSection(
                    expandedSection === sectionTitle ? null : sectionTitle
                  )}
                >
                  <CardTitle className="text-lg">{sectionTitle}</CardTitle>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(section);
                      }}
                    >
                      <svg 
                        width="15" 
                        height="15" 
                        viewBox="0 0 15 15" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                      >
                        <path 
                          d="M5 2V1H10V2H5ZM4.75 0C4.33579 0 4 0.335786 4 0.75V1H3.5C2.67157 1 2 1.67157 2 2.5V12.5C2 13.3284 2.67157 14 3.5 14H11.5C12.3284 14 13 13.3284 13 12.5V2.5C13 1.67157 12.3284 1 11.5 1H11V0.75C11 0.335786 10.6642 0 10.25 0H4.75ZM11 2V2.25C11 2.66421 10.6642 3 10.25 3H4.75C4.33579 3 4 2.66421 4 2.25V2H3.5C3.22386 2 3 2.22386 3 2.5V12.5C3 12.7761 3.22386 13 3.5 13H11.5C11.7761 13 12 12.7761 12 12.5V2.5C12 2.22386 11.7761 2 11.5 2H11Z" 
                          fill="currentColor" 
                          fillRule="evenodd" 
                          clipRule="evenodd"
                        />
                      </svg>
                    </Button>
                    <span className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
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