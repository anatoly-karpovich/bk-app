import { Navigate, Route, Routes } from "react-router-dom";
import { Box, Container } from "@mui/material";
import AppHeader from "./components/AppHeader";
import JourneyPage from "./features/journey/JourneyPage";

export default function App() {
  return (
    <Box sx={{ minHeight: "100vh", background: "linear-gradient(180deg, #eef2ff 0%, #f8fafc 260px, #f3f4f6 260px)" }}>
      <AppHeader />
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3.5 } }}>
        <Routes>
          <Route path="/" element={<Navigate to="/journey" replace />} />
          <Route path="/journey" element={<JourneyPage />} />
        </Routes>
      </Container>
    </Box>
  );
}
