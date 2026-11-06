using System;
using System.Collections.Generic;
using GeladeiraVirtual.Api.Dados.Entidades;
using Microsoft.EntityFrameworkCore;

namespace GeladeiraVirtual.Api.Dados;

public partial class GeladeiraContext : DbContext
{
    public GeladeiraContext(DbContextOptions<GeladeiraContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Assinatura> Assinaturas { get; set; }

    public virtual DbSet<Consulta> Consultas { get; set; }

    public virtual DbSet<CodigoRecuperacao> CodigosRecuperacao { get; set; }

    public virtual DbSet<Perfil> Perfis { get; set; }

    public virtual DbSet<Usuario> Usuarios { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Assinatura>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("assinaturas_pkey");

            entity.ToTable("assinaturas");

            entity.HasIndex(e => e.UsuarioId, "assinaturas_usuario_id_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AtualizadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("atualizado_em");
            entity.Property(e => e.Plano)
                .HasMaxLength(20)
                .HasDefaultValueSql("'gratuito'::character varying")
                .HasColumnName("plano");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");

            entity.HasOne(d => d.Usuario).WithOne(p => p.Assinatura)
                .HasForeignKey<Assinatura>(d => d.UsuarioId)
                .HasConstraintName("assinaturas_usuario_id_fkey");
        });

        modelBuilder.Entity<Consulta>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("consultas_pkey");

            entity.ToTable("consultas");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CriadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("criado_em");
            entity.Property(e => e.RespostaIa)
                .HasColumnType("jsonb")
                .HasColumnName("resposta_ia");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");

            entity.HasOne(d => d.Usuario).WithMany(p => p.Consultas)
                .HasForeignKey(d => d.UsuarioId)
                .HasConstraintName("consultas_usuario_id_fkey");
        });

        modelBuilder.Entity<Perfil>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("perfis_pkey");

            entity.ToTable("perfis");

            entity.HasIndex(e => e.UsuarioId, "perfis_usuario_id_unique").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.AlturaCm).HasColumnName("altura_cm");
            entity.Property(e => e.AtualizadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("atualizado_em");
            entity.Property(e => e.Idade).HasColumnName("idade");
            entity.Property(e => e.Intolerancias).HasColumnName("intolerancias");
            entity.Property(e => e.Nome)
                .HasMaxLength(255)
                .HasColumnName("nome");
            entity.Property(e => e.NivelAtividade)
                .HasMaxLength(20)
                .HasColumnName("nivel_atividade");
            entity.Property(e => e.Objetivo)
                .HasMaxLength(50)
                .HasColumnName("objetivo");
            entity.Property(e => e.PesoKg)
                .HasPrecision(5, 1)
                .HasColumnName("peso_kg");
            entity.Property(e => e.PraticaExercicio).HasColumnName("pratica_exercicio");
            entity.Property(e => e.PreferenciaPreparo)
                .HasMaxLength(30)
                .HasColumnName("preferencia_preparo");
            entity.Property(e => e.Sexo)
                .HasMaxLength(30)
                .HasColumnName("sexo");
            entity.Property(e => e.TempoDisponivel)
                .HasMaxLength(30)
                .HasColumnName("tempo_disponivel");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.Vegano).HasColumnName("vegano");

            entity.HasOne(d => d.Usuario).WithOne(p => p.Perfil)
                .HasForeignKey<Perfil>(d => d.UsuarioId)
                .HasConstraintName("perfis_usuario_id_fkey");
        });

        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("usuarios_pkey");

            entity.ToTable("usuarios");

            entity.HasIndex(e => e.Email, "usuarios_email_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.CriadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("criado_em");
            entity.Property(e => e.Email)
                .HasMaxLength(255)
                .HasColumnName("email");
            entity.Property(e => e.SenhaHash)
                .HasMaxLength(255)
                .HasColumnName("senha_hash");
            entity.Property(e => e.TokenVersao)
                .HasDefaultValue(1)
                .HasColumnName("token_versao");
        });

        modelBuilder.Entity<CodigoRecuperacao>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("codigos_recuperacao_pkey");

            entity.ToTable("codigos_recuperacao");

            // Busca sempre por usuário, para achar o código mais recente dele.
            entity.HasIndex(e => e.UsuarioId, "ix_codigos_recuperacao_usuario_id");

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.CodigoHash)
                .HasMaxLength(255)
                .HasColumnName("codigo_hash");
            entity.Property(e => e.ExpiraEm)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("expira_em");
            entity.Property(e => e.UsadoEm)
                .HasColumnType("timestamp without time zone")
                .HasColumnName("usado_em");
            entity.Property(e => e.Tentativas)
                .HasDefaultValue(0)
                .HasColumnName("tentativas");
            entity.Property(e => e.CriadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("criado_em");

            entity.HasOne(d => d.Usuario).WithMany(p => p.CodigosRecuperacao)
                .HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("codigos_recuperacao_usuario_id_fkey");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
