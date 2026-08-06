import { useQuery } from '@tanstack/react-query';
import { useOrg } from '../organizations/OrgContext';
import { analyticsApi } from './api';

export function useAnalyticsOverview() {
  const { activeOrgId } = useOrg();
  return useQuery({
    queryKey: ['org', activeOrgId, 'analytics', 'overview'],
    queryFn: analyticsApi.getOverview,
    enabled: !!activeOrgId,
  });
}

export function useHiringFunnel() {
  const { activeOrgId } = useOrg();
  return useQuery({
    queryKey: ['org', activeOrgId, 'analytics', 'hiring-funnel'],
    queryFn: analyticsApi.getHiringFunnel,
    enabled: !!activeOrgId,
  });
}

export function useTimeToHire() {
  const { activeOrgId } = useOrg();
  return useQuery({
    queryKey: ['org', activeOrgId, 'analytics', 'time-to-hire'],
    queryFn: analyticsApi.getTimeToHire,
    enabled: !!activeOrgId,
  });
}
