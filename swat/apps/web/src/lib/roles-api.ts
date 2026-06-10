import { apiClient } from './api-client';

export interface PermissionDto {
  id: string;
  key: string;
  description: string;
}

export interface RoleDto {
  id: string;
  name: string;
  permissionIds: string[];
  userCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleDetailDto extends RoleDto {
  permissions: PermissionDto[];
}

export const rolesApi = {
  list: (): Promise<RoleDto[]> => apiClient.get<RoleDto[]>('/roles'),
  get: (id: string): Promise<RoleDetailDto> => apiClient.get<RoleDetailDto>(`/roles/${id}`),
  create: (body: { name: string; permissionIds: string[] }): Promise<RoleDto> =>
    apiClient.post<RoleDto>('/roles', body),
  update: (id: string, body: { name?: string; permissionIds?: string[] }): Promise<RoleDto> =>
    apiClient.patch<RoleDto>(`/roles/${id}`, body),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/roles/${id}`),
};

export const permissionsApi = {
  list: (): Promise<PermissionDto[]> => apiClient.get<PermissionDto[]>('/permissions'),
};
