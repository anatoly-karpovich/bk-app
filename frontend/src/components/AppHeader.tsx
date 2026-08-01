import { useState } from "react";
import {
  AppBar,
  Box,
  Container,
  Drawer,
  FormControl,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { SxProps, Theme } from "@mui/material/styles";
import CasinoRoundedIcon from "@mui/icons-material/CasinoRounded";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import { NavLink, useLocation } from "react-router-dom";
import type { Project } from "../features/projects/types";
import { appHeaderTexts } from "../texts/appHeaderTexts";
import AppPillButton from "./ui/AppPillButton";
import AppTextInput from "./ui/AppTextInput";

interface NavItem {
  label: string;
  to: string;
  icon: JSX.Element;
  disabled: boolean;
}

interface NavMenuButtonProps {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}

interface AppHeaderProps {
  djName: string;
  onDjNameChange: (nextValue: string) => void;
  projects: Project[];
  selectedProjectId: string;
  onSelectedProjectChange: (nextProjectId: string) => void;
}

const navItems: NavItem[] = [
  {
    label: appHeaderTexts.nav.journey,
    to: "/journey",
    icon: <TravelExploreRoundedIcon />,
    disabled: false,
  },
  {
    label: appHeaderTexts.nav.lotto,
    to: "/lotto",
    icon: <CasinoRoundedIcon />,
    disabled: false,
  },
  {
    label: appHeaderTexts.nav.battleship,
    to: "/battleship",
    icon: <DirectionsBoatRoundedIcon />,
    disabled: false,
  },
  {
    label: appHeaderTexts.nav.project,
    to: "/project",
    icon: <FolderRoundedIcon />,
    disabled: false,
  },
  {
    label: appHeaderTexts.nav.configs,
    to: "/configs",
    icon: <TuneRoundedIcon />,
    disabled: false,
  },
];

function NavMenuButton({ item, active, onClick }: NavMenuButtonProps) {
  const buttonSx: SxProps<Theme> = {
    px: 2,
    minHeight: 40,
    borderRadius: (theme) => theme.customRadii.pill,
    fontWeight: 700,
    justifyContent: "flex-start",
    color: active ? "primary.main" : "text.primary",
    backgroundColor: active ? "rgba(79, 70, 229, 0.10)" : "transparent",
    "&:hover": {
      backgroundColor: active ? "rgba(79, 70, 229, 0.14)" : "rgba(15, 23, 42, 0.04)",
    },
  };

  if (item.disabled) {
    return (
      <AppPillButton disabled startIcon={item.icon} sx={buttonSx}>
        {item.label}
      </AppPillButton>
    );
  }

  return (
    <AppPillButton component={NavLink} to={item.to} startIcon={item.icon} color="inherit" sx={buttonSx} onClick={onClick}>
      {item.label}
    </AppPillButton>
  );
}

export default function AppHeader({
  djName,
  onDjNameChange,
  projects,
  selectedProjectId,
  onSelectedProjectChange,
}: AppHeaderProps) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{
          borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
          backgroundColor: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
          <Toolbar
            disableGutters
            sx={{
              py: { xs: 1.25, md: 1.5 },
              gap: 2,
              alignItems: { xs: "flex-start", xl: "center" },
              justifyContent: "space-between",
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
              <IconButton sx={{ display: { xs: "inline-flex", md: "none" }, mt: 0.25 }} onClick={() => setMobileNavOpen(true)}>
                <MenuRoundedIcon />
              </IconButton>

              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "linear-gradient(135deg, #4f46e5 0%, #0891b2 100%)",
                    color: "white",
                    boxShadow: "0 10px 22px rgba(79, 70, 229, 0.24)",
                    flexShrink: 0,
                  }}
                >
                  <SportsEsportsRoundedIcon />
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                    {appHeaderTexts.brandTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {appHeaderTexts.brandSubtitle}
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", md: "flex" }, flexWrap: "wrap" }}>
                {navItems.map((item) => (
                  <NavMenuButton key={item.to} item={item} active={!item.disabled && location.pathname.startsWith(item.to)} />
                ))}
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={1.5}
              alignItems={{ lg: "center" }}
              sx={{ width: { xs: "100%", xl: "auto" }, maxWidth: { xl: "none" } }}
            >
              <Stack spacing={0.5} sx={{ minWidth: { lg: 280 } }}>
                <Typography variant="caption" color="text.secondary" sx={{ pl: 1.5 }}>
                  {appHeaderTexts.djNameLabel}
                </Typography>
                <AppTextInput
                  size="small"
                  value={djName}
                  onChange={(event) => onDjNameChange(event.target.value)}
                  placeholder={appHeaderTexts.djNamePlaceholder}
                  fullWidth
                />
              </Stack>

              <Stack direction="row" spacing={1} alignItems="flex-end" sx={{ width: { xs: "100%", lg: "auto" } }}>
                <Stack spacing={0.5} sx={{ minWidth: { xs: 0, sm: 220 }, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ pl: 1.5 }}>
                    {appHeaderTexts.projectLabel}
                  </Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedProjectId}
                      onChange={(event: SelectChangeEvent<string>) => onSelectedProjectChange(event.target.value)}
                      sx={{
                        borderRadius: (theme) => theme.customRadii.pill,
                        backgroundColor: "#fff",
                        fontWeight: 700,
                        "& .MuiSelect-select": {
                          py: 1.1,
                        },
                      }}
                    >
                      {!projects.length ? (
                        <MenuItem value="" disabled>
                          Нет проектов
                        </MenuItem>
                      ) : null}
                      {projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="left" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <Box sx={{ width: 280, p: 1.5 }}>
          <Typography variant="subtitle1" sx={{ px: 1.5, py: 1, fontWeight: 700 }}>
            {appHeaderTexts.mobileGamesTitle}
          </Typography>
          <List disablePadding>
            {navItems.map((item) => {
              const active = !item.disabled && location.pathname.startsWith(item.to);

              if (item.disabled) {
                return (
                  <ListItemButton key={item.to} disabled sx={{ borderRadius: (theme) => theme.customRadii.md, mb: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              }

              return (
                <ListItemButton
                  key={item.to}
                  component={NavLink}
                  to={item.to}
                  onClick={() => setMobileNavOpen(false)}
                  sx={{
                    borderRadius: (theme) => theme.customRadii.md,
                    mb: 0.5,
                    backgroundColor: active ? "rgba(79, 70, 229, 0.10)" : "transparent",
                    color: active ? "primary.main" : "text.primary",
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              );
            })}
          </List>
        </Box>
      </Drawer>
    </>
  );
}
