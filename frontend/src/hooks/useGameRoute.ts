import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";

interface NavigationOptions {
  replace?: boolean;
}

export function useGameRoute(basePath: string) {
  const { gameId } = useParams<{ gameId?: string }>();
  const navigate = useNavigate();

  const openGame = useCallback(
    (nextGameId: string, options?: NavigationOptions) => {
      navigate(`${basePath}/${encodeURIComponent(nextGameId)}`, options);
    },
    [basePath, navigate],
  );

  const openSetup = useCallback(
    (options?: NavigationOptions) => {
      navigate(basePath, options);
    },
    [basePath, navigate],
  );

  return { gameId, openGame, openSetup };
}
