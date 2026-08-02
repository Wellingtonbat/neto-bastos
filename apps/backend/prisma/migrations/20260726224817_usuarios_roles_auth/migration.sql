-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('CLIENTE', 'BARBEIRO', 'DONO');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "role" "RoleUsuario" NOT NULL DEFAULT 'CLIENTE',
    "profissionalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_profissionalId_key" ON "usuario"("profissionalId");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "profissional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
