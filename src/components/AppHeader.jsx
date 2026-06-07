import { AppBar, Box, Button, Container, Stack, Toolbar, Typography } from "@mui/material";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Карта Мародёров",
    to: "/journey",
  },
];

export default function AppHeader() {
  return (
    <AppBar position="sticky" color="inherit" elevation={0} sx={{ borderBottom: "1px solid rgba(15, 23, 42, 0.08)" }}>
      <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
        <Toolbar disableGutters sx={{ py: 1.5, gap: 3, justifyContent: "space-between" }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 3,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)",
                color: "white",
              }}
            >
              <SportsEsportsRoundedIcon />
            </Box>
            <Box>
              <Typography variant="h6">Combats DJ</Typography>
              <Typography variant="body2" color="text.secondary">
                Форумные игры на React
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {navItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                color="inherit"
                startIcon={<TravelExploreRoundedIcon />}
                sx={{
                  px: 2,
                  fontWeight: 600,
                  "&.active": {
                    color: "primary.main",
                    backgroundColor: "rgba(79, 70, 229, 0.08)",
                  },
                }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
