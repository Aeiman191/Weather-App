/*
  Warnings:

  - Added the required column `endDate` to the `WeatherRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startDate` to the `WeatherRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "WeatherRequest" ADD COLUMN     "endDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "startDate" TIMESTAMP(3) NOT NULL;
