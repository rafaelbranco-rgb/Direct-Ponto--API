import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

import { Papel } from '../common/enums';

export class CriarAtendenteDto {
  @IsString()
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  senha: string;

  @IsOptional()
  @IsString()
  setor?: string;

  @IsOptional()
  @IsEnum(Papel)
  papel?: Papel;
}

export class TrocarSenhaDto {
  @IsOptional()
  @IsString()
  senhaAtual?: string;

  @IsString()
  @MinLength(6, { message: 'A nova senha deve ter ao menos 6 caracteres.' })
  novaSenha: string;
}

export class ResetarSenhaDto {
  /** Se omitida, o sistema gera uma senha temporária e a devolve ao atendente. */
  @IsOptional()
  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  novaSenha?: string;
}
