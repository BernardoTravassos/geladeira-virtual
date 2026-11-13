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

    public virtual DbSet<RegistroDia> RegistrosDia { get; set; }

    public virtual DbSet<Alimento> Alimentos { get; set; }

    public virtual DbSet<AlimentoMicro> AlimentoMicros { get; set; }

    public virtual DbSet<Micronutriente> Micronutrientes { get; set; }

    public virtual DbSet<Nutricionista> Nutricionistas { get; set; }

    public virtual DbSet<Vinculo> Vinculos { get; set; }

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
            entity.Property(e => e.Papel)
                .HasMaxLength(20)
                .HasDefaultValue("paciente")
                .HasColumnName("papel");
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

        modelBuilder.Entity<RegistroDia>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("registros_dia_pkey");

            entity.ToTable("registros_dia");

            // Um registro por usuário, tipo e dia: gravar de novo substitui.
            entity.HasIndex(e => new { e.UsuarioId, e.Tipo, e.Data }, "registros_dia_usuario_tipo_data_key").IsUnique();

            entity.Property(e => e.Id)
                .HasDefaultValueSql("gen_random_uuid()")
                .HasColumnName("id");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id");
            entity.Property(e => e.Tipo)
                .HasMaxLength(20)
                .HasColumnName("tipo");
            entity.Property(e => e.Data).HasColumnName("data");
            entity.Property(e => e.Conteudo).HasColumnName("conteudo");
            entity.Property(e => e.AtualizadoEm)
                .HasDefaultValueSql("now()")
                .HasColumnType("timestamp without time zone")
                .HasColumnName("atualizado_em");

            entity.HasOne(d => d.Usuario).WithMany()
                .HasForeignKey(d => d.UsuarioId)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("registros_dia_usuario_id_fkey");
        });

        modelBuilder.Entity<Micronutriente>(e =>
        {
            e.ToTable("micronutrientes");
            e.HasKey(x => x.Chave);
            e.Property(x => x.Chave).HasColumnName("chave").HasMaxLength(20);
            e.Property(x => x.Rotulo).HasColumnName("rotulo").HasMaxLength(50);
            e.Property(x => x.Unidade).HasColumnName("unidade").HasMaxLength(10);
            e.Property(x => x.ValorDiario).HasColumnName("valor_diario").HasPrecision(10, 2);
            e.Property(x => x.Tipo).HasColumnName("tipo").HasMaxLength(10);
        });

        modelBuilder.Entity<Alimento>(e =>
        {
            e.ToTable("alimentos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasMaxLength(80);
            e.Property(x => x.Nome).HasColumnName("nome").HasMaxLength(120);
            e.Property(x => x.NomeBusca).HasColumnName("nome_busca").HasMaxLength(120);
            e.Property(x => x.Categoria).HasColumnName("categoria").HasMaxLength(20);
            e.Property(x => x.PorcaoPadrao).HasColumnName("porcao_padrao");
            e.Property(x => x.Kcal).HasColumnName("kcal").HasPrecision(7, 2);
            e.Property(x => x.Proteina).HasColumnName("proteina").HasPrecision(7, 2);
            e.Property(x => x.Carbo).HasColumnName("carbo").HasPrecision(7, 2);
            e.Property(x => x.Gordura).HasColumnName("gordura").HasPrecision(7, 2);
            e.Property(x => x.Medida).HasColumnName("medida").HasMaxLength(120);
            e.Property(x => x.Emoji).HasColumnName("emoji").HasMaxLength(16);
            e.Property(x => x.Fonte).HasColumnName("fonte").HasMaxLength(10).HasDefaultValue("catalogo");
            e.Property(x => x.CodigoBarras).HasColumnName("codigo_barras").HasMaxLength(20);
            e.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            e.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone").HasDefaultValueSql("now()");
            e.HasIndex(x => x.CodigoBarras).HasDatabaseName("ix_alimentos_codigo_barras");
            e.HasIndex(x => x.NomeBusca).HasDatabaseName("ix_alimentos_nome_busca");
            e.HasIndex(x => x.UsuarioId).HasDatabaseName("ix_alimentos_usuario_id");
            e.HasOne<Usuario>().WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade).HasConstraintName("alimentos_usuario_id_fkey");
        });

        modelBuilder.Entity<AlimentoMicro>(e =>
        {
            e.ToTable("alimento_micros");
            e.HasKey(x => new { x.AlimentoId, x.Chave });
            e.Property(x => x.AlimentoId).HasColumnName("alimento_id").HasMaxLength(80);
            e.Property(x => x.Chave).HasColumnName("chave").HasMaxLength(20);
            e.Property(x => x.Valor).HasColumnName("valor").HasPrecision(10, 3);
            e.HasOne(x => x.Alimento).WithMany(a => a.Micros).HasForeignKey(x => x.AlimentoId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Micronutriente).WithMany().HasForeignKey(x => x.Chave).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Nutricionista>(e =>
        {
            e.ToTable("nutricionistas");
            e.HasKey(x => x.UsuarioId);
            e.Property(x => x.UsuarioId).HasColumnName("usuario_id");
            e.Property(x => x.Nome).HasColumnName("nome").HasMaxLength(255);
            e.Property(x => x.Crn).HasColumnName("crn").HasMaxLength(30);
            e.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone").HasDefaultValueSql("now()");
            e.HasOne(x => x.Usuario).WithOne().HasForeignKey<Nutricionista>(x => x.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Vinculo>(e =>
        {
            e.ToTable("vinculos");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasDefaultValueSql("gen_random_uuid()");
            e.Property(x => x.NutricionistaId).HasColumnName("nutricionista_id");
            e.Property(x => x.PacienteId).HasColumnName("paciente_id");
            e.Property(x => x.Codigo).HasColumnName("codigo").HasMaxLength(12);
            e.Property(x => x.Status).HasColumnName("status").HasMaxLength(12);
            e.Property(x => x.CriadoEm).HasColumnName("criado_em").HasColumnType("timestamp without time zone").HasDefaultValueSql("now()");
            e.Property(x => x.AceitoEm).HasColumnName("aceito_em").HasColumnType("timestamp without time zone");
            e.HasIndex(x => x.Codigo).IsUnique().HasDatabaseName("vinculos_codigo_key");
            e.HasIndex(x => x.NutricionistaId).HasDatabaseName("ix_vinculos_nutricionista_id");
            e.HasIndex(x => x.PacienteId).HasDatabaseName("ix_vinculos_paciente_id");
            e.HasOne(x => x.Nutricionista).WithMany().HasForeignKey(x => x.NutricionistaId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Paciente).WithMany().HasForeignKey(x => x.PacienteId).OnDelete(DeleteBehavior.Cascade);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
