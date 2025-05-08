'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ResearchTab from '../components/ResearchTab';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Clock, Trash2 } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStoredReports, deleteReport } from '@/utils/storage';

export interface TabData {
  id: string;
  type: 'research' | 'history';
  query?: string;
  status?: 'idle' | 'processing' | 'complete' | 'error';
  report?: ReportHistory;
}

export interface ReportHistory {
  id: string;
  title: string;
  query: string;
  report: string;
  timestamp: number;
}

export default function Home() {
  const initialTabId = uuidv4();
  const [tabs, setTabs] = useState<TabData[]>([{ id: initialTabId, type: 'research' }]);
  const [activeTab, setActiveTab] = useState<string>(initialTabId);
  const [history, setHistory] = useState<ReportHistory[]>([]);

  // Load history on initial render
  useEffect(() => {
    setHistory(getStoredReports());
  }, []);

  // Refresh history periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setHistory(getStoredReports());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const addNewTab = () => {
    const newId = uuidv4();
    setTabs([...tabs, { id: newId, type: 'research' }]);
    setActiveTab(newId);
  };

  const addHistoryTab = () => {
    // Check if history tab already exists
    const historyTab = tabs.find(tab => tab.type === 'history');
    
    if (historyTab) {
      // If it exists, switch to it
      setActiveTab(historyTab.id);
    } else {
      // Otherwise create a new history tab
      const newId = uuidv4();
      setTabs([...tabs, { id: newId, type: 'history' }]);
      setActiveTab(newId);
    }
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0].id);
    }
  };

  const handleSelectReport = (report: ReportHistory) => {
    // Always open in a new tab
    const newId = uuidv4();
    setTabs([...tabs, { 
      id: newId, 
      type: 'research',
      query: report.query, 
      status: 'complete', 
      report 
    }]);
    setActiveTab(newId);
  };

  const handleDeleteReport = (id: string) => {
    deleteReport(id);
    setHistory(prev => prev.filter(item => item.id !== id));
    
    // Also close any tabs displaying this report
    const affectedTabs = tabs.filter(tab => tab.report?.id === id);
    if (affectedTabs.length > 0) {
      const updatedTabs = tabs.map(tab => {
        if (tab.report?.id === id) {
          return { ...tab, report: undefined, status: 'idle' as const };
        }
        return tab;
      });
      setTabs(updatedTabs);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  // Function to display tab name
  const getTabName = (tab: TabData) => {
    if (tab.type === 'history') return 'History';
    if (tab.report?.title) {
      return tab.report.title.length > 15 ? 
        tab.report.title.substring(0, 15) + '...' : 
        tab.report.title;
    }
    return 'New Research';
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Research Assistant</h1>
      </div>
      
      <div className="flex border-b">
        <div className="flex flex-wrap gap-1">
          {tabs.map(tab => (
            <div
              key={tab.id}
              className={`px-4 py-2 rounded-t-lg cursor-pointer flex items-center gap-2 
                ${activeTab === tab.id 
                  ? 'bg-primary text-primary-foreground border-b-0' 
                  : 'bg-muted hover:bg-muted/80'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{getTabName(tab)}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-5 w-5 p-0 rounded-full"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
              >
                ×
              </Button>
            </div>
          ))}
          <div className="flex ml-1">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-7 w-7 p-0"
              onClick={addNewTab}
              title="New Research Tab"
            >
              +
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full h-7 w-7 p-0 ml-1"
              onClick={addHistoryTab}
              title="History"
            >
              <Clock className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <Card className="p-4">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            {tab.type === 'research' ? (
              <ResearchTab tabId={tab.id} initialReport={tab.report} />
            ) : (
              <div className="w-full">
                <h2 className="text-xl font-semibold mb-4">Research History</h2>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No research history yet</p>
                ) : (
                  <ScrollArea className="h-[70vh]">
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div 
                          key={item.id}
                          className="flex justify-between items-center p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
                        >
                          <div 
                            className="flex-1 overflow-hidden"
                            onClick={() => handleSelectReport(item)}
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
                              handleDeleteReport(item.id);
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
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
} 