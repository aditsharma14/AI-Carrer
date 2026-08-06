import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/AuthContext';
import { organizationsApi } from './api';
import { setActiveOrgId } from './orgStore';

const OrgContext = createContext(null);

const STORAGE_KEY = 'activeOrgId';

// Resolves which org the rest of the app operates on, once, here — every
// downstream component reads it from context instead of independently
// figuring out tenant scope (see docs/ARCHITECTURE.md §2.4).
export function OrgProvider({ children }) {
  const { status } = useAuth();
  // The user's explicit choice (via switchOrg) or whatever was last persisted —
  // activeOrgId itself is *derived* from this plus the memberships query
  // below, rather than mirrored into its own state synced by an effect.
  const [overrideOrgId, setOverrideOrgId] = useState(() => localStorage.getItem(STORAGE_KEY));

  const { data: memberships, isLoading } = useQuery({
    queryKey: ['memberships'],
    queryFn: organizationsApi.listMyMemberships,
    enabled: status === 'authenticated',
  });

  const activeOrgId = useMemo(() => {
    if (!memberships?.length) return null;
    const stillValid = memberships.some((m) => m.orgId === overrideOrgId);
    return stillValid ? overrideOrgId : memberships[0].orgId;
  }, [memberships, overrideOrgId]);

  // Side effect on external systems only (the module-level store axios reads,
  // and localStorage) — never React state, so this can't cascade renders.
  useEffect(() => {
    if (!activeOrgId) return;
    setActiveOrgId(activeOrgId);
    localStorage.setItem(STORAGE_KEY, activeOrgId);
  }, [activeOrgId]);

  function switchOrg(orgId) {
    setOverrideOrgId(orgId);
  }

  const activeMembership = memberships?.find((m) => m.orgId === activeOrgId);

  return (
    <OrgContext.Provider
      value={{
        memberships: memberships || [],
        activeOrgId,
        role: activeMembership?.role,
        orgName: activeMembership?.orgName,
        isLoading,
        switchOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook are co-located intentionally
export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used within OrgProvider');
  return ctx;
}
