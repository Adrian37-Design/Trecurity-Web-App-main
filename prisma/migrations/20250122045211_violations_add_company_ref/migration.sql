/*
  Warnings:

  - Added the required column `company_id` to the `violation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `violation` ADD COLUMN `company_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `violation` ADD CONSTRAINT `violation_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
