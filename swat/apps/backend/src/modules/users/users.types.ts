/** Public user representation — never includes `passwordHash`. */
export interface UserDto {
  readonly id: number;
  readonly username: string;
  readonly name: string;
  readonly roleId: number;
  readonly roleName: string;
  readonly mustChangePassword: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Returned once on creation — carries the temp password for out-of-band delivery. */
export interface CreatedUserDto extends UserDto {
  readonly temporaryPassword: string;
}
