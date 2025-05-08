import { ReportHistory } from '@/components/HistoryPanel';

const STORAGE_KEY = 'research_history';

export const getStoredReports = (): ReportHistory[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error retrieving stored reports:', error);
    return [];
  }
};

export const saveReport = (report: ReportHistory): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const reports = getStoredReports();
    // Remove any existing report with the same ID
    const filteredReports = reports.filter(r => r.id !== report.id);
    // Add the new report to the beginning
    const updatedReports = [report, ...filteredReports];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReports));
  } catch (error) {
    console.error('Error saving report:', error);
  }
};

export const deleteReport = (id: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const reports = getStoredReports();
    const updatedReports = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedReports));
  } catch (error) {
    console.error('Error deleting report:', error);
  }
}; 