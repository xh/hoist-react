/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2026 Extremely Heavy Industries Inc.
 */
export interface HoistRole {
    name: string;
    category: string;
    notes: string;
    users: string[];
    directoryGroups: string[];
    roles: string[];
    inheritedRoles: EffectiveRoleMember[];
    effectiveUsers: EffectiveRoleUser[];
    effectiveDirectoryGroups: EffectiveRoleMember[];
    effectiveRoles: EffectiveRoleMember[];
    lastUpdated: Date;
    lastUpdatedBy: string;
    members: HoistRoleMember[];
    errors: {
        directoryGroups: Record<string, string>;
    };
}

export interface HoistRoleMember {
    type: RoleMemberType;
    name: string;
    dateCreated: Date;
    createdBy: string;
}

export interface EffectiveRoleMember {
    name: string;
    sourceRoles: string[];
}

export interface EffectiveRoleUser {
    name: string;
    sources: UserSource[];
}

export interface UserSource {
    role: string;
    directoryGroup?: string;
}

export type RoleMemberType = 'USER' | 'DIRECTORY_GROUP' | 'ROLE';

/**
 * Display info for a directory group, as returned by the `roleAdmin/directoryGroupsInfo` and
 * `roleAdmin/searchDirectoryGroups` endpoints. Shape is provider-specific beyond the two
 * required keys - e.g. Entra ID returns additional fields such as `description` and `mail`.
 */
export interface DirectoryGroupInfo {
    /** Stable identifier stored on the role - an object ID (GUID) for Entra ID, a DN for LDAP. */
    id: string;
    displayName: string;
    description?: string;
    mail?: string;
}

export interface RoleModuleConfig {
    enabled: boolean;
    userAssignmentSupported: boolean;
    directoryGroupsSupported: boolean;
    directoryGroupsDescription: string;
}
