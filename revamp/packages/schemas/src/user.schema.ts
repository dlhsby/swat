import { z } from 'zod';

/** Login credentials. Password policy is enforced on change, not on login. */
export const LoginSchema = z.object({
  username: z.string().trim().min(1, 'Nama pengguna wajib diisi').max(100),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});
export type LoginInput = z.infer<typeof LoginSchema>;

/** New-user creation (admin). Password is system-set; mustChangePassword=true. */
export const UserCreateSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Nama pengguna minimal 3 karakter')
    .max(100, 'Nama pengguna maksimal 100 karakter'),
  name: z.string().trim().min(1, 'Nama wajib diisi').max(100),
  roleId: z.coerce.number().int().positive('Peran wajib dipilih'),
});
export type UserCreateInput = z.infer<typeof UserCreateSchema>;

/** Password policy per specs/06-auth-rbac.md §1.4. */
export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(12, 'Minimal 12 karakter')
      .regex(/[A-Z]/, 'Harus mengandung huruf besar')
      .regex(/[a-z]/, 'Harus mengandung huruf kecil')
      .regex(/[0-9]/, 'Harus mengandung angka')
      .regex(/[!@#$%^&*]/, 'Harus mengandung simbol'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi kata sandi tidak cocok',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
