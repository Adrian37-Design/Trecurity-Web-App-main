/*
  Warnings:

  - You are about to drop the `_GeofenceToVehicle` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[vehicle_id]` on the table `geofence` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vehicle_id` to the `geofence` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_GeofenceToVehicle` DROP FOREIGN KEY `_GeofenceToVehicle_A_fkey`;

-- DropForeignKey
ALTER TABLE `_GeofenceToVehicle` DROP FOREIGN KEY `_GeofenceToVehicle_B_fkey`;

-- AlterTable
ALTER TABLE `geofence` ADD COLUMN `vehicle_id` VARCHAR(191) NOT NULL;

-- DropTable
DROP TABLE `_GeofenceToVehicle`;

-- CreateIndex
CREATE UNIQUE INDEX `geofence_vehicle_id_key` ON `geofence`(`vehicle_id`);

-- AddForeignKey
ALTER TABLE `geofence` ADD CONSTRAINT `geofence_vehicle_id_fkey` FOREIGN KEY (`vehicle_id`) REFERENCES `vehicle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
