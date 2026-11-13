#!/usr/bin/env python3
"""
Converte a TACO (Tabela Brasileira de Composição de Alimentos, 4ª ed., NEPA/Unicamp)
no formato de Dados/Sementes/taco.json, que o --migrar carrega no banco.

Fonte dos dados: https://github.com/isaquetdiniz/taco-api (references/TACO_formatted.json, licença MIT)
Uso:  python3 importar_taco.py TACO_formatted.json taco.json

Regras: "NA" e vazio viram "sem dado"; "Tr" (traço) vira 0. Valores por 100 g do alimento.
"""
import json, re, sys

entrada, saida = sys.argv[1], sys.argv[2]
dados = json.load(open(entrada, encoding="utf-8"))

CATEGORIA = {
    "Cereais e derivados": "carboidratos",
    "Leguminosas e derivados": "carboidratos",
    "Verduras, hortaliças e derivados": "vegetais",
    "Frutas e derivados": "frutas",
    "Gorduras e óleos": "gorduras",
    "Nozes e sementes": "gorduras",
    "Pescados e frutos do mar": "proteinas",
    "Carnes e derivados": "proteinas",
    "Ovos e derivados": "proteinas",
    "Leite e derivados": "laticinios",
    "Bebidas (alcoólicas e não alcoólicas)": "bebidas",
    "Produtos açucarados": "doces",
    "Alimentos preparados": "pratos",
    "Outros alimentos industrializados": "pratos",
    "Miscelâneas": "pratos",
}

# coluna da TACO -> chave do banco
MICROS = {
    "calcium_mg": "calcio", "magnesium_mg": "magnesio", "manganese_mg": "manganes",
    "phosphorus_mg": "fosforo", "iron_mg": "ferro", "sodium_mg": "sodio",
    "potassium_mg": "potassio", "copper_mg": "cobre", "zinc_mg": "zinco",
    "rae_mcg": "vitA", "thiamine_mg": "b1", "riboflavin_mg": "b2",
    "pyridoxine_mg": "b6", "niacin_mg": "b3", "vitaminC_mg": "vitC",
}


def numero(v):
    """None = sem dado; 'Tr' (traço) = 0."""
    if v is None or v == "" or v == "NA" or v == "*":
        return None
    if v == "Tr":
        return 0.0
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def categoria(item):
    nome = item["description"].lower()
    if re.match(r"^(pão|pao|torrada)", nome):
        return "paes"
    if re.match(r"^(bolo|biscoito|rosca|panetone|sonho|doce|sorvete|chocolate)", nome):
        return "doces"
    return CATEGORIA.get(item["category"], "pratos")


alimentos = []
for it in dados:
    kcal, prot, carbo, gord = (numero(it.get(k)) for k in ("energy_kcal", "protein_g", "carbohydrate_g", "lipid_g"))
    if kcal is None:  # sem energia não serve para o app
        continue
    micros = {}
    for col, chave in MICROS.items():
        v = numero(it.get(col))
        if v is not None:
            micros[chave] = round(v, 3)
    alimentos.append({
        "id": f"taco-{it['id']}",
        "nome": it["description"].strip(),
        "categoria": categoria(it),
        "porcaoPadrao": 100,
        "kcal": round(kcal, 1),
        "proteina": round(prot or 0, 2),
        "carbo": round(carbo or 0, 2),
        "gordura": round(gord or 0, 2),
        "medida": None,
        "emoji": None,
        "fonte": "taco",
        "micros": micros,
    })

json.dump({"alimentos": alimentos}, open(saida, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(alimentos), "alimentos;", sum(len(a["micros"]) for a in alimentos), "valores de vitaminas/minerais")
