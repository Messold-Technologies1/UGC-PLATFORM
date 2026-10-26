-- Why a delivery's watermark run last failed.
--
-- Until now the reason existed only in the worker's stdout, which docker-compose
-- caps at 10m x 5 files — so by the time anyone asks why a creator was told to
-- re-upload, the ffmpeg error has almost always rotated away. The column is the
-- operator's copy of that tail; the creator still only ever sees "send it again".
--
-- Nullable with no default: existing rows genuinely have no recorded reason, and
-- a successful run clears it back to NULL.

-- AlterTable
ALTER TABLE "OrderDelivery" ADD COLUMN     "previewError" TEXT;
