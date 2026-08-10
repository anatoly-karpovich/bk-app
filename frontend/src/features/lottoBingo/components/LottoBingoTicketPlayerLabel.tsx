import { Box } from "@mui/material";

interface Props {
  nickname: string;
  fullWidth?: boolean;
}

export default function LottoBingoTicketPlayerLabel({ nickname, fullWidth = false }: Props) {
  return <Box sx={{ minWidth: fullWidth ? 0 : 130, width: fullWidth ? "100%" : undefined, overflow: "hidden", textOverflow: "ellipsis", px: 1, py: 0.45, border: "1px solid", borderColor: "#ddd", borderRadius: 0.25, bgcolor: "common.white", fontWeight: 700, whiteSpace: "nowrap" }}>{nickname}</Box>;
}
