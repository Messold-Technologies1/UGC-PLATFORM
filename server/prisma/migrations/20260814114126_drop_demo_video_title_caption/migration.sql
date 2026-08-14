/*
  Warnings:

  - You are about to drop the column `caption` on the `CreatorDemoVideo` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CreatorDemoVideo` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CreatorDemoVideo" DROP COLUMN "caption",
DROP COLUMN "title";
