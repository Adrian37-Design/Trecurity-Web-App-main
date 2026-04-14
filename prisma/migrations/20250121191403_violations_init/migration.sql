-- CreateTable
CREATE TABLE `violation` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('GEOFENCE', 'OVERSPEED') NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `tracking_data_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `user_id` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `violation` ADD CONSTRAINT `violation_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `violation` ADD CONSTRAINT `violation_tracking_data_id_fkey` FOREIGN KEY (`tracking_data_id`) REFERENCES `tracking_data`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `violation` ADD CONSTRAINT `violation_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
