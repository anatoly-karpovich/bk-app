import { useState } from "react";
import { Alert, Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AppTextInput from "../../components/ui/AppTextInput";
import { useAuth } from "./useAuth";

export default function LoginPage() {
  const { login } = useAuth(); const navigate = useNavigate();
  const [loginValue, setLoginValue] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try { await login({ login: loginValue, password }); navigate("/", { replace: true }); }
    catch (nextError) { setError(nextError instanceof Error ? nextError.message : "Не удалось войти"); setPassword(""); }
    finally { setLoading(false); }
  };
  return <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, background: "linear-gradient(180deg, #f8fbff 0%, #eef2f6 100%)" }}>
    <Card sx={{ width: "100%", maxWidth: 420 }}><CardContent><Stack component="form" spacing={2} onSubmit={submit}>
      <Typography variant="h4">Вход в BK App</Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <AppTextInput label="Логин" value={loginValue} onChange={(event) => setLoginValue(event.target.value)} autoComplete="username" required />
      <AppTextInput label="Пароль" value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required />
      <Button type="submit" variant="contained" disabled={loading || !loginValue || !password}>{loading ? "Входим…" : "Войти"}</Button>
    </Stack></CardContent></Card>
  </Box>;
}
