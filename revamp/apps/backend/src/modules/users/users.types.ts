/** Public user representation — never includes `passwordHash`. */
export interface UserDto {
  readonly id: string;
  readonly username: string;
  readonly name: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly mustChangePassword: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Returned once on creation — carries the temp password for out-of-band delivery. */
export interface CreatedUserDto extends UserDto {
  readonly temporaryPassword: string;
}
