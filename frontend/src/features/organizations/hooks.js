import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { organizationsApi } from './api';
import { useOrg } from './OrgContext';

export function useOrgSettings() {
  const { activeOrgId } = useOrg();
  return useQuery({
    queryKey: ['org', activeOrgId, 'settings'],
    queryFn: organizationsApi.getSettings,
    enabled: !!activeOrgId,
  });
}

export function useUpdateOrgSettings() {
  const { activeOrgId } = useOrg();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationsApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'settings'] });
      toast.success('Organization settings updated');
    },
  });
}

export function useOrgMembers() {
  const { activeOrgId } = useOrg();
  return useQuery({
    queryKey: ['org', activeOrgId, 'members'],
    queryFn: organizationsApi.listMembers,
    enabled: !!activeOrgId,
  });
}

export function useInviteMember() {
  const { activeOrgId } = useOrg();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationsApi.inviteMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'members'] });
      toast.success('Invite sent');
    },
  });
}

export function useRemoveMember() {
  const { activeOrgId } = useOrg();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: organizationsApi.removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', activeOrgId, 'members'] });
      toast.success('Member removed');
    },
  });
}
