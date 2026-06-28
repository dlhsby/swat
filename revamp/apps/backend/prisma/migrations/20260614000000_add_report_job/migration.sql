-- CreateTable
CREATE TABLE "report_job" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "report_type" VARCHAR(20) NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    "filters" JSONB NOT NULL,
    "object_key" VARCHAR(512),
    "file_size" BIGINT,
    "error_message" VARCHAR(512),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "report_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_job_user_id_idx" ON "report_job"("user_id");

-- CreateIndex
CREATE INDEX "report_job_status_idx" ON "report_job"("status");

-- CreateIndex
CREATE INDEX "report_job_created_at_idx" ON "report_job"("created_at");

-- CreateIndex
CREATE INDEX "report_job_expires_at_idx" ON "report_job"("expires_at");

-- AddForeignKey
ALTER TABLE "report_job" ADD CONSTRAINT "report_job_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
