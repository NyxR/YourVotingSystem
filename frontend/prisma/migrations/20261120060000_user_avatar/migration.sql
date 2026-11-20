-- Optional profile picture (file name in the private "avatars" bucket).
ALTER TABLE "User" ADD COLUMN "avatarPath" TEXT;
