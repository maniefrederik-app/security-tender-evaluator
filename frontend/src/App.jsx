import { Routes, Route } from 'react-router-dom';
import StartPage from './pages/StartPage';
import HomePage from './pages/HomePage';
import InitialDataEntry from './pages/InitialDataEntry';
import SummaryReport from './pages/SummaryReport';
import Evaluators from './pages/Evaluators';
import TenderDocument from './pages/TenderDocument';
import PricingSchedule from './pages/PricingSchedule';
import GuardingPersonnel from './pages/assess/GuardingPersonnel';
import ContractManagement from './pages/assess/ContractManagement';
import ContractInfrastructure from './pages/assess/ContractInfrastructure';
import TheCompany from './pages/assess/TheCompany';
import Help from './pages/Help';

function App() {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/app" element={<HomePage />} />
      <Route path="/evaluators" element={<Evaluators />} />
      <Route path="/initial-data" element={<InitialDataEntry />} />
      <Route path="/summary" element={<SummaryReport />} />
      <Route path="/assess/guarding" element={<GuardingPersonnel />} />
      <Route path="/assess/contract" element={<ContractManagement />} />
      <Route path="/assess/infra" element={<ContractInfrastructure />} />
      <Route path="/assess/company" element={<TheCompany />} />
      <Route path="/help" element={<Help />} />
      <Route path="/tender-document" element={<TenderDocument />} />
      <Route path="/pricing-schedule" element={<PricingSchedule />} />
    </Routes>
  );
}

export default App;

