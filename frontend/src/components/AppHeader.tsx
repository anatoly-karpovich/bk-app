import { useState } from "react";
import {
  AppBar,
  Avatar,
  Box,
  Container,
  Divider,
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
import ConfirmationNumberRoundedIcon from "@mui/icons-material/ConfirmationNumberRounded";
import DirectionsBoatRoundedIcon from "@mui/icons-material/DirectionsBoatRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FolderRoundedIcon from "@mui/icons-material/FolderRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import SportsEsportsRoundedIcon from "@mui/icons-material/SportsEsportsRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import TravelExploreRoundedIcon from "@mui/icons-material/TravelExploreRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import QuizRoundedIcon from "@mui/icons-material/QuizRounded";
import AssessmentRoundedIcon from "@mui/icons-material/AssessmentRounded";
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
  lottoBingo: <ConfirmationNumberRoundedIcon />,
  battleship: <DirectionsBoatRoundedIcon />,
  project: <FolderRoundedIcon />,
  configs: <TuneRoundedIcon />,
  quizConfigs: <QuizRoundedIcon />,
  users: <PeopleAltRoundedIcon />,
  quizzes: <QuizRoundedIcon />,
  analytics: <AssessmentRoundedIcon />,
};

const navigationGroupIcons: Record<NavigationGroupId, JSX.Element> = {
  games: <SportsEsportsRoundedIcon />,
  settings: <TuneRoundedIcon />,
  quizzes: <QuizRoundedIcon />,
  analytics: <AssessmentRoundedIcon />,
};

function isGroupActive(groupId: NavigationGroupId, pathname: string): boolean {
  return (
    navigationGroups.find((group) => group.id === groupId)?.items.some((item) => pathname.startsWith(item.to)) ?? false
  );
}

function getUserInitials(displayName: string): string {
  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase())
    .join("");

  return initials || "DJ";
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
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<HTMLElement | null>(null);
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
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

  function closeAccountMenu() {
    setAccountMenuAnchor(null);
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
              minHeight: { xs: 64, md: 92 },
              py: { xs: 1, md: 1.5 },
              gap: { xs: 1, md: 2 },
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: { xs: "nowrap", md: "wrap" },
            }}
          >
            <Stack direction="row" spacing={{ xs: 1, md: 2 }} alignItems="center" sx={{ minWidth: 0, flexShrink: 0 }}>
              <IconButton
                sx={{ display: { xs: "inline-flex", md: "none" }, mt: 0.25 }}
                onClick={() => setMobileNavOpen(true)}
              >
                <MenuRoundedIcon />
              </IconButton>

              <Box
                component={NavLink}
                to="/"
                aria-label="На главную"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  minWidth: 0,
                  color: "text.primary",
                  textDecoration: "none",
                }}
              >
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
                    textDecoration: "none",
                  }}
                >
                  <SportsEsportsRoundedIcon />
                </Box>

                <Box sx={{ minWidth: 0, display: { xs: "none", md: "block" } }}>
                  <Typography variant="h6" sx={{ lineHeight: 1.1 }}>
                    {appHeaderTexts.brandTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {appHeaderTexts.brandSubtitle}
                  </Typography>
                </Box>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ display: { xs: "none", md: "flex" }, flexWrap: "wrap" }}
              >
                {visibleNavigationGroups.map((group) => {
                  const active = isGroupActive(group.id, location.pathname);
                  const directItem = group.items.length === 1 ? group.items[0] : null;

                  if (directItem?.label === group.label) {
                    return (
                      <AppPillButton
                        key={group.id}
                        component={NavLink}
                        to={directItem.to}
                        color="inherit"
                        startIcon={navigationGroupIcons[group.id]}
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
                  }

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

            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "center", md: "flex-end" },
                justifyContent: { xs: "flex-end", xl: "initial" },
                gap: { xs: 1, md: 1.5 },
                width: { xs: "auto", md: "100%", xl: "auto" },
                flex: { xs: 1, md: "initial" },
                minWidth: 0,
                ml: { xl: "auto" },
              }}
            >
              <Stack
                spacing={0.5}
                sx={{
                  minWidth: { xs: 0, sm: 220 },
                  flex: { xs: 1, xl: "initial" },
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ display: { xs: "none", md: "block" }, pl: 1.5 }}>
                  {appHeaderTexts.projectLabel}
                </Typography>
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedProjectId}
                    onChange={(event: SelectChangeEvent<string>) => onSelectedProjectChange(event.target.value)}
                    inputProps={{ "aria-label": appHeaderTexts.projectLabel }}
                    sx={{
                      borderRadius: (theme) => theme.customRadii.pill,
                      backgroundColor: "#fff",
                      fontWeight: 700,
                      "& .MuiSelect-select": { py: 1.1, overflow: "hidden", textOverflow: "ellipsis" },
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

              <Box sx={{ position: "relative" }}>
                <Box
                  component="button"
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={Boolean(accountMenuAnchor)}
                  onClick={(event) => setAccountMenuAnchor(event.currentTarget)}
                  sx={{
                    height: 44,
                    minWidth: 242,
                    px: 1.5,
                    pl: 0.875,
                    border: "1px solid transparent",
                    borderRadius: (theme) => theme.customRadii.pill,
                    backgroundColor: "rgba(15, 23, 42, 0.035)",
                    color: "text.primary",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.25,
                    cursor: "pointer",
                    transition: "background-color .16s ease, border-color .16s ease, box-shadow .16s ease",
                    "&:hover": { backgroundColor: "rgba(15, 23, 42, 0.065)" },
                    "&[aria-expanded=true]": {
                      backgroundColor: "#fff",
                      borderColor: "rgba(79, 70, 229, 0.28)",
                      boxShadow: "0 0 0 3px rgba(79, 70, 229, 0.10)",
                    },
                    "@media (max-width:1120px)": { minWidth: 54, width: 54, px: 1.375 },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1.1} sx={{ minWidth: 0 }}>
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: 12,
                        fontWeight: 800,
                        color: "primary.main",
                        background: "linear-gradient(135deg, rgba(79,70,229,.14), rgba(8,145,178,.16))",
                      }}
                    >
                      {getUserInitials(user.displayName)}
                    </Avatar>
                    <Box sx={{ minWidth: 0, textAlign: "left", "@media (max-width:1120px)": { display: "none" } }}>
                      <Typography noWrap sx={{ maxWidth: 150, fontSize: 14, lineHeight: 1.1, fontWeight: 700 }}>
                        {user.displayName}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.35, fontSize: 11, lineHeight: 1 }}>
                        {user.role === "admin" ? "Администратор" : "Ведущий"}
                      </Typography>
                    </Box>
                  </Stack>
                  <ExpandMoreRoundedIcon
                    sx={{
                      color: "text.secondary",
                      transition: "transform .16s ease",
                      transform: accountMenuAnchor ? "rotate(180deg)" : "none",
                      "@media (max-width:1120px)": { display: "none" },
                    }}
                  />
                </Box>
              </Box>
            </Box>
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
        {openGroup?.items
          .filter((item) => item.key !== "users" || user.role === "admin")
          .map((item) => (
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

      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={closeAccountMenu}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          sx: {
            mt: 1.25,
            width: 286,
            p: 1,
            border: "1px solid rgba(15, 23, 42, .10)",
            borderRadius: (theme) => theme.customRadii.md,
            boxShadow: "0 12px 32px rgba(15, 23, 42, .08)",
          },
        }}
      >
        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Typography fontWeight={750} fontSize={15}>
            {user.displayName}
          </Typography>
          <Typography color="text.secondary" fontSize={12} sx={{ mt: 0.5 }}>
            {user.login}
          </Typography>
          <Box
            sx={{
              display: "inline-flex",
              mt: 1.1,
              px: 1.125,
              py: 0.5,
              borderRadius: (theme) => theme.customRadii.pill,
              color: "primary.main",
              backgroundColor: "rgba(79, 70, 229, .10)",
              fontSize: 11,
              fontWeight: 750,
            }}
          >
            {user.role === "admin" ? "Администратор" : "Ведущий"}
          </Box>
        </Box>
        <Divider sx={{ mx: 0.5, my: 0.625 }} />
        <MenuItem
          onClick={() => {
            closeAccountMenu();
            setAccountDialogOpen(true);
          }}
          sx={{ minHeight: 42, gap: 1.25, borderRadius: 1.25, px: 1.375, fontWeight: 600 }}
        >
          <AccountCircleOutlinedIcon fontSize="small" />
          Учётная запись
        </MenuItem>
        {user.role === "admin" ? (
          <MenuItem
            component={NavLink}
            to="/users"
            onClick={closeAccountMenu}
            sx={{ minHeight: 42, gap: 1.25, borderRadius: 1.25, px: 1.375, fontWeight: 600 }}
          >
            <PeopleAltRoundedIcon fontSize="small" />
            Пользователи
          </MenuItem>
        ) : null}
        <Divider sx={{ mx: 0.5, my: 0.625 }} />
        <MenuItem
          onClick={() => {
            closeAccountMenu();
            void onLogout();
          }}
          sx={{ minHeight: 42, gap: 1.25, borderRadius: 1.25, px: 1.375, color: "error.dark", fontWeight: 600 }}
        >
          <LogoutRoundedIcon fontSize="small" />
          Выйти
        </MenuItem>
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
                      <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
                        {navigationItemIcons[item.key]}
                      </ListItemIcon>
                      <ListItemText primary={item.label} />
                    </ListItemButton>
                  );
                })}
              </List>
            </Box>
          ))}
        </Box>
      </Drawer>
      <AccountDialog
        open={accountDialogOpen}
        selectedProject={projects.find((project) => project.id === selectedProjectId) ?? null}
        onClose={() => setAccountDialogOpen(false)}
        onPasswordChanged={onLogout}
      />
    </>
  );
}
