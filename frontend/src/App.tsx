import { Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import ScanProgressPage from "./pages/ScanProgress";
import Results from "./pages/Results";
import Reports from "./pages/Reports";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan/:jobId" element={<ScanProgressPage />} />
        <Route path="/results/:reportId" element={<Results />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Layout>
  );
}
