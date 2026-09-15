import React, { useState, useEffect } from 'react';
import { User, PurchaseRequest, SectorType } from './types';
import { storage } from './storage';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { SectorView } from './components/SectorView';
import { PurchasingView } from './components/PurchasingView';
import { MasterDeveloperView } from './components/MasterDeveloperView';
import { RequestModal } from './components/RequestModal';
import { SectorUserManagementModal } from './components/SectorUserManagementModal';
import { PurchasingActionModal } from './components/PurchasingActionModal';
import { OrderDetailsModal } from './components/OrderDetailsModal';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    return storage.getCurrentUser();
  });

  const [masterViewMode, setMasterViewMode] = useState<'console' | 'compras' | 'setor'>('console');
  const [simulatedSector, setSimulatedSector] = useState<SectorType>('Produção');
  const [requestsVersion, setRequestsVersion] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [purchasingEditRequest, setPurchasingEditRequest] = useState<PurchaseRequest | null>(null);

  // Synchronize storage events
  useEffect(() => {
    const handleRequestsUpdate = () => {
      setRequestsVersion(v => v + 1);
      // If modal open, refresh selected request
      setSelectedRequest(prev => {
        if (!prev) return null;
        const all = storage.getAllRequests();
        return all.find(r => r.id === prev.id) || null;
      });
    };

    const handleAuthUpdate = () => {
      setCurrentUser(storage.getCurrentUser());
    };

    window.addEventListener('storage-requests-updated', handleRequestsUpdate);
    window.addEventListener('storage-auth-updated', handleAuthUpdate);

    return () => {
      window.removeEventListener('storage-requests-updated', handleRequestsUpdate);
      window.removeEventListener('storage-auth-updated', handleAuthUpdate);
    };
  }, []);

  const handleLogin = (user: User) => {
    storage.setCurrentUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    storage.setCurrentUser(null);
    setCurrentUser(null);
  };

  const handleSwitchUser = (user: User) => {
    storage.setCurrentUser(user);
    setCurrentUser(user);
    setSelectedRequest(null);
    setPurchasingEditRequest(null);
  };

  const handleRequestCreated = (newReq: PurchaseRequest) => {
    setShowRequestModal(false);
    setRequestsVersion(v => v + 1);
    setSelectedRequest(newReq);
  };

  const handleUserCreated = () => {
    setRequestsVersion(v => v + 1);
  };

  const handlePurchasingSaved = () => {
    setPurchasingEditRequest(null);
    setRequestsVersion(v => v + 1);
    // update open details modal if it was open
    if (selectedRequest && purchasingEditRequest && selectedRequest.id === purchasingEditRequest.id) {
      const all = storage.getAllRequests();
      const updated = all.find(r => r.id === selectedRequest.id);
      if (updated) setSelectedRequest(updated);
    }
  };

  // If user is not logged in, render the login screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isPurchasingSector = currentUser.role === 'compras' || currentUser.sector === 'Compras';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased">
      
      {/* Top Application Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        masterViewMode={masterViewMode}
        onSelectMasterViewMode={setMasterViewMode}
        simulatedSector={simulatedSector}
        onSelectSimulatedSector={setSimulatedSector}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {currentUser.role === 'master' ? (
          <div>
            {masterViewMode === 'console' && (
              <MasterDeveloperView
                currentUser={currentUser}
                onImpersonateUser={handleSwitchUser}
                onOpenManageOrder={(req) => setPurchasingEditRequest(req)}
                onSelectRequest={(req) => setSelectedRequest(req)}
                onOpenNewRequest={() => setShowRequestModal(true)}
                requestsVersion={requestsVersion}
              />
            )}

            {masterViewMode === 'compras' && (
              <div>
                <div className="mb-4 p-3 bg-cyan-900 text-white rounded-xl shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Modo de Visualização Master: <strong>Central de Compras</strong></span>
                  </div>
                  <button
                    onClick={() => setMasterViewMode('console')}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao Console Master</span>
                  </button>
                </div>
                <PurchasingView
                  currentUser={currentUser}
                  onOpenManageOrder={(req) => setPurchasingEditRequest(req)}
                  onSelectRequest={(req) => setSelectedRequest(req)}
                  requestsVersion={requestsVersion}
                />
              </div>
            )}

            {masterViewMode === 'setor' && (
              <div>
                <div className="mb-4 p-3 bg-indigo-900 text-white rounded-xl shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Modo de Visualização Master: Gestor do Setor <strong>{simulatedSector}</strong></span>
                  </div>
                  <button
                    onClick={() => setMasterViewMode('console')}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Voltar ao Console Master</span>
                  </button>
                </div>
                <SectorView
                  currentUser={{ ...currentUser, sector: simulatedSector, role: 'gestor' }}
                  onOpenNewRequest={() => setShowRequestModal(true)}
                  onOpenManageUsers={() => setShowUserModal(true)}
                  onSelectRequest={(req) => setSelectedRequest(req)}
                  requestsVersion={requestsVersion}
                />
              </div>
            )}
          </div>
        ) : isPurchasingSector ? (
          /* Third Screen: Specialized Purchasing Division View (Receives all sectors) */
          <PurchasingView
            currentUser={currentUser}
            onOpenManageOrder={(req) => setPurchasingEditRequest(req)}
            onSelectRequest={(req) => setSelectedRequest(req)}
            requestsVersion={requestsVersion}
          />
        ) : (
          /* Sector View: For the 9 specific areas (Produção, Fiscal, Financeiro, RH, EHS, etc.) */
          <SectorView
            currentUser={currentUser}
            onOpenNewRequest={() => setShowRequestModal(true)}
            onOpenManageUsers={() => setShowUserModal(true)}
            onSelectRequest={(req) => setSelectedRequest(req)}
            requestsVersion={requestsVersion}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Sistema Integrado de Compras Corporativas e Gestão Setorial</span>
          <span className="text-slate-400">Ambiente em Tempo Real • 9 Setores Conectados</span>
        </div>
      </footer>

      {/* Modal: Create Purchase Request */}
      {showRequestModal && (
        <RequestModal
          currentUser={currentUser}
          onClose={() => setShowRequestModal(false)}
          onRequestCreated={handleRequestCreated}
        />
      )}

      {/* Modal: Sector Manager Adding Users */}
      {showUserModal && (currentUser.role === 'gestor' || currentUser.role === 'master') && (
        <SectorUserManagementModal
          manager={currentUser.role === 'master' ? { ...currentUser, sector: simulatedSector, role: 'gestor' } : currentUser}
          onClose={() => setShowUserModal(false)}
          onUserCreated={handleUserCreated}
        />
      )}

      {/* Modal: Order Details & Manager Approval */}
      {selectedRequest && (
        <OrderDetailsModal
          request={selectedRequest}
          currentUser={currentUser}
          onClose={() => setSelectedRequest(null)}
          onStatusChanged={() => {
            setRequestsVersion(v => v + 1);
            const all = storage.getAllRequests();
            const updated = all.find(r => r.id === selectedRequest.id);
            setSelectedRequest(updated || null);
          }}
          onOpenPurchasingEdit={(req) => {
            setSelectedRequest(null);
            setPurchasingEditRequest(req);
          }}
        />
      )}

      {/* Modal: Purchasing Team Setting Purchase Value, PO, Supplier, Dates & Status */}
      {purchasingEditRequest && (
        <PurchasingActionModal
          request={purchasingEditRequest}
          buyer={currentUser}
          onClose={() => setPurchasingEditRequest(null)}
          onSave={handlePurchasingSaved}
        />
      )}

    </div>
  );
}
