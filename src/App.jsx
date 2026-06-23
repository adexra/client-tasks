import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { FinancialProvider } from './context/FinancialContext';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientDetail from './pages/ClientDetail';
import PriorityView from './pages/PriorityView';
import Clients from './pages/Clients';
import Financials from './pages/Financials';
import Account from './pages/Account';
import Auth from './pages/Auth';

const AdPlanning   = lazy(() => import('./pages/AdPlanning'));
const AdPlanView   = lazy(() => import('./pages/AdPlanView'));
const Agents       = lazy(() => import('./pages/Agents'));
const AgentEditor  = lazy(() => import('./pages/AgentEditor'));
const Memory       = lazy(() => import('./pages/Memory'));
const RAG          = lazy(() => import('./pages/RAG'));
const Briefing     = lazy(() => import('./pages/Briefing'));
const Availability = lazy(() => import('./pages/Availability'));
const Weekly       = lazy(() => import('./pages/Weekly'));
const Today        = lazy(() => import('./pages/Today'));
const MoveOn       = lazy(() => import('./pages/MoveOn'));
const Tasks        = lazy(() => import('./pages/Tasks'));
const TasksNew     = lazy(() => import('./pages/TasksNew'));

function PageFallback() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="h-5 w-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  );
}


export default function App() {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <FinancialProvider>
            <BrowserRouter>
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/plan/:id" element={<AdPlanView />} />
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="clients" element={<Clients />} />
                    <Route path="client/:id" element={<ClientDetail />} />
                    <Route path="priority" element={<PriorityView />} />
                    <Route path="financials" element={<Financials />} />
                    <Route path="account" element={<Account />} />
                    <Route path="ads" element={<AdPlanning />} />
                    <Route path="agents" element={<Agents />} />
                    <Route path="agents/:id" element={<AgentEditor />} />
                    <Route path="memory" element={<Memory />} />
                    <Route path="rag" element={<RAG />} />
                    <Route path="briefing/:clientId" element={<Briefing />} />
                    <Route path="settings/availability" element={<Availability />} />
                    <Route path="weekly" element={<Weekly />} />
                    <Route path="today" element={<Today />} />
                    <Route path="moveon" element={<MoveOn />} />
                    <Route path="tasks" element={<Tasks />} />
                    <Route path="tasks/new" element={<TasksNew />} />
                  </Route>
                </Routes>
              </Suspense>
            </BrowserRouter>
          </FinancialProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
}
