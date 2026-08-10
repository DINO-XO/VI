'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_USER_ORGS } from '../graphql/queries';
import { OrgMemberInfo } from '../../components/OrgSelector';

interface OrgContextType {
  memberships: OrgMemberInfo[];
  selectedOrgId: string;
  setSelectedOrgId: (id: string) => void;
  activeMembership?: OrgMemberInfo;
  loadingOrgs: boolean;
  refetchOrgs: () => void;
}

const OrgContext = createContext<OrgContextType>({
  memberships: [],
  selectedOrgId: '',
  setSelectedOrgId: () => {},
  loadingOrgs: true,
  refetchOrgs: () => {},
});

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { data, loading: loadingOrgs, refetch: refetchOrgs } = useQuery(GET_USER_ORGS);
  const [selectedOrgId, setSelectedOrgId] = useState<string>('');

  const memberships: OrgMemberInfo[] = data?.org_members || [];

  useEffect(() => {
    if (memberships.length > 0) {
      const exists = memberships.some((m) => m.org_id === selectedOrgId);
      if (!selectedOrgId || !exists) {
        setSelectedOrgId(memberships[0].org_id);
      }
    }
  }, [memberships, selectedOrgId]);

  const activeMembership = memberships.find((m) => m.org_id === selectedOrgId);

  return (
    <OrgContext.Provider
      value={{
        memberships,
        selectedOrgId,
        setSelectedOrgId,
        activeMembership,
        loadingOrgs,
        refetchOrgs,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
