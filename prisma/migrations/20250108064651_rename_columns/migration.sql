/*
  Warnings:

  - You are about to drop the column `getMoney` on the `Orders` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Orders` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Orders" DROP COLUMN "getMoney",
DROP COLUMN "price",
ADD COLUMN     "totalGet" DOUBLE PRECISION,
ADD COLUMN     "totalPrice" DOUBLE PRECISION;
