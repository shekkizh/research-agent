import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Clock, Trash2 } from 'lucide-react';

export interface ReportHistory {
  id: string;
  title: string;
  query: string;
  report: string;
  timestamp: number;
}

interface HistoryPanelProps {
  history: ReportHistory[];
  onSelectReport: (report: ReportHistory) => void;
  onDeleteReport: (id: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ 
  history, 
  onSelectReport, 
  onDeleteReport 
}) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Clock className="mr-2 h-5 w-5" /> Research History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">No research history yet</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {history.map((item) => (
                <div 
                  key={item.id}
                  className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                >
                  <div 
                    className="flex-1 overflow-hidden"
                    onClick={() => onSelectReport(item)}
                  >
                    <h3 className="font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{item.query}</p>
                    <time className="text-xs text-muted-foreground">{formatDate(item.timestamp)}</time>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteReport(item.id);
                    }}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoryPanel; 