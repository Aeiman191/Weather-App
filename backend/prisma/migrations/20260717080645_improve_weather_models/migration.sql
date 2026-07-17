/*
  Warnings:

  - You are about to drop the column `temperature` on the `Forecast` table. All the data in the column will be lost.
  - Added the required column `averageTemp` to the `Forecast` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxTemp` to the `Forecast` table without a default value. This is not possible if the table is not empty.
  - Added the required column `minTemp` to the `Forecast` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Forecast" DROP COLUMN "temperature",
ADD COLUMN     "averageTemp" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "chanceOfRain" INTEGER,
ADD COLUMN     "maxTemp" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "minTemp" DOUBLE PRECISION NOT NULL;

-- AlterTable
ALTER TABLE "Location" ADD COLUMN     "region" TEXT;

-- AlterTable
ALTER TABLE "WeatherRequest" ADD COLUMN     "feelsLike" DOUBLE PRECISION,
ADD COLUMN     "pressure" DOUBLE PRECISION,
ADD COLUMN     "uvIndex" DOUBLE PRECISION,
ADD COLUMN     "visibility" DOUBLE PRECISION,
ALTER COLUMN "rawData" DROP NOT NULL;
