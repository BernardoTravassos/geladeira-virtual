using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class AlimentosNutricionistas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "papel",
                table: "usuarios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "paciente");

            migrationBuilder.CreateTable(
                name: "alimentos",
                columns: table => new
                {
                    id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    nome = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    nome_busca = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    categoria = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    porcao_padrao = table.Column<int>(type: "integer", nullable: false),
                    kcal = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    proteina = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    carbo = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    gordura = table.Column<decimal>(type: "numeric(7,2)", precision: 7, scale: 2, nullable: false),
                    medida = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    emoji = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: true),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alimentos", x => x.id);
                    table.ForeignKey(
                        name: "alimentos_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "micronutrientes",
                columns: table => new
                {
                    chave = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    rotulo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    unidade = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    valor_diario = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: false),
                    tipo = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_micronutrientes", x => x.chave);
                });

            migrationBuilder.CreateTable(
                name: "nutricionistas",
                columns: table => new
                {
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nome = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    crn = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_nutricionistas", x => x.usuario_id);
                    table.ForeignKey(
                        name: "FK_nutricionistas_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vinculos",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    nutricionista_id = table.Column<Guid>(type: "uuid", nullable: false),
                    paciente_id = table.Column<Guid>(type: "uuid", nullable: true),
                    codigo = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    status = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    criado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()"),
                    aceito_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vinculos", x => x.id);
                    table.ForeignKey(
                        name: "FK_vinculos_usuarios_nutricionista_id",
                        column: x => x.nutricionista_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_vinculos_usuarios_paciente_id",
                        column: x => x.paciente_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "alimento_micros",
                columns: table => new
                {
                    alimento_id = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    chave = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    valor = table.Column<decimal>(type: "numeric(10,3)", precision: 10, scale: 3, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alimento_micros", x => new { x.alimento_id, x.chave });
                    table.ForeignKey(
                        name: "FK_alimento_micros_alimentos_alimento_id",
                        column: x => x.alimento_id,
                        principalTable: "alimentos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_alimento_micros_micronutrientes_chave",
                        column: x => x.chave,
                        principalTable: "micronutrientes",
                        principalColumn: "chave",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_alimento_micros_chave",
                table: "alimento_micros",
                column: "chave");

            migrationBuilder.CreateIndex(
                name: "ix_alimentos_nome_busca",
                table: "alimentos",
                column: "nome_busca");

            migrationBuilder.CreateIndex(
                name: "ix_alimentos_usuario_id",
                table: "alimentos",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "ix_vinculos_nutricionista_id",
                table: "vinculos",
                column: "nutricionista_id");

            migrationBuilder.CreateIndex(
                name: "ix_vinculos_paciente_id",
                table: "vinculos",
                column: "paciente_id");

            migrationBuilder.CreateIndex(
                name: "vinculos_codigo_key",
                table: "vinculos",
                column: "codigo",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alimento_micros");

            migrationBuilder.DropTable(
                name: "nutricionistas");

            migrationBuilder.DropTable(
                name: "vinculos");

            migrationBuilder.DropTable(
                name: "alimentos");

            migrationBuilder.DropTable(
                name: "micronutrientes");

            migrationBuilder.DropColumn(
                name: "papel",
                table: "usuarios");
        }
    }
}
