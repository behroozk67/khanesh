import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./Landing";
import Tafsir from "./Tafsir";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Tafsir />} />
      </Routes>
    </BrowserRouter>
  );
}