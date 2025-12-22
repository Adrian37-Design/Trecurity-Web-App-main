/*
  Warnings:

  - The values [PANIC] on the enum `sos_alert_type` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `sos_alert` MODIFY `type` ENUM('SOS', 'ACCIDENT') NOT NULL;
