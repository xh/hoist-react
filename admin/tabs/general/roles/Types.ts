/*
 * This file belongs to Hoist, an application development toolkit
 * developed by Extremely Heavy Industries (www.xh.io | info@xh.io)
 *
 * Copyright © 2024 Extremely Heavy Industries Inc.
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
    sources: Array<{role: string; directoryGroup?: string}>;
}

export type RoleMemberType = 'USER' | 'DIRECTORY_GROUP' | 'ROLE';

export interface RoleModuleConfig {
    enabled: boolean;
    userAssignmentSupported: boolean;
    directoryGroupsSupported: boolean;
    directoryGroupsDescription: string;
}
