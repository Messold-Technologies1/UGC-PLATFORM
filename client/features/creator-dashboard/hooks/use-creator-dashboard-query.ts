"use client";
import { MOCK_DASHBOARD_DATA, type DashboardData } from "../mock/dashboard-mock-data";

export interface DashboardQueryResult {
  data: DashboardData | null;
  isLoading: boolean;
  error: null;
}

export function useCreatorDashboardQuery(): DashboardQueryResult {
  // TODO: replace with real useQuery when API is ready
  return { data: MOCK_DASHBOARD_DATA, isLoading: false, error: null };
}
