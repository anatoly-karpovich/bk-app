import { useCallback, useEffect, useState } from "react";
import { blockUserRequest, createUserRequest, getUsersRequest, resetUserPasswordRequest, unblockUserRequest, updateUserRequest } from "../api/users.client";
import type { CreateUserInput, ManagedUser, UserMutationInput } from "../types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Не удалось выполнить операцию с пользователем.";
}

export function useUsers() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsers((await getUsersRequest()).items);
    } catch (nextError) {
      setError(getErrorMessage(nextError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runMutation(action: () => Promise<void>) {
    setIsSaving(true);
    setError(null);
    try {
      await action();
      await load();
      return true;
    } catch (nextError) {
      setError(getErrorMessage(nextError));
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return {
    users, error, isLoading, isSaving,
    actions: {
      load,
      create: (input: CreateUserInput) => runMutation(async () => { await createUserRequest(input); }),
      update: (userId: string, input: UserMutationInput) => runMutation(async () => { await updateUserRequest(userId, input); }),
      block: (userId: string) => runMutation(async () => { await blockUserRequest(userId); }),
      unblock: (userId: string) => runMutation(async () => { await unblockUserRequest(userId); }),
      resetPassword: (userId: string, password: string) => runMutation(async () => { await resetUserPasswordRequest(userId, password); }),
    },
  };
}
