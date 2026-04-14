-- AlterTable
ALTER TABLE `tracking_data` ADD COLUMN `route_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `tracking_data` ADD CONSTRAINT `tracking_data_route_id_fkey` FOREIGN KEY (`route_id`) REFERENCES `routes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
