-- DropForeignKey
ALTER TABLE `violation` DROP FOREIGN KEY `violation_tracking_data_id_fkey`;

-- AlterTable
ALTER TABLE `violation` MODIFY `type` ENUM('GEOFENCE', 'OVERSPEED', 'DEVICE_TEMPER') NOT NULL,
    MODIFY `tracking_data_id` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `violation` ADD CONSTRAINT `violation_tracking_data_id_fkey` FOREIGN KEY (`tracking_data_id`) REFERENCES `tracking_data`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
