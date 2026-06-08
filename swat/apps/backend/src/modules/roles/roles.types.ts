export interface PermissionDto {
  readonly id: number;
  readonly key: string;
  readonly description: string;
}

export interface RoleDto {
  readonly id: number;
  readonly name: string;
  readonly permissionIds: number[];
  readonly userCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface RoleDetailDto extends RoleDto {
  readonly permissions: PermissionDto[];
}
