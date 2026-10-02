-- Usuários (login)
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT now()
);

-- Perfil (respostas do wizard) — um por usuário
CREATE TABLE IF NOT EXISTS perfis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(255),
  idade INT,
  sexo VARCHAR(30),
  altura_cm INT,
  peso_kg NUMERIC(5,1),
  objetivo VARCHAR(50),
  pratica_exercicio BOOLEAN,
  intolerancias TEXT,
  vegano BOOLEAN,
  preferencia_preparo VARCHAR(30), -- 'pratico' ou 'elaborado'
  tempo_disponivel VARCHAR(30),
  atualizado_em TIMESTAMP NOT NULL DEFAULT now()
);

-- Histórico de consultas (foto enviada + cardápio gerado)
CREATE TABLE IF NOT EXISTS consultas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  resposta_ia JSONB NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT now()
);

-- Assinatura do usuário
CREATE TABLE IF NOT EXISTS assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID UNIQUE NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  plano VARCHAR(20) NOT NULL DEFAULT 'gratuito', -- 'gratuito' ou 'pago'
  atualizado_em TIMESTAMP NOT NULL DEFAULT now()
);

-- Migração para bancos já criados antes da coluna peso_kg existir
ALTER TABLE perfis ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(5,1);
