import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Overview from "@/pages/Overview";
import ZonePlan from "@/pages/ZonePlan";
import SuppliesSummary from "@/pages/SuppliesSummary";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/zone/:zoneId" element={<ZonePlan />} />
        <Route path="/supplies" element={<SuppliesSummary />} />
      </Routes>
    </Router>
  );
}
