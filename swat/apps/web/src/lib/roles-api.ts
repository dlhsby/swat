import { apiClient } from './api-client';

export interface PermissionDto {
  id: number;
  key: string;
  description: string;
}

export interface RoleDto {
  id: number;
  name: string;
  permissionIds: number[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetailDto extends RoleDto {
  permissions: PermissionDto[];
}

export const rolesApi = {
  list: (): Promise<RoleDto[]> => apiClient.get<RoleDto[]>('/roles'),
  get: (id: number): Promise<RoleDetailDto> => apiClient.get<RoleDetailDto>(`/roles/${id}`),
  create: (body: { name: string; permissionIds: number[] }): Promise<RoleDto> =>
    apiClient.post<RoleDto>('/roles', body),
  update: (id: number, body: { name?: string; permissionIds?: number[] }): Promise<RoleDto> =>
    apiClient.patch<RoleDto>(`/roles/${id}`, body),
  remove: (id: number): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/roles/${id}`),
};

export const permissionsApi = {
  list: (): Promise<PermissionDto[]> => apiClient.get<PermissionDto[]>('/permissions'),
};
