-- CreateTable
CREATE TABLE "imagem" (
    "id" SERIAL NOT NULL,
    "mimeType" TEXT NOT NULL,
    "dados" BYTEA NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imagem_pkey" PRIMARY KEY ("id")
);
