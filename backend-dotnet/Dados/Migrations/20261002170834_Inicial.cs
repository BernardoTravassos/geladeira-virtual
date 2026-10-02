using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    senha_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    token_versao = table.Column<int>(type: "integer", nullable: false, defaultValue: 1)
                },
                constraints: table =>
                {
                    table.PrimaryKey("usuarios_pkey", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "assinaturas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    plano = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValueSql: "'gratuito'::character varying"),
                    atualizado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("assinaturas_pkey", x => x.id);
                    table.ForeignKey(
                        name: "assinaturas_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "codigos_recuperacao",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    codigo_hash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    expira_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false),
                    usado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    tentativas = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("codigos_recuperacao_pkey", x => x.id);
                    table.ForeignKey(
                        name: "codigos_recuperacao_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "consultas",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    resposta_ia = table.Column<string>(type: "jsonb", nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("consultas_pkey", x => x.id);
                    table.ForeignKey(
                        name: "consultas_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "perfis",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    idade = table.Column<int>(type: "integer", nullable: true),
                    sexo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    altura_cm = table.Column<int>(type: "integer", nullable: true),
                    objetivo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    pratica_exercicio = table.Column<bool>(type: "boolean", nullable: true),
                    intolerancias = table.Column<string>(type: "text", nullable: true),
                    vegano = table.Column<bool>(type: "boolean", nullable: true),
                    preferencia_preparo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    tempo_disponivel = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    atualizado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    peso_kg = table.Column<decimal>(type: "numeric(5,1)", precision: 5, scale: 1, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("perfis_pkey", x => x.id);
                    table.ForeignKey(
                        name: "perfis_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "assinaturas_usuario_id_key",
                table: "assinaturas",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_codigos_recuperacao_usuario_id",
                table: "codigos_recuperacao",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_consultas_usuario_id",
                table: "consultas",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "perfis_usuario_id_unique",
                table: "perfis",
                column: "usuario_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "usuarios_email_key",
                table: "usuarios",
                column: "email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assinaturas");

            migrationBuilder.DropTable(
                name: "codigos_recuperacao");

            migrationBuilder.DropTable(
                name: "consultas");

            migrationBuilder.DropTable(
                name: "perfis");

            migrationBuilder.DropTable(
                name: "usuarios");
        }
    }
}
