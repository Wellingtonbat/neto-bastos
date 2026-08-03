import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { RoleUsuario } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(
    @Body()
    body: {
      email: string;
      nome: string;
      telefone?: string;
    },
  ) {
    return this.authService.login(body);
  }

  @Post('google')
  loginGoogle(
    @Body()
    body: {
      idToken: string;
    },
  ) {
    return this.authService.loginGoogle(body.idToken);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() req: any) {
    return this.authService.obterUsuarioAtual(req.user);
  }

  @Patch('me/push-token')
  @UseGuards(AuthGuard)
  atualizarPushToken(
    @Req() req: any,
    @Body()
    body: {
      pushToken?: string | null;
    },
  ) {
    return this.authService.atualizarPushToken(req.user, body.pushToken);
  }

  @Patch('usuarios/:id/role')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  atualizarPerfil(
    @Param('id') id: string,
    @Body()
    body: {
      role: RoleUsuario;
      profissionalId?: number | null;
    },
  ) {
    return this.authService.atualizarPerfil(+id, body);
  }

  @Post('barbeiros')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  cadastrarBarbeiro(
    @Body()
    body: {
      email: string;
      nome: string;
      telefone?: string;
      profissionalId: number;
    },
  ) {
    return this.authService.cadastrarBarbeiro(body);
  }

  @Get('barbeiros')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  listarBarbeiros() {
    return this.authService.listarBarbeiros();
  }

  @Get('barbeiros/inativos')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  listarBarbeirosInativos() {
    return this.authService.listarBarbeirosInativos();
  }

  @Patch('barbeiros/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  atualizarBarbeiro(
    @Param('id') id: string,
    @Body()
    body: {
      email: string;
      nome: string;
      telefone?: string;
    },
  ) {
    return this.authService.atualizarBarbeiro(Number(id), body);
  }

  @Patch('barbeiros/:id/inativar')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  inativarBarbeiro(@Param('id') id: string) {
    return this.authService.inativarBarbeiro(Number(id));
  }

  @Patch('barbeiros/:id/reativar')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO)
  reativarBarbeiro(@Param('id') id: string) {
    return this.authService.reativarBarbeiro(Number(id));
  }

  @Get('clientes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(RoleUsuario.DONO, RoleUsuario.BARBEIRO)
  listarClientes() {
    return this.authService.listarClientes();
  }
}
