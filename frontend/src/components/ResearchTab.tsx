'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronsUpDown, SendHorizontal, LoaderCircle } from "lucide-react";
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
  type: 'progress' | 'complete' | 'clarification_request';
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
  const [isProgressOpen, setIsProgressOpen] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Add new state for clarification UI
  const [showClarificationDialog, setShowClarificationDialog] = useState<boolean>(false);
  const [clarificationQuestion, setClarificationQuestion] = useState<string>('');
  const [clarificationResponse, setClarificationResponse] = useState<string>('');
  
  // Add a new state to track when a clarification is pending
  const [isPendingClarification, setIsPendingClarification] = useState<boolean>(false);
  
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
            if (data.type === 'clarification_request') {
              // Handle clarification request
              handleClarificationRequest(data.message || 'Can you provide more information?');
            } else if (data.type === 'progress' && data.item === 'clarification') {
              // Handle clarification-related progress updates
              setProgress(prev => {
                const existingItemIndex = prev.findIndex(p => p.item === 'clarification');
                if (existingItemIndex >= 0) {
                  const updated = [...prev];
                  updated[existingItemIndex] = { 
                    message: data.message!,
                    done: data.is_done || false,
                    item: 'clarification'
                  };
                  return updated;
                } else {
                  return [...prev, { 
                    message: data.message!,
                    done: data.is_done || false,
                    item: 'clarification'
                  }];
                }
              });
              
              // Update the pending clarification state based on the message
              if (data.is_done && data.message?.includes('Received user clarification')) {
                setIsPendingClarification(false);
              }
            } else {
              updateProgress(data);
            }
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
  
  const handleClarificationRequest = (question: string) => {
    // Show the clarification dialog
    setClarificationQuestion(question);
    setShowClarificationDialog(true);
    setIsPendingClarification(true);
    
    // Add to progress
    setProgress(prev => [...prev, { 
      message: `Agent is asking for clarification...`,
      done: false,
      item: 'clarification_request'
    }]);
  };
  
  const submitClarification = () => {
    if (!clarificationResponse.trim()) return;
    
    // Send the clarification response via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'clarification_response',
        session_id: tabId,
        text: clarificationResponse
      }));
      
      // Add to progress
      setProgress(prev => [...prev, { 
        message: `Your response: ${clarificationResponse}`,
        done: true,
        item: 'clarification_response'
      }]);
      
      // Reset clarification UI
      setShowClarificationDialog(false);
      setClarificationResponse('');
      setIsPendingClarification(false);
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
  
  const handleClarificationKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitClarification();
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
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {isPendingClarification && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4 rounded-r">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-amber-400">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                The research agent needs your input to continue. Please check the clarification dialog.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {status === 'processing' && (
        <Card>
            <Collapsible open={isProgressOpen} onOpenChange={setIsProgressOpen}>
              <CollapsibleTrigger className="w-full">
                <Button variant="ghost" className="w-full">
                  <div className="text-left">Thinking...</div>
                  <ChevronsUpDown className="h-4 w-4 ml-auto" />
                </Button>
              </CollapsibleTrigger>
            <CollapsibleContent>
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
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
      
      {/* Clarification Dialog */}
      <Dialog open={showClarificationDialog} onOpenChange={(open) => {
        // Prevent users from manually closing the dialog - they must respond
        if (!open && showClarificationDialog) {
          return;
        }
        setShowClarificationDialog(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Clarification Needed</DialogTitle>
            <DialogDescription>
              The research agent needs additional information to continue.
            </DialogDescription>
          </DialogHeader>
          <div className="p-4 my-3 bg-muted rounded-lg text-sm whitespace-pre-line">
            {clarificationQuestion}
          </div>
          <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Input
              type="text"
              value={clarificationResponse}
              onChange={(e) => setClarificationResponse(e.target.value)}
              onKeyDown={handleClarificationKeyPress}
              placeholder="Type your response..."
              className="flex-1"
              autoFocus
            />
            <Button 
              onClick={submitClarification}
              disabled={!clarificationResponse.trim()}
              className="sm:w-auto w-full"
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {report && <MarkdownReport markdown={report} />}
    </div>
  );
};

export default ResearchTab; 