import { SetMetadata } from '@nestjs/common';
import { RoleUsuario } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RoleUsuario[]) => SetMetadata(ROLES_KEY, roles);
