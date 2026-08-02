import { useMemo, useState } from "react";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LockResetRoundedIcon from "@mui/icons-material/LockResetRounded";
import PersonAddAlt1RoundedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import { Alert, Card, CardContent, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputAdornment, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import GamePageHeader from "../../components/GamePageHeader";
import AppConfirmDialog from "../../components/ui/AppConfirmDialog";
import AppPillButton from "../../components/ui/AppPillButton";
import AppResponsiveGrid from "../../components/ui/AppResponsiveGrid";
import AppTextInput from "../../components/ui/AppTextInput";
import { useAuth } from "../auth/useAuth";
import type { Project } from "../projects/types";
import UserForm, { createEmptyUserForm, toCreateUserInput, toUserForm, toUserMutationInput, type UserFormValue } from "./components/UserForm";
import { useUsers } from "./hooks/useUsers";
import type { ManagedUser } from "./types";

interface UsersPageProps { projects: Project[]; }

function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }

export default function UsersPage({ projects }: UsersPageProps) {
  const { user: currentUser } = useAuth();
  const { users, error, isLoading, isSaving, actions } = useUsers();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"all" | "admin" | "host">("all");
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all");
  const [editorUser, setEditorUser] = useState<ManagedUser | null | undefined>(undefined);
  const [form, setForm] = useState<UserFormValue>(createEmptyUserForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<{ type: "block" | "unblock" | "reset"; user: ManagedUser } | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const visibleUsers = useMemo(() => users.filter((candidate) => {
    const normalized = search.trim().toLocaleLowerCase();
    return (!normalized || `${candidate.displayName} ${candidate.login}`.toLocaleLowerCase().includes(normalized))
      && (role === "all" || candidate.role === role)
      && (status === "all" || candidate.status === status);
  }), [role, search, status, users]);

  function openCreate() { setEditorUser(null); setForm(createEmptyUserForm()); setFormError(null); }
  function openEdit(nextUser: ManagedUser) { setEditorUser(nextUser); setForm(toUserForm(nextUser)); setFormError(null); }
  function closeEditor() { if (!isSaving) setEditorUser(undefined); }

  async function saveUser() {
    const profilesValid = form.projectProfiles.length > 0 && form.projectProfiles.every((profile) => profile.projectId && profile.nickname.trim());
    if (!form.displayName.trim() || !profilesValid) { setFormError("Заполните имя и хотя бы один профиль проекта с никнеймом."); return; }
    if (!editorUser && (!/^[a-z0-9][a-z0-9._-]{2,39}$/.test(form.login.trim().toLocaleLowerCase()) || form.password.length < 10 || form.password !== form.confirmation)) {
      setFormError(form.password !== form.confirmation ? "Подтверждение пароля не совпадает." : "Проверьте логин и пароль (минимум 10 символов)."); return;
    }
    const successful = editorUser
      ? await actions.update(editorUser.id, toUserMutationInput(form))
      : await actions.create(toCreateUserInput(form));
    if (successful) setEditorUser(undefined);
  }

  async function confirmAction() {
    if (!pendingAction) return;
    let successful = false;
    if (pendingAction.type === "block") successful = await actions.block(pendingAction.user.id);
    if (pendingAction.type === "unblock") successful = await actions.unblock(pendingAction.user.id);
    if (pendingAction.type === "reset") {
      if (resetPassword.length < 10) { setFormError("Новый пароль должен содержать не менее 10 символов."); return; }
      successful = await actions.resetPassword(pendingAction.user.id, resetPassword);
    }
    if (successful) { setPendingAction(null); setResetPassword(""); setFormError(null); }
  }

  return (
    <Stack spacing={3}>
      <GamePageHeader breadcrumbPath="/users" title="Пользователи" description="Управляйте доступом, ролями и никнеймами пользователей в проектах." chips={[{ label: `Всего: ${users.length}` }, { label: `Активных: ${users.filter((candidate) => candidate.status === "active").length}`, color: "success" }]} actions={[{ key: "create", label: "Создать пользователя", icon: <PersonAddAlt1RoundedIcon />, onClick: openCreate, variant: "contained" }]} />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Card><CardContent><AppResponsiveGrid columns={{ xs: 1, md: 3 }} gap={1.5}><AppTextInput label="Поиск" value={search} onChange={(event) => setSearch(event.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> }} /><FormControl fullWidth><InputLabel id="user-role-filter">Роль</InputLabel><Select labelId="user-role-filter" label="Роль" value={role} onChange={(event) => setRole(event.target.value as typeof role)}><MenuItem value="all">Все роли</MenuItem><MenuItem value="admin">Администраторы</MenuItem><MenuItem value="host">Ведущие</MenuItem></Select></FormControl><FormControl fullWidth><InputLabel id="user-status-filter">Статус</InputLabel><Select labelId="user-status-filter" label="Статус" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><MenuItem value="all">Все статусы</MenuItem><MenuItem value="active">Активные</MenuItem><MenuItem value="blocked">Заблокированные</MenuItem></Select></FormControl></AppResponsiveGrid></CardContent></Card>
      {isLoading ? <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack> : <AppResponsiveGrid columns={{ xs: 1, lg: 2 }} gap={2.25}>{visibleUsers.map((managedUser) => <Card key={managedUser.id}><CardContent><Stack spacing={1.5}><Stack direction="row" justifyContent="space-between" spacing={1}><Stack spacing={0.25}><Typography variant="h5">{managedUser.displayName}</Typography><Typography variant="body2" color="text.secondary">{managedUser.login}</Typography></Stack><Stack direction="row" spacing={0.5}><Chip size="small" label={managedUser.role === "admin" ? "Администратор" : "Ведущий"} color={managedUser.role === "admin" ? "secondary" : "primary"} /><Chip size="small" label={managedUser.status === "active" ? "Активен" : "Заблокирован"} color={managedUser.status === "active" ? "success" : "default"} /></Stack></Stack><Typography variant="body2" color="text.secondary">Профили: {managedUser.projectProfiles.map((profile) => `${projects.find((project) => project.id === profile.projectId)?.name ?? "Удалённый проект"} — ${profile.nickname}`).join(" · ")}</Typography><Typography variant="caption" color="text.secondary">Обновлён: {formatDate(managedUser.updatedAt)}</Typography><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><AppPillButton size="small" startIcon={<EditRoundedIcon />} onClick={() => openEdit(managedUser)}>Изменить</AppPillButton><AppPillButton size="small" startIcon={<LockResetRoundedIcon />} onClick={() => { setPendingAction({ type: "reset", user: managedUser }); setResetPassword(""); setFormError(null); }}>Сбросить пароль</AppPillButton>{managedUser.status === "active" ? <AppPillButton size="small" color="error" startIcon={<BlockRoundedIcon />} disabled={managedUser.id === currentUser?.id} onClick={() => setPendingAction({ type: "block", user: managedUser })}>Заблокировать</AppPillButton> : <AppPillButton size="small" color="success" onClick={() => setPendingAction({ type: "unblock", user: managedUser })}>Разблокировать</AppPillButton>}</Stack></Stack></CardContent></Card>)}</AppResponsiveGrid>}
      {!isLoading && !visibleUsers.length ? <Alert severity="info">Пользователи по заданным фильтрам не найдены.</Alert> : null}

      <Dialog open={editorUser !== undefined} onClose={closeEditor} fullWidth maxWidth="md"><DialogTitle>{editorUser ? `Пользователь: ${editorUser.displayName}` : "Новый пользователь"}</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>{formError ? <Alert severity="error">{formError}</Alert> : null}<UserForm value={form} projects={projects} disabled={isSaving} isCreate={!editorUser} isEditingSelf={editorUser?.id === currentUser?.id} onChange={setForm} /></Stack></DialogContent><DialogActions sx={{ px: 3, pb: 2 }}><AppPillButton color="inherit" onClick={closeEditor} disabled={isSaving}>Отмена</AppPillButton><AppPillButton variant="contained" onClick={() => void saveUser()} loading={isSaving}>{editorUser ? "Сохранить" : "Создать"}</AppPillButton></DialogActions></Dialog>

      {pendingAction?.type === "reset" ? <Dialog open onClose={isSaving ? undefined : () => setPendingAction(null)} fullWidth maxWidth="xs"><DialogTitle>Сбросить пароль</DialogTitle><DialogContent><Stack spacing={1.5} sx={{ pt: 1 }}><Typography color="text.secondary">Введите новый пароль для «{pendingAction.user.displayName}». Все его сессии будут завершены.</Typography><AppTextInput label="Новый пароль" type="password" autoComplete="new-password" value={resetPassword} disabled={isSaving} onChange={(event) => setResetPassword(event.target.value)} helperText="Минимум 10 символов" />{formError ? <Alert severity="error">{formError}</Alert> : null}</Stack></DialogContent><DialogActions sx={{ px: 3, pb: 2 }}><AppPillButton color="inherit" disabled={isSaving} onClick={() => setPendingAction(null)}>Отмена</AppPillButton><AppPillButton variant="contained" color="warning" loading={isSaving} onClick={() => void confirmAction()}>Сбросить</AppPillButton></DialogActions></Dialog> : null}
      {pendingAction && pendingAction.type !== "reset" ? <AppConfirmDialog open title={pendingAction.type === "block" ? "Заблокировать пользователя?" : "Разблокировать пользователя?"} description={pendingAction.type === "block" ? `Все сессии «${pendingAction.user.displayName}» будут завершены.` : `Пользователь «${pendingAction.user.displayName}» снова сможет войти.`} confirmLabel={pendingAction.type === "block" ? "Заблокировать" : "Разблокировать"} cancelLabel="Отмена" confirmColor={pendingAction.type === "block" ? "error" : "success"} loading={isSaving} onClose={() => setPendingAction(null)} onConfirm={() => void confirmAction()} /> : null}
    </Stack>
  );
}
