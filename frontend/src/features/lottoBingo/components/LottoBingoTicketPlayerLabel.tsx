import { Box } from "@mui/material";

interface Props {
  nickname: string;
}

export default function LottoBingoTicketPlayerLabel({ nickname }: Props) {
  return <Box sx={{ minWidth: 130, px: 1, py: 0.45, border: "1px solid", borderColor: "#ddd", borderRadius: 0.5, bgcolor: "common.white", fontWeight: 700, whiteSpace: "nowrap" }}>{nickname}</Box>;
}
