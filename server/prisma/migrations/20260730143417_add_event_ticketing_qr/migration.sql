-- AlterTable
ALTER TABLE "event_rsvps" ADD COLUMN     "firstScanAt" TIMESTAMP(3),
ADD COLUMN     "lastScanAt" TIMESTAMP(3),
ADD COLUMN     "maxScans" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "registrationCode" TEXT,
ADD COLUMN     "scanCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scannedById" TEXT;

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "qrScanLimit" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "event_rsvps_registrationCode_key" ON "event_rsvps"("registrationCode");

-- CreateIndex
CREATE INDEX "event_rsvps_registrationCode_idx" ON "event_rsvps"("registrationCode");

-- CreateIndex
CREATE INDEX "event_rsvps_eventId_status_idx" ON "event_rsvps"("eventId", "status");

-- CreateIndex
CREATE INDEX "event_rsvps_userId_status_idx" ON "event_rsvps"("userId", "status");

-- AddForeignKey
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
