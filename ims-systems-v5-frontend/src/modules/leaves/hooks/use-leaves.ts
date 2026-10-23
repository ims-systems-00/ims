import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLeave,
  deleteLeave,
  evaluateLeave,
  getLeave,
  listLeaveHolidays,
  listLeaves,
  submitLeave,
  updateLeave,
} from "../api/leaves";
import type {
  CreateLeaveInput,
  LeaveDecision,
  ListLeavesParams,
  UpdateLeaveInput,
} from "../types";

export const leaveKeys = {
  all: ["leaves"] as const,
  lists: () => [...leaveKeys.all, "list"] as const,
  list: (params: ListLeavesParams = {}) =>
    [...leaveKeys.lists(), params] as const,
  details: () => [...leaveKeys.all, "detail"] as const,
  detail: (id: string) => [...leaveKeys.details(), id] as const,
  holidays: (year?: number, countryCode?: string) =>
    [...leaveKeys.all, "holidays", year ?? null, countryCode ?? null] as const,
};

export function useLeavesQuery(params: ListLeavesParams = {}) {
  return useQuery({
    queryKey: leaveKeys.list(params),
    queryFn: () => listLeaves({ pageSize: 10, ...params }),
  });
}

export function useLeaveQuery(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: leaveKeys.detail(id ?? ""),
    queryFn: () => getLeave(id!),
    enabled: Boolean(id) && enabled,
  });
}

export function useLeaveHolidaysQuery(
  year?: number,
  countryCode?: string,
  enabled = true
) {
  return useQuery({
    queryKey: leaveKeys.holidays(year, countryCode),
    queryFn: () => listLeaveHolidays({ year, countryCode }),
    enabled,
  });
}

function useLeaveMutation<TData, TArg>(fn: (arg: TArg) => Promise<TData>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: leaveKeys.all });
    },
  });
}

export const useCreateLeaveMutation = () =>
  useLeaveMutation((input: CreateLeaveInput) => createLeave(input));
export const useUpdateLeaveMutation = () =>
  useLeaveMutation((arg: { id: string; input: UpdateLeaveInput }) =>
    updateLeave(arg.id, arg.input)
  );
export const useDeleteLeaveMutation = () =>
  useLeaveMutation((id: string) => deleteLeave(id));
export const useSubmitLeaveMutation = () =>
  useLeaveMutation((id: string) => submitLeave(id));
export const useEvaluateLeaveMutation = () =>
  useLeaveMutation((arg: { id: string; status: LeaveDecision }) =>
    evaluateLeave(arg.id, arg.status)
  );
