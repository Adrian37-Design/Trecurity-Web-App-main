/*
  Warnings:

  - You are about to drop the column `tracking_data_id` on the `violation` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `violation` DROP FOREIGN KEY `violation_tracking_data_id_fkey`;

-- AlterTable
ALTER TABLE `violation` DROP COLUMN `tracking_data_id`,
    ADD COLUMN `data` JSON NULL;
