import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import AppPillButton from "../../../../components/ui/AppPillButton";

interface QuizSaveBarProps {
  dirty: boolean;
  loading?: boolean;
  disabled?: boolean;
  saveLabel?: string;
  actions?: ReactNode;
  onSave: () => void;
}

export default function QuizSaveBar({
  dirty,
  loading = false,
  disabled = false,
  saveLabel = "Сохранить викторину",
  actions,
  onSave,
}: QuizSaveBarProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
      sx={{
        position: "sticky",
        bottom: 16,
        zIndex: 2,
        px: 1.75,
        py: 1.4,
        border: "1px solid",
        borderColor: "primary.light",
        borderRadius: 2.25,
        bgcolor: "rgba(250, 249, 255, 0.97)",
        boxShadow: "0 12px 24px rgba(49, 43, 130, 0.12)",
        backdropFilter: "blur(10px)",
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: dirty ? "primary.main" : "success.main" }} />
        <Typography variant="caption" fontWeight={800} color={dirty ? "primary.dark" : "success.dark"}>
          {dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}
        </Typography>
      </Stack>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
        {actions}
        <AppPillButton variant="contained" startIcon={<SaveRoundedIcon />} onClick={onSave} loading={loading} disabled={!dirty || disabled}>
          {saveLabel}
        </AppPillButton>
      </Stack>
    </Stack>
  );
}
