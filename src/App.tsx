import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Overview from "@/pages/Overview";
import ZonePlan from "@/pages/ZonePlan";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/zone/:zoneId" element={<ZonePlan />} />
      </Routes>
    </Router>
  );
}
