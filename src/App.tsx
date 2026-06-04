import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Overview from "@/pages/Overview";
import ZonePlan from "@/pages/ZonePlan";
import SuppliesSummary from "@/pages/SuppliesSummary";
import { useVenueStore } from '@/store/venueStore'

export default function App() {
  const ensureActivityLogMigration = useVenueStore((s) => s.ensureActivityLogMigration)
  const ensureZoneLayouts = useVenueStore((s) => s.ensureZoneLayouts)

  useEffect(() => {
    ensureActivityLogMigration()
    ensureZoneLayouts()
  }, [ensureActivityLogMigration, ensureZoneLayouts])

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
