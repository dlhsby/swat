-- DB-backed configuration system + per-user personal preferences.
--   • system_config: runtime-editable global settings that override their env var
--     (resolution order row → env → code default). Secret values are stored
--     AES-256-GCM encrypted as `iv:tag:ciphertext`; `value = NULL` means cleared.
--   • user.preference_theme / preference_locale: per-user personal settings.
-- Plain additive tables/columns. Applied via `prisma migrate deploy`.

CREATE TABLE "system_config" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" TEXT,
    "is_secret" BOOLEAN NOT NULL DEFAULT false,
    "value_type" VARCHAR(10) NOT NULL DEFAULT 'string',
    "group" VARCHAR(40) NOT NULL,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

ALTER TABLE "user"
    ADD COLUMN "preference_theme" VARCHAR(10),
    ADD COLUMN "preference_locale" VARCHAR(10);
