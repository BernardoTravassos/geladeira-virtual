using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class AlimentoFonte : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "codigo_barras",
                table: "alimentos",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "fonte",
                table: "alimentos",
                type: "character varying(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "catalogo");

            migrationBuilder.CreateIndex(
                name: "ix_alimentos_codigo_barras",
                table: "alimentos",
                column: "codigo_barras");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_alimentos_codigo_barras",
                table: "alimentos");

            migrationBuilder.DropColumn(
                name: "codigo_barras",
                table: "alimentos");

            migrationBuilder.DropColumn(
                name: "fonte",
                table: "alimentos");
        }
    }
}
