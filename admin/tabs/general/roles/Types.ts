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

export interface RoleServiceConfig {
    enabled: boolean;
    assignDirectoryGroups: boolean;
    assignUsers: boolean;
    refreshIntervalSecs: number;
}