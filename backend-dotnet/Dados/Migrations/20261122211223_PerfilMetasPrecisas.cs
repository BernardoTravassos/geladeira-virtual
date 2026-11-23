using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeladeiraVirtual.Api.Dados.Migrations
{
    /// <inheritdoc />
    public partial class PerfilMetasPrecisas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "condicoes_saude",
                table: "perfis",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "dias_treino",
                table: "perfis",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "gestacao",
                table: "perfis",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "gordura_pct",
                table: "perfis",
                type: "numeric(4,1)",
                precision: 4,
                scale: 1,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "intensidade_treino",
                table: "perfis",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "minutos_treino",
                table: "perfis",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "peso_meta_kg",
                table: "perfis",
                type: "numeric(5,1)",
                precision: 5,
                scale: 1,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ritmo",
                table: "perfis",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "rotina_diaria",
                table: "perfis",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "condicoes_saude",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "dias_treino",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "gestacao",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "gordura_pct",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "intensidade_treino",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "minutos_treino",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "peso_meta_kg",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "ritmo",
                table: "perfis");

            migrationBuilder.DropColumn(
                name: "rotina_diaria",
                table: "perfis");
        }
    }
}
