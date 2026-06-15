/** Public service-account representation — never includes `apiKeyHash`. */
export interface ServiceAccountDto {
  readonly id: string;
  readonly name: string;
  /** Non-secret identifying prefix of the key (e.g. `swatwb_1a2b3`). */
  readonly apiKeyPrefix: string;
  readonly roleId: string;
  readonly roleName: string;
  readonly active: boolean;
  readonly rateLimitPerMin: number;
  readonly allowedIPs: readonly string[];
  readonly lastUsedAt: string | null;
  readonly revokedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Returned ONCE on creation — carries the full plaintext key for one-time copy. */
export interface CreatedServiceAccountDto extends ServiceAccountDto {
  readonly apiKey: string;
}
