'use client';

import { useState } from 'react';
import ResearchTab from '../components/ResearchTab';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface TabData {
  id: string;
  query: string;
  status: 'idle' | 'processing' | 'complete' | 'error';
}

export default function Home() {
  const [tabs, setTabs] = useState<TabData[]>([{ id: '1', query: '', status: 'idle' }]);
  const [activeTab, setActiveTab] = useState<string>('1');

  const addNewTab = () => {
    const newId = (tabs.length + 1).toString();
    setTabs([...tabs, { id: newId, query: '', status: 'idle' }]);
    setActiveTab(newId);
  };

  const closeTab = (id: string) => {
    if (tabs.length === 1) return;
    const newTabs = tabs.filter(tab => tab.id !== id);
    setTabs(newTabs);
    if (activeTab === id) {
      setActiveTab(newTabs[0].id);
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <h1 className="text-3xl font-bold">Research Assistant</h1>
      
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
              <span>Research {tab.id}</span>
              {tabs.length > 1 && (
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
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="rounded-full h-7 w-7 p-0 ml-1"
            onClick={addNewTab}
          >
            +
          </Button>
        </div>
      </div>
      
      <Card className="p-4">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            <ResearchTab tabId={tab.id} />
          </div>
        ))}
      </Card>
    </div>
  );
} 