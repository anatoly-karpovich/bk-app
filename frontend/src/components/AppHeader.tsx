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
  Menu,
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
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import { NavLink, useLocation } from "react-router-dom";
import type { Project } from "../features/projects/types";
import { navigationGroups, type NavigationGroupId, type NavigationItemKey } from "../navigation";
import { appHeaderTexts } from "../texts/appHeaderTexts";
import AppPillButton from "./ui/AppPillButton";
import type { CurrentUser } from "../features/auth/types";
import AccountDialog from "../features/auth/AccountDialog";

interface AppHeaderProps {
  user: CurrentUser;
  onLogout: () => Promise<void>;
  projects: Project[];
  selectedProjectId: string;
  onSelectedProjectChange: (nextProjectId: string) => void;
}

const navigationItemIcons: Record<NavigationItemKey, JSX.Element> = {
  journey: <TravelExploreRoundedIcon />,
  lotto: <CasinoRoundedIcon />,
  battleship: <DirectionsBoatRoundedIcon />,
  project: <FolderRoundedIcon />,
  configs: <TuneRoundedIcon />,
  users: <PeopleAltRoundedIcon />,
};

const navigationGroupIcons: Record<NavigationGroupId, JSX.Element> = {
  games: <SportsEsportsRoundedIcon />,
  settings: <TuneRoundedIcon />,
};

function isGroupActive(groupId: NavigationGroupId, pathname: string): boolean {
  return navigationGroups.find((group) => group.id === groupId)?.items.some((item) => pathname.startsWith(item.to)) ?? false;
}

export default function AppHeader({
  user,
  onLogout,
  projects,
  selectedProjectId,
  onSelectedProjectChange,
}: AppHeaderProps) {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openGroupId, setOpenGroupId] = useState<NavigationGroupId | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const openGroup = navigationGroups.find((group) => group.id === openGroupId) ?? null;
  const visibleNavigationGroups = navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.key !== "users" || user.role === "admin") }))
    .filter((group) => group.items.length > 0);

  function openNavigationMenu(groupId: NavigationGroupId, anchor: HTMLElement) {
    setOpenGroupId(groupId);
    setMenuAnchor(anchor);
  }

  function closeNavigationMenu() {
    setOpenGroupId(null);
    setMenuAnchor(null);
  }

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
                {visibleNavigationGroups.map((group) => {
                  const active = isGroupActive(group.id, location.pathname);

                  return (
                    <AppPillButton
                      key={group.id}
                      color="inherit"
                      startIcon={navigationGroupIcons[group.id]}
                      endIcon={<ExpandMoreRoundedIcon />}
                      aria-haspopup="menu"
                      aria-expanded={openGroupId === group.id ? "true" : undefined}
                      onClick={(event) => openNavigationMenu(group.id, event.currentTarget)}
                      sx={{
                        px: 2,
                        minHeight: 40,
                        borderRadius: (theme) => theme.customRadii.pill,
                        fontWeight: 700,
                        color: active ? "primary.main" : "text.primary",
                        backgroundColor: active ? "rgba(79, 70, 229, 0.10)" : "transparent",
                        "&:hover": { backgroundColor: active ? "rgba(79, 70, 229, 0.14)" : "rgba(15, 23, 42, 0.04)" },
                      }}
                    >
                      {group.label}
                    </AppPillButton>
                  );
                })}
              </Stack>
            </Stack>

            <Stack
              direction={{ xs: "column", lg: "row" }}
              spacing={1.5}
              alignItems={{ lg: "center" }}
              sx={{ width: { xs: "100%", xl: "auto" }, maxWidth: { xl: "none" } }}
            >
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
                <Stack spacing={0.25} sx={{ minWidth: 140, pb: 0.5 }}>
                  <Typography fontWeight={700} noWrap>{user.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.role === "admin" ? "Администратор" : "Ведущий"}</Typography>
                  <MenuItem component="button" onClick={() => setAccountOpen(true)} sx={{ minHeight: 28, px: 0, color: "text.secondary" }}><ManageAccountsRoundedIcon fontSize="small" sx={{ mr: 0.5 }} />Учётная запись</MenuItem>
                  <MenuItem component="button" onClick={onLogout} sx={{ minHeight: 28, px: 0, color: "text.secondary" }}>Выйти</MenuItem>
                </Stack>
              </Stack>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(openGroup)}
        onClose={closeNavigationMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        PaperProps={{ sx: { mt: 0.75, minWidth: 240, borderRadius: (theme) => theme.customRadii.md } }}
      >
        {openGroup?.items.filter((item) => item.key !== "users" || user.role === "admin").map((item) => (
          <MenuItem
            key={item.to}
            component={NavLink}
            to={item.to}
            selected={location.pathname.startsWith(item.to)}
            onClick={closeNavigationMenu}
            sx={{ py: 1.1, pr: 2.5, fontWeight: 600 }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>{navigationItemIcons[item.key]}</ListItemIcon>
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}
      </Menu>

      <Drawer anchor="left" open={mobileNavOpen} onClose={() => setMobileNavOpen(false)}>
        <Box sx={{ width: 280, p: 1.5 }}>
          {visibleNavigationGroups.map((group) => (
            <Box key={group.id} sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ px: 1.5, py: 1, fontWeight: 700 }}>
                {group.label}
              </Typography>
              <List disablePadding>
                {group.items.map((item) => {
                  const active = location.pathname.startsWith(item.to);

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
                      <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>{navigationItemIcons[item.key]}</ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>
      <AccountDialog open={accountOpen} selectedProject={projects.find((project) => project.id === selectedProjectId) ?? null} onClose={() => setAccountOpen(false)} onPasswordChanged={onLogout} />
    </>
  );
}
