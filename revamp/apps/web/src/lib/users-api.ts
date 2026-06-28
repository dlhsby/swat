import { apiClient } from './api-client';

export interface UserDto {
  id: string;
  username: string;
  name: string;
  roleId: string;
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
  create: (body: { username: string; name: string; roleId: string }): Promise<CreatedUserDto> =>
    apiClient.post<CreatedUserDto>('/users', body),
  update: (id: string, body: { name?: string; roleId?: string }): Promise<UserDto> =>
    apiClient.patch<UserDto>(`/users/${id}`, body),
  remove: (id: string): Promise<{ message: string }> =>
    apiClient.delete<{ message: string }>(`/users/${id}`),
};
