-- CreateEnum
CREATE TYPE "ApiPrincipalType" AS ENUM ('USER', 'SERVICE_ACCOUNT');

-- CreateTable
CREATE TABLE "service_account" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "api_key_hash" VARCHAR(255) NOT NULL,
    "api_key_prefix" VARCHAR(16) NOT NULL,
    "role_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "rate_limit_per_min" INTEGER NOT NULL DEFAULT 500,
    "allowed_ips" TEXT[],
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_by_id" UUID,
    "updated_by_id" UUID,

    CONSTRAINT "service_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_account_legacy_id_key" ON "service_account"("legacy_id");

-- CreateIndex
CREATE INDEX "service_account_active_idx" ON "service_account"("active");

-- CreateIndex
CREATE INDEX "service_account_api_key_prefix_idx" ON "service_account"("api_key_prefix");

-- AddForeignKey
ALTER TABLE "service_account" ADD CONSTRAINT "service_account_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "api_audit_log" (
    "id" UUID NOT NULL,
    "principal_type" "ApiPrincipalType" NOT NULL,
    "principal_id" UUID,
    "principal_name" VARCHAR(100) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "endpoint" VARCHAR(256) NOT NULL,
    "status_code" INTEGER NOT NULL,
    "request_summary" VARCHAR(512),
    "response_summary" VARCHAR(512),
    "ip_address" VARCHAR(45) NOT NULL,
    "user_agent" VARCHAR(512) NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_audit_log_timestamp_idx" ON "api_audit_log"("timestamp");

-- CreateIndex
CREATE INDEX "api_audit_log_principal_id_idx" ON "api_audit_log"("principal_id");

-- CreateIndex
CREATE INDEX "api_audit_log_endpoint_idx" ON "api_audit_log"("endpoint");

-- CreateIndex
CREATE INDEX "api_audit_log_status_code_idx" ON "api_audit_log"("status_code");

-- CreateTable
CREATE TABLE "konversi_si_swat" (
    "id" UUID NOT NULL,
    "legacy_id" INTEGER,
    "category" VARCHAR(32) NOT NULL,
    "si" VARCHAR(250) NOT NULL,
    "swat" VARCHAR(250) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "konversi_si_swat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "konversi_si_swat_legacy_id_key" ON "konversi_si_swat"("legacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "konversi_si_swat_category_si_key" ON "konversi_si_swat"("category", "si");

-- CreateIndex
CREATE INDEX "konversi_si_swat_category_idx" ON "konversi_si_swat"("category");
