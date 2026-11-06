using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class NivelAtividade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "nivel_atividade",
                table: "perfis",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "nivel_atividade",
                table: "perfis");
        }
    }
}
