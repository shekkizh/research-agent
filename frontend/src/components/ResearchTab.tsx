'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import MarkdownReport from './MarkdownReport';
import { saveReport } from '@/utils/storage';
import { ReportHistory } from '@/app/page';

interface ProgressItem {
  message: string;
  done: boolean;
  item?: string;
}

interface ResearchTabProps {
  tabId: string;
  initialReport?: ReportHistory;
}

interface WebSocketMessage {
  session_id: string;
  type: 'progress' | 'complete';
  item?: string;
  message?: string;
  is_done?: boolean;
  report?: string;
}

const ResearchTab: React.FC<ResearchTabProps> = ({ tabId, initialReport }) => {
  const [query, setQuery] = useState<string>(initialReport?.query || '');
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>(initialReport ? 'complete' : 'idle');
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [report, setReport] = useState<string>(initialReport?.report || '');
  const [title, setTitle] = useState<string>('');
  const wsRef = useRef<WebSocket | null>(null);
  
  // Initialize from history if provided
  useEffect(() => {
    if (initialReport) {
      setQuery(initialReport.query);
      setReport(initialReport.report);
      setStatus('complete');
    }
  }, [initialReport]);
  
  // Close WebSocket on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);
  
  const submitQuery = async () => {
    if (!query.trim()) return;
    
    setStatus('processing');
    setProgress([{ message: 'Starting research...', done: false }]);
    
    try {
      // Close any existing WebSocket connection
      if (wsRef.current) {
        wsRef.current.close();
      }
      
      // Connect directly to the backend WebSocket
      const backendWsUrl = `ws://localhost:8000/ws/${tabId}`;
      const ws = new WebSocket(backendWsUrl);
      wsRef.current = ws;
      
      ws.onopen = async () => {
        console.log('WebSocket connected, sending research request');
        // Make the API request after WebSocket is connected
        try {
          await fetch('/api/research', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: query, session_id: tabId }),
          });
        } catch (error) {
          console.error('API request error:', error);
          setStatus('error');
        }
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          if (data.session_id === tabId) {
            updateProgress(data);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed');
      };
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    }
  };
  
  const updateProgress = (data: WebSocketMessage) => {
    console.log('Received update:', data);
    if (data.type === 'progress' && data.message) {
      if (data.item) {
        setProgress(prev => {
          const existingItemIndex = prev.findIndex(p => p.item === data.item);
          if (existingItemIndex >= 0) {
            const updated = [...prev];
            updated[existingItemIndex] = { 
              message: data.message!,
              done: data.is_done || false,
              item: data.item
            };
            return updated;
          } else {
            return [...prev, { 
              message: data.message!,
              done: data.is_done || false,
              item: data.item
            }];
          }
        });
      } else {
        setProgress(prev => [...prev, { 
          message: data.message!,
          done: data.is_done || false
        }]);
      }
    }
    else if (data.type === 'complete' && data.report) {
      setStatus('complete');
      setReport(data.report);
      
      // Extract a title from the report (first h1 title)
      const titleMatch = data.report.match(/^# (.+)$/m);
      const extractedTitle = titleMatch ? titleMatch[1] : `Research ${new Date().toLocaleString()}`;
      setTitle(extractedTitle);
      
      // Save to history
      const historyItem: ReportHistory = {
        id: `${Date.now()}`,
        title: extractedTitle,
        query: query,
        report: data.report,
        timestamp: Date.now()
      };
      saveReport(historyItem);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitQuery();
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="What would you like to research?"
            disabled={status === 'processing'}
            className="pr-10"
          />
          <Button
            onClick={submitQuery}
            disabled={status === 'processing' || !query.trim()}
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            aria-label="Send"
          >
            {status === 'processing' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <svg 
                width="15" 
                height="15" 
                viewBox="0 0 15 15" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  d="M1.20308 1.04312C1.00481 0.954998 0.772341 1.0048 0.627577 1.16641C0.482813 1.32802 0.458794 1.56455 0.568117 1.75196L3.92115 7.50002L0.568117 13.2481C0.458794 13.4355 0.482813 13.672 0.627577 13.8336C0.772341 13.9952 1.00481 14.045 1.20308 13.9569L14.7031 7.95693C14.8836 7.87668 15 7.69762 15 7.50002C15 7.30243 14.8836 7.12337 14.7031 7.04312L1.20308 1.04312ZM4.84553 7.10002L2.21234 2.586L13.2689 7.50002L2.21234 12.414L4.84552 7.90002H9C9.22092 7.90002 9.4 7.72094 9.4 7.50002C9.4 7.27911 9.22092 7.10002 9 7.10002H4.84553Z" 
                  fill="currentColor" 
                  fillRule="evenodd" 
                  clipRule="evenodd"
                />
              </svg>
            )}
          </Button>
        </div>
      </div>
      
      {status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {progress.map((item, index) => (
                <div key={index} className="mb-3 pb-3 border-b last:border-b-0 last:pb-0">
                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5">{item.done ? '✅' : '🔄'}</span>
                    <div>
                      {item.item && (
                        <span className="text-sm text-muted-foreground mr-2">
                          [{item.item}]
                        </span>
                      )}
                      <span>{item.message}</span>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {report && <MarkdownReport markdown={report} />}
    </div>
  );
};

export default ResearchTab; 