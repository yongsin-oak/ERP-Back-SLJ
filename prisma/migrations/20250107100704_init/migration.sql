-- CreateEnum
CREATE TYPE "BankName" AS ENUM ('BBL', 'KBANK', 'KTB', 'TTB', 'SCB', 'KKP', 'BAY', 'CIMBT', 'TISCO', 'UOBT', 'CREDIT', 'LHFG', 'ICBCT', 'SME', 'BAAC', 'EXIM', 'GSB', 'GHB');

-- CreateEnum
CREATE TYPE "AttendanceType" AS ENUM ('Absent', 'Late', 'Sick', 'Vacation', 'Personal');

-- CreateEnum
CREATE TYPE "DepartmentName" AS ENUM ('HR', 'Accounting', 'Admin', 'Owner', 'Operator');

-- CreateEnum
CREATE TYPE "PlatFormName" AS ENUM ('Shopee', 'Lazada', 'Tiktok', 'StoreFront', 'Direct', 'Delivery');

-- CreateEnum
CREATE TYPE "ShopName" AS ENUM ('SupLonJai', 'JaoSua', 'SuperA', 'SomWang');

-- CreateTable
CREATE TABLE "Employee" (
    "id" SERIAL NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "department" "DepartmentName" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "bankName" "BankName" NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" SERIAL NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "type" "AttendanceType" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "id" TEXT NOT NULL,
    "employeeId" INTEGER NOT NULL,
    "platform" "PlatFormName" NOT NULL,
    "shop" "ShopName" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION,
    "getMoney" DOUBLE PRECISION
);

-- CreateTable
CREATE TABLE "Products" (
    "barcode" TEXT NOT NULL,
    "category" TEXT,
    "brand" TEXT,
    "name" TEXT NOT NULL,
    "costPrice" DOUBLE PRECISION NOT NULL,
    "currentPrice" DOUBLE PRECISION NOT NULL,
    "currentAmount" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "packagePerCarton" INTEGER,
    "unitPerPackage" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "OrderDetails" (
    "id" SERIAL NOT NULL,
    "orderId" TEXT NOT NULL,
    "productBarcode" TEXT NOT NULL,
    "productAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderDetails_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Orders_id_key" ON "Orders"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Products_barcode_key" ON "Products"("barcode");

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDetails" ADD CONSTRAINT "OrderDetails_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderDetails" ADD CONSTRAINT "OrderDetails_productBarcode_fkey" FOREIGN KEY ("productBarcode") REFERENCES "Products"("barcode") ON DELETE RESTRICT ON UPDATE CASCADE;
