import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRelyableDashboard, syncRelyable } from "../api/relyable";

export const relyableKeys = {
  all: ["relyable"] as const,
  dashboard: () => [...relyableKeys.all, "dashboard"] as const,
};

export function useRelyableDashboardQuery() {
  return useQuery({
    queryKey: relyableKeys.dashboard(),
    queryFn: () => getRelyableDashboard(),
    staleTime: 60_000,
  });
}

export function useSyncRelyableMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncRelyable(),
    onSuccess: (result) => {
      queryClient.setQueryData(relyableKeys.dashboard(), result.dashboard);
    },
  });
}
