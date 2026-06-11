import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Papel, TipoUsuario } from './common/enums';
import { hashSenha } from './common/senha.util';
import configuracao from './config/configuracao';
import { Chamado } from './entities/chamado.entity';
import { Mensagem } from './entities/mensagem.entity';
import { Usuario } from './entities/usuario.entity';

/** Cria o primeiro supervisor para acessar o console e cadastrar os atendentes. */
async function main() {
  const c = configuracao();
  const ds = new DataSource({
    type: 'postgres',
    host: c.db.host,
    port: c.db.port,
    username: c.db.user,
    password: c.db.senha,
    database: c.db.base,
    entities: [Usuario, Chamado, Mensagem],
    synchronize: true,
    ssl: c.db.ssl ? { rejectUnauthorized: false } : false,
  });
  await ds.initialize();
  const repo = ds.getRepository(Usuario);

  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@contato.local').toLowerCase();
  const senha = process.env.SEED_ADMIN_SENHA ?? 'admin123';

  if (await repo.findOne({ where: { email } })) {
    console.log(`Supervisor já existe: ${email}`);
  } else {
    await repo.save(
      repo.create({
        tipo: TipoUsuario.ATENDENTE,
        nome: 'Administrador',
        email,
        papel: Papel.SUPERVISOR,
        senhaHash: await hashSenha(senha),
        senhaDefinida: true,
      }),
    );
    console.log(`Supervisor criado → e-mail: ${email} · senha: ${senha}`);
    console.log('Troque a senha no primeiro acesso.');
  }
  await ds.destroy();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
