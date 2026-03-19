import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { FinancialProvider } from './context/FinancialContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ClientDetail from './pages/ClientDetail';
import PriorityView from './pages/PriorityView';
import Clients from './pages/Clients';
import Financials from './pages/Financials';
import Account from './pages/Account';

export default function App() {
  return (
    <ToastProvider>
      <FinancialProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="client/:id" element={<ClientDetail />} />
              <Route path="priority" element={<PriorityView />} />
              <Route path="financials" element={<Financials />} />
              <Route path="account" element={<Account />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </FinancialProvider>
    </ToastProvider>
  );
}
