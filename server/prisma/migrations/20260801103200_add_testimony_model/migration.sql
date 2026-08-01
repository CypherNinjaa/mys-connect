-- CreateTable
CREATE TABLE "testimonies" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "designation" TEXT,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "testimonies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "testimonies_isPublished_idx" ON "testimonies"("isPublished");

-- CreateIndex
CREATE INDEX "testimonies_sortOrder_idx" ON "testimonies"("sortOrder");

-- AddForeignKey
ALTER TABLE "testimonies" ADD CONSTRAINT "testimonies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
