using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class RegistrosDia : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "registros_dia",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    usuario_id = table.Column<Guid>(type: "uuid", nullable: false),
                    tipo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    data = table.Column<DateOnly>(type: "date", nullable: false),
                    conteudo = table.Column<string>(type: "text", nullable: false),
                    atualizado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("registros_dia_pkey", x => x.id);
                    table.ForeignKey(
                        name: "registros_dia_usuario_id_fkey",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "registros_dia_usuario_tipo_data_key",
                table: "registros_dia",
                columns: new[] { "usuario_id", "tipo", "data" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "registros_dia");
        }
    }
}
