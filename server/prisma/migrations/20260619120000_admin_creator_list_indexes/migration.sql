-- Admin creator list filters: incomplete profiles + composite listing gate.
CREATE INDEX "CreatorProfile_completeProfile_idx" ON "CreatorProfile"("completeProfile");
CREATE INDEX "CreatorProfile_completeProfile_isListed_idx" ON "CreatorProfile"("completeProfile", "isListed");
