import { useEffect, useState } from "react";
import { Alert, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, Typography } from "@mui/material";
import AppPillButton from "../../components/ui/AppPillButton";
import AppTextInput from "../../components/ui/AppTextInput";
import type { Project } from "../projects/types";
import { changePasswordRequest } from "./api/auth.client";
import { useAuth } from "./useAuth";

interface AccountDialogProps {
  open: boolean;
  selectedProject: Project | null;
  onClose: () => void;
  onPasswordChanged: () => Promise<void>;
}

export default function AccountDialog({ open, selectedProject, onClose, onPasswordChanged }: AccountDialogProps) {
  const { user, updateOwnProjectNickname } = useAuth();
  const profile = selectedProject ? user?.projectProfiles.find((candidate) => candidate.projectId === selectedProject.id) : undefined;
  const [nickname, setNickname] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (open) {
      setNickname(profile?.nickname ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");
      setError(null);
    }
  }, [open, profile?.nickname]);

  async function saveNickname() {
    if (!selectedProject || !profile || !nickname.trim()) return;
    setSavingProfile(true);
    setError(null);
    try {
      await updateOwnProjectNickname(selectedProject.id, nickname.trim());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось обновить никнейм.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (newPassword.length < 10 || newPassword !== confirmation) {
      setError(newPassword !== confirmation ? "Подтверждение пароля не совпадает." : "Новый пароль должен содержать не менее 10 символов.");
      return;
    }
    setSavingPassword(true);
    setError(null);
    try {
      await changePasswordRequest({ currentPassword, newPassword });
      await onPasswordChanged();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Не удалось изменить пароль.");
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <Dialog open={open} onClose={savingProfile || savingPassword ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Учётная запись</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          <Stack spacing={0.5}>
            <Typography fontWeight={700}>{user?.displayName}</Typography>
            <Typography variant="body2" color="text.secondary">Логин: {user?.login}</Typography>
          </Stack>

          <Divider />

          <Stack spacing={1.25}>
            <Typography variant="h6">Никнейм в проекте</Typography>
            {selectedProject && profile ? (
              <>
                <Typography variant="body2" color="text.secondary">{selectedProject.name}</Typography>
                <AppTextInput label="Никнейм" value={nickname} disabled={savingProfile} onChange={(event) => setNickname(event.target.value)} />
                <Stack direction="row" justifyContent="flex-end">
                  <AppPillButton variant="contained" onClick={() => void saveNickname()} loading={savingProfile} disabled={!nickname.trim() || nickname.trim() === profile.nickname}>Сохранить никнейм</AppPillButton>
                </Stack>
              </>
            ) : (
              <Alert severity="info">Выберите проект с вашим профилем, чтобы изменить никнейм.</Alert>
            )}
          </Stack>

          <Divider />

          <Stack spacing={1.25}>
            <Typography variant="h6">Изменить пароль</Typography>
            <AppTextInput label="Текущий пароль" type="password" autoComplete="current-password" value={currentPassword} disabled={savingPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <AppTextInput label="Новый пароль" type="password" autoComplete="new-password" helperText="От 10 до 128 символов" value={newPassword} disabled={savingPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <AppTextInput label="Повторите новый пароль" type="password" autoComplete="new-password" value={confirmation} disabled={savingPassword} onChange={(event) => setConfirmation(event.target.value)} />
            <Stack direction="row" justifyContent="flex-end">
              <AppPillButton variant="contained" onClick={() => void changePassword()} loading={savingPassword} disabled={!currentPassword || !newPassword || !confirmation}>Изменить пароль</AppPillButton>
            </Stack>
          </Stack>

          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}><AppPillButton color="inherit" onClick={onClose} disabled={savingProfile || savingPassword}>Закрыть</AppPillButton></DialogActions>
    </Dialog>
  );
}
