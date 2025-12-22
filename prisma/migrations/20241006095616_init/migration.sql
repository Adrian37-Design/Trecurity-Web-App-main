-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `surname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `approval_level` ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'USER') NOT NULL DEFAULT 'USER',
    `company_where_user_is_admin_id` VARCHAR(191) NULL,
    `company_where_user_is_customer_id` VARCHAR(191) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `two_factor_auth` BOOLEAN NOT NULL DEFAULT true,
    `is_locked` BOOLEAN NOT NULL DEFAULT false,
    `login_failed_attempts` INTEGER NOT NULL DEFAULT 0,
    `last_seen_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `user_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `one_time_pin` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `pin` VARCHAR(191) NOT NULL,
    `has_been_used` BOOLEAN NOT NULL DEFAULT false,
    `failed_attempts` DOUBLE NOT NULL DEFAULT 0,
    `expires_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_information` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `ip_address` VARCHAR(191) NOT NULL,
    `device_information` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `website` VARCHAR(191) NULL,
    `physical_address` VARCHAR(191) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `company_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vehicle` (
    `id` VARCHAR(191) NOT NULL,
    `number_plate` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `company_id` VARCHAR(191) NOT NULL,
    `lock_engine_on_geofence_violation` BOOLEAN NOT NULL DEFAULT false,
    `is_geofence_violation_alert_sent` BOOLEAN NOT NULL DEFAULT false,
    `geofence_alert_recipients` JSON NULL,
    `starting_mileage` DOUBLE NULL,
    `current_mileage` DOUBLE NULL,
    `modem_name` VARCHAR(191) NULL,
    `modem_info` VARCHAR(191) NULL,
    `last_seen` DATETIME(3) NULL,
    `status` BOOLEAN NOT NULL DEFAULT true,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vehicle_number_plate_key`(`number_plate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tracking_data` (
    `id` VARCHAR(191) NOT NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `geofence_id` VARCHAR(191) NULL,
    `geofence_violation_state` ENUM('NO_POLYGON', 'INVALID_POLYGON', 'NO_VIOLATION', 'VIOLATION') NULL,
    `is_engine_locked` BOOLEAN NOT NULL DEFAULT false,
    `ip_address` VARCHAR(191) NOT NULL,
    `public_ip_address` VARCHAR(191) NULL,
    `signal_strength` DOUBLE NOT NULL,
    `satellites` DOUBLE NOT NULL,
    `battery_percentage` DOUBLE NULL,
    `fuel_level` DOUBLE NULL,
    `mileage` DOUBLE NULL,
    `ignition` BOOLEAN NULL,
    `hdop` DOUBLE NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lon` DOUBLE NOT NULL,
    `age` DOUBLE NOT NULL,
    `time_from` DATETIME(3) NOT NULL,
    `time_to` DATETIME(3) NOT NULL,
    `altitude` DOUBLE NOT NULL,
    `course` DOUBLE NOT NULL,
    `speed` DOUBLE NOT NULL,
    `state` ENUM('MOVING', 'STATIONARY') NOT NULL,
    `ccid` VARCHAR(191) NULL,
    `imei` VARCHAR(191) NULL,
    `imsi` VARCHAR(191) NULL,
    `operator_name` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `geofence` (
    `id` VARCHAR(191) NOT NULL,
    `geometry` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controller_command` (
    `id` VARCHAR(191) NOT NULL,
    `code` ENUM('CREATE_GEOFENCE', 'UPDATE_GEOFENCE', 'DELETE_GEOFENCE', 'ENGINE_LOCK', 'ENGINE_UN_LOCK') NOT NULL,
    `payload` JSON NULL,
    `vehicle_id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NULL,
    `is_executed` BOOLEAN NOT NULL DEFAULT false,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `logs` (
    `id` VARCHAR(191) NOT NULL,
    `user_id` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `section` VARCHAR(191) NOT NULL,
    `change` VARCHAR(191) NOT NULL,
    `updated_at` DATETIME(3) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_UserToVehicle` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_UserToVehicle_AB_unique`(`A`, `B`),
    INDEX `_UserToVehicle_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_GeofenceToVehicle` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_GeofenceToVehicle_AB_unique`(`A`, `B`),
    INDEX `_GeofenceToVehicle_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_company_where_user_is_admin_id_fkey` FOREIGN KEY (`company_where_user_is_admin_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_company_where_user_is_customer_id_fkey` FOREIGN KEY (`company_where_user_is_customer_id`) REFERENCES `company`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `login_information` ADD CONSTRAINT `login_information_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vehicle` ADD CONSTRAINT `vehicle_company_id_fkey` FOREIGN KEY (`company_id`) REFERENCES `company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracking_data` ADD CONSTRAINT `tracking_data_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tracking_data` ADD CONSTRAINT `tracking_data_geofence_id_fkey` FOREIGN KEY (`geofence_id`) REFERENCES `geofence`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controller_command` ADD CONSTRAINT `controller_command_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controller_command` ADD CONSTRAINT `controller_command_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `logs` ADD CONSTRAINT `logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserToVehicle` ADD CONSTRAINT `_UserToVehicle_A_fkey` FOREIGN KEY (`A`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_UserToVehicle` ADD CONSTRAINT `_UserToVehicle_B_fkey` FOREIGN KEY (`B`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GeofenceToVehicle` ADD CONSTRAINT `_GeofenceToVehicle_A_fkey` FOREIGN KEY (`A`) REFERENCES `geofence`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_GeofenceToVehicle` ADD CONSTRAINT `_GeofenceToVehicle_B_fkey` FOREIGN KEY (`B`) REFERENCES `vehicle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
