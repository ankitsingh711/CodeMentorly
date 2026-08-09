-- DropIndex
DROP INDEX "Booking_offeringId_startsAt_key";

-- CreateIndex
CREATE INDEX "Booking_offeringId_startsAt_idx" ON "Booking"("offeringId", "startsAt");

-- Partial unique index: only one PENDING/CONFIRMED booking can occupy a
-- given (offeringId, startsAt) slot at a time. CANCELLED/COMPLETED/REFUNDED
-- bookings are excluded so a freed or finished slot can be rebooked.
CREATE UNIQUE INDEX "Booking_offeringId_startsAt_active_key"
  ON "Booking" ("offeringId", "startsAt")
  WHERE "status" IN ('PENDING', 'CONFIRMED');
