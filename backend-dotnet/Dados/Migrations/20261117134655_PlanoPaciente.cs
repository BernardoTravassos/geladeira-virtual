using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class PlanoPaciente : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "planos_paciente",
                columns: table => new
                {
                    paciente_id = table.Column<Guid>(type: "uuid", nullable: false),
                    nutricionista_id = table.Column<Guid>(type: "uuid", nullable: false),
                    conteudo = table.Column<string>(type: "text", nullable: false),
                    atualizado_em = table.Column<DateTime>(type: "timestamp without time zone", nullable: false, defaultValueSql: "now()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_planos_paciente", x => x.paciente_id);
                    table.ForeignKey(
                        name: "FK_planos_paciente_usuarios_paciente_id",
                        column: x => x.paciente_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "planos_paciente");
        }
    }
}
