/*
  Warnings:

  - You are about to drop the column `createdAt` on the `WeatherRequest` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `WeatherRequest` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `WeatherRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `WeatherRequest` table. All the data in the column will be lost.
  - You are about to alter the column `humidity` on the `WeatherRequest` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - A unique constraint covering the columns `[city,country]` on the table `Location` will be added. If there are existing duplicate values, this will fail.
  - Made the column `country` on table `Location` required. This step will fail if there are existing NULL values in that column.
  - Made the column `temperature` on table `WeatherRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `humidity` on table `WeatherRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `condition` on table `WeatherRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `windSpeed` on table `WeatherRequest` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rawData` on table `WeatherRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "country" SET NOT NULL;

-- AlterTable
ALTER TABLE "WeatherRequest" DROP COLUMN "createdAt",
DROP COLUMN "endDate",
DROP COLUMN "startDate",
DROP COLUMN "updatedAt",
ADD COLUMN     "searchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "temperature" SET NOT NULL,
ALTER COLUMN "humidity" SET NOT NULL,
ALTER COLUMN "humidity" SET DATA TYPE INTEGER,
ALTER COLUMN "condition" SET NOT NULL,
ALTER COLUMN "windSpeed" SET NOT NULL,
ALTER COLUMN "rawData" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Location_city_country_key" ON "Location"("city", "country");
