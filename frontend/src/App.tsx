import { useState } from 'react';
import ResearchTab from './components/ResearchTab';

interface TabData {
  id: string;
  query: string;
  status: 'idle' | 'processing' | 'complete' | 'error';
}

function App() {
  const [tabs, setTabs] = useState<TabData[]>([{ id: '1', query: '', status: 'idle' }]);
  const [activeTab, setActiveTab] = useState<string>('1');

  const addNewTab = () => {
    const newId = String(Date.now());
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
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Research Assistant</h1>
      
      <div className="flex border-b">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`px-4 py-2 cursor-pointer ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveTab(tab.id)}
          >
            Research {tab.id}
            {tabs.length > 1 && <button className="ml-2" onClick={(e) => {e.stopPropagation(); closeTab(tab.id);}}>×</button>}
          </div>
        ))}
        <button className="px-4 py-2 bg-green-500 text-white" onClick={addNewTab}>+</button>
      </div>
      
      <div className="mt-4">
        {tabs.map(tab => (
          <div key={tab.id} className={activeTab === tab.id ? 'block' : 'hidden'}>
            <ResearchTab tabId={tab.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App; 