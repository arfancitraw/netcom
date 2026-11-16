import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Overview from './pages/Overview';
import RevenueAnalytics from './pages/RevenueAnalytics';
import AnomalyDetection from './pages/AnomalyDetection';
import UnshippedOrders from './pages/UnshippedOrders';
import CrudManager from './pages/CrudManager';
import ArchitectureDoc from './pages/ArchitectureDoc';
import { RefreshCw } from 'lucide-react';

function DashboardContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('netcom_active_tab') || 'overview';
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('netcom_active_tab', tab);
    setIsMobileNavOpen(false);
  };

  const toggleMobileNav = () => {
    setIsMobileNavOpen((prevState) => !prevState);
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Verifying authorization token...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isMobileNavOpen={isMobileNavOpen}
        toggleMobileNav={toggleMobileNav}
      />
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          isMobileNavOpen={isMobileNavOpen}
          closeMobileNav={closeMobileNav}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'overview' && <Overview />}
            {activeTab === 'daily-revenue' && <RevenueAnalytics />}
            {activeTab === 'anomalies' && <AnomalyDetection />}
            {activeTab === 'unshipped' && <UnshippedOrders />}
            {activeTab === 'crud' && <CrudManager />}
            {activeTab === 'architecture' && <ArchitectureDoc />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}
