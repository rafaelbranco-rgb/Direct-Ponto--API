import { IsEnum, IsIn, IsOptional, IsString } from 'class-validator';

import { Categoria } from '../common/enums';

export class AbrirChamadoDto {
  @IsEnum(Categoria)
  categoria: Categoria;

  /** YYYY-MM-DD */
  @IsString()
  dataOcorrencia: string;

  @IsOptional()
  @IsString()
  horarioOriginal?: string;

  @IsOptional()
  @IsString()
  horarioProposto?: string;

  @IsOptional()
  @IsString()
  descricao?: string;
}

export class MensagemDto {
  @IsOptional()
  @IsString()
  texto?: string;

  @IsOptional()
  @IsString()
  anexoNome?: string;

  @IsOptional()
  anexoEhImagem?: boolean;
}

export class DecidirDto {
  @IsIn(['APROVADO', 'RECUSADO'])
  decisao: 'APROVADO' | 'RECUSADO';

  @IsOptional()
  @IsString()
  motivo?: string;
}

export class TransferirDto {
  @IsString()
  atendenteId: string;
}
