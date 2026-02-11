-- AlterTable: Rename password column to passwordHash and remove email
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" RENAME COLUMN "password" TO "passwordHash";
