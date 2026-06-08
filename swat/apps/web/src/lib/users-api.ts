import { apiClient } from './api-client';

export interface UserDto {
  id: number;
  username: string;
  name: string;
  roleId: number;
  roleName: string;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedUserDto extends UserDto {
  temporaryPassword: string;
}

export const usersApi = {
  list: (query = '?limit=100'): Promise<UserDto[]> => apiClient.get<UserDto[]>(`/users${query}`),
  create: (body: { username: string; name: string; roleId: number }): Promise<CreatedUserDto> =>
    apiClient.post<CreatedUserDto>('/users', body),
  update: (id: number, body: { name?: string; roleId?: number }): Promise<UserDto> =>
    apiClient.patch<UserDto>(`/users/${id}`, body),
  remove: (id: number): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/users/${id}`),
};
