import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  /** CPF, e-mail ou matrícula. */
  @IsString()
  identificador: string;

  @IsString()
  @MinLength(1)
  senha: string;
}

export class VerificarCpfDto {
  @IsString()
  cpf: string;
}

export class DefinirSenhaDto {
  @IsString()
  cpf: string;

  @IsString()
  @MinLength(6, { message: 'A senha deve ter ao menos 6 caracteres.' })
  senha: string;
}
