export interface PermissionDto {
  readonly id: string;
  readonly key: string;
  readonly description: string;
}

export interface RoleDto {
  readonly id: string;
  readonly name: string;
  readonly permissionIds: string[];
  readonly userCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoleDetailDto extends RoleDto {
  readonly permissions: PermissionDto[];
}
