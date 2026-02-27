-- AlterTable: Remove soft delete fields from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedAt";
ALTER TABLE "User" DROP COLUMN IF EXISTS "deletedBy";
