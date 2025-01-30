CREATE TYPE "public"."AttendanceType" AS ENUM('Absent', 'Late', 'Sick', 'Vacation', 'Personal');--> statement-breakpoint
CREATE TYPE "public"."Bank" AS ENUM('bbl', 'kbank', 'rbs', 'ktb', 'jpm', 'mufg', 'tmb', 'scb', 'citi', 'smbc', 'sc', 'cimb', 'uob', 'bay', 'mega', 'boa', 'cacib', 'gsb', 'hsbc', 'db', 'ghb', 'baac', 'mb', 'bnp', 'tbank', 'ibank', 'tisco', 'kk', 'icbc', 'tcrb', 'lhb', 'tmn', 'pp', 'ttb');--> statement-breakpoint
CREATE TYPE "public"."Department" AS ENUM('HR', 'Accounting', 'Admin', 'Owner', 'Operator');--> statement-breakpoint
CREATE TYPE "public"."Platform" AS ENUM('Shopee', 'Lazada', 'Tiktok');--> statement-breakpoint
CREATE TYPE "public"."ShopName" AS ENUM('SupLonJai', 'JaoSua', 'SuperA', 'SomWang');--> statement-breakpoint
CREATE TABLE "Attendance" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Attendance_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"employeeId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"type" "AttendanceType" NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Employee" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Employee_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firstName" varchar(256) NOT NULL,
	"lastName" varchar(256) NOT NULL,
	"nickname" varchar(256) NOT NULL,
	"phoneNumber" varchar(15) NOT NULL,
	"department" "Department" NOT NULL,
	"startDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"bank" "Bank" NOT NULL,
	"bankAccount" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "OrderDetail" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "OrderDetail_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"orderId" varchar(64) NOT NULL,
	"productBarcode" varchar(64) NOT NULL,
	"productAmount" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Order" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"employeeId" integer NOT NULL,
	"platform" "Platform" NOT NULL,
	"shop" "ShopName" NOT NULL,
	"totalPrice" integer,
	"totalGet" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "Product" (
	"barcode" varchar(64) PRIMARY KEY NOT NULL,
	"category" varchar(32),
	"brand" varchar(32),
	"name" varchar(256) NOT NULL,
	"costPrice" double precision NOT NULL,
	"currentPrice" double precision NOT NULL,
	"currentAmount" integer NOT NULL,
	"weight" double precision,
	"width" double precision,
	"height" double precision,
	"length" double precision,
	"packagePerCarton" integer,
	"unitPerPackage" integer,
	"updatedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
