import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface ProgressItem {
  message: string;
  done: boolean;
}

interface ResearchTabProps {
  tabId: string;
}

interface WebSocketMessage {
  session_id: string;
  type: 'progress' | 'complete';
  item?: string;
  message?: string;
  is_done?: boolean;
  report?: string;
}

const ResearchTab: React.FC<ResearchTabProps> = ({ tabId }) => {
  const [query, setQuery] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [report, setReport] = useState<string>('');
  
  const submitQuery = async () => {
    if (!query.trim()) return;
    
    setStatus('processing');
    setProgress([{ message: 'Starting research...', done: false }]);
    
    try {
      await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, session_id: tabId }),
      });
      
      // Connect to WebSocket for progress updates
      const ws = new WebSocket(`ws://${window.location.host}/ws/${tabId}`);
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data) as WebSocketMessage;
        if (data.session_id === tabId) {
          updateProgress(data);
        }
      };
    } catch (error) {
      console.error('Error:', error);
      setStatus('error');
    }
  };
  
  const updateProgress = (data: WebSocketMessage) => {
    if (data.type === 'progress' && data.message) {
      setProgress(prev => [...prev, { message: data.message!, done: data.is_done || false }]);
    }
    else if (data.type === 'complete' && data.report) {
      setStatus('complete');
      setReport(data.report);
    }
  };
  
  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What would you like to research?"
          className="w-full p-2 border rounded"
          disabled={status === 'processing'}
        />
        <button
          onClick={submitQuery}
          disabled={status === 'processing' || !query.trim()}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
        >
          {status === 'processing' ? 'Processing...' : 'Research'}
        </button>
      </div>
      
      {status !== 'idle' && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Progress</h3>
          <ul className="mt-2">
            {progress.map((item, index) => (
              <li key={index} className="flex items-center">
                {item.done ? '✓' : '⟳'} {item.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {report && (
        <div className="mt-4">
          <h3 className="text-lg font-bold">Research Report</h3>
          <div className="p-4 border rounded bg-gray-50">
            <ReactMarkdown>{report}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchTab; 