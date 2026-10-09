import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MapPage from "./pages/MapPage";
import AdminPage from "./pages/AdminPage";

export default function App() {
  return (
    <Router>
      <div className="h-screen w-full overflow-hidden">
        <Routes>
          <Route path="/" element={<MapPage />} />

          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </div>
    </Router>
  );
}
