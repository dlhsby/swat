import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Password policy per specs/06-auth-rbac.md §1.4 (≥12 chars, upper + lower +
 * digit + symbol). The new/confirm match is enforced in the service so the
 * mismatch maps to a clear 400 rather than a field-validation 422.
 */
export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Kata sandi saat ini wajib diisi' })
  currentPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(12, { message: 'Kata sandi baru minimal 12 karakter' })
  @MaxLength(200)
  @Matches(/[A-Z]/, { message: 'Kata sandi baru harus mengandung huruf besar' })
  @Matches(/[a-z]/, { message: 'Kata sandi baru harus mengandung huruf kecil' })
  @Matches(/[0-9]/, { message: 'Kata sandi baru harus mengandung angka' })
  @Matches(/[!@#$%^&*]/, { message: 'Kata sandi baru harus mengandung simbol' })
  newPassword!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1, { message: 'Konfirmasi kata sandi wajib diisi' })
  confirmPassword!: string;
}
