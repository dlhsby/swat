export interface PermissionDto {
  readonly id: string;
  readonly key: string;
  readonly description: string;
  /** Resource prefix (segment before `:`) — groups permissions in the role editor. */
  readonly group: string;
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
