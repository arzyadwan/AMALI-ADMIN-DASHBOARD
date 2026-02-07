// AMALI-KREDIT Frontend Application
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import POSPage from './pages/POSPage';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import CustomerList from './pages/CustomerList';
import CustomerDetail from './pages/CustomerDetail';
import { CreditCard, LayoutDashboard, Package, Users, History } from 'lucide-react';

function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="bg-white border-b border-gray-100 px-6 h-16 flex items-center justify-between shadow-sm sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <h1 className="text-xl font-black text-blue-600 tracking-tighter flex items-center gap-2">
          <CreditCard className="w-6 h-6 fill-blue-600 text-white" />
          AMALI-KREDIT
        </h1>
        
        <div className="flex gap-1">
          <Link 
            to="/" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === '/' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Kasir POS
          </Link>
          <Link 
            to="/inventory" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === '/inventory' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Package className="w-4 h-4" />
            Inventaris
          </Link>
          <Link 
            to="/customers" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname.startsWith('/customers') 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Users className="w-4 h-4" />
            Pelanggan
          </Link>
          <Link 
            to="/history" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === '/history' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <History className="w-4 h-4" />
            Riwayat
          </Link>
          <Link 
            to="/dashboard" 
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              location.pathname === '/dashboard' 
                ? 'bg-blue-50 text-blue-600' 
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right mr-2">
          <p className="text-xs font-black text-gray-800">Admin Utama</p>
          <p className="text-[10px] text-emerald-500 font-bold">● Online</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
          <LayoutDashboard className="w-5 h-5" />
        </div>
      </div>
    </nav>
  );
}

function AppContent() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<POSPage />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/customers" element={<CustomerList />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/history" element={<div className="p-8 font-black text-gray-400">Transaction History (Coming Soon)</div>} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
