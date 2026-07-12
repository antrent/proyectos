import pandas as pd
import json
import os
import math

file_path = "data/EJECUCION FINANCIERO ALMACEN DE ROPA .BE.xlsx"
output_path = "data/parsed_data.json"

def clean_bc(x):
    if pd.isna(x): return ""
    s = str(x).replace("*", "").strip()
    if s.endswith(".0"): s = s[:-2]
    if s.upper() in ["#N/A", "-", "NAN"]: return ""
    return s

def clean_sku(x):
    if pd.isna(x): return ""
    s = str(x).strip()
    if s.endswith(".0"): s = s[:-2]
    if s.upper() in ["#N/A", "-", "NAN"]: return ""
    return s

def clean_str(x):
    if pd.isna(x): return ""
    s = str(x).strip()
    if s.upper() in ["#N/A", "-", "NAN"]: return ""
    return s

def clean_size(x):
    if pd.isna(x): return "-"
    s = str(x).strip()
    if s.endswith(".0"): s = s[:-2]
    if s.upper() in ["#N/A", "-", "NAN", ""]: return "-"
    return s

def clean_num(x):
    if pd.isna(x): return 0
    try:
        val = float(x)
        if math.isnan(val) or math.isinf(val):
            return 0
        if val.is_integer():
            return int(val)
        return val
    except:
        return 0

# === 1. CONFIG ===
print("Procesando CONFIG...")
df_cron = pd.read_excel(file_path, sheet_name="CRONOGRAMA", header=None)
config_raw = {}
for idx, row in df_cron.iterrows():
    if pd.notna(row[0]):
        key = str(row[0]).strip().lower()
        val = row[1]
        if pd.notna(val):
            config_raw[key] = val

config_key_map = {
    "arriendo": "arriendo",
    "rut": "rut",
    "rut ": "rut",
    "nombre": "nombre",
    "dirección": "dirección",
    "celular": "celular",
    "correo": "correo",
    "ccb": "ccb",
    "ccb ": "ccb",
    "monto": "monto",
    "cctv": "cctv",
    "cctv ": "cctv",
    "computador": "computador",
    "nequi": "nequi",
    "daviplata": "daviplata",
    "addi": "addi",
    "sistecredito": "sistecredito",
    "sistecredito ": "sistecredito",
    "cuenta ahorros": "cuenta ahorros",
    "bold": "bold",
    "tipo de letra del nombre": "tipo de letra del nombre",
    "colores del nombre": "colores del nombre",
    "luces": "luces",
    "maniquíes": "maniquíes",
    "maniquíes ": "maniquíes",
    "ganchos": "ganchos",
    "vestier cortinas": "vestier cortinas",
    "canecas": "canecas",
    "extintor": "extintor",
    "botiquin": "botiquin",
    "internet": "internet"
}

config = {}
for k, target in config_key_map.items():
    if k in config_raw:
        val = config_raw[k]
        if isinstance(val, (int, float)):
            config[target] = clean_num(val)
        else:
            config[target] = clean_str(val)

# === 2. PARAMS ===
print("Procesando PARAMS...")
df_param = pd.read_excel(file_path, sheet_name="PARAM")

def extract_param_list(df, name_col, id_col):
    items = []
    seen = set()
    if name_col in df.columns and id_col in df.columns:
        for idx, row in df.iterrows():
            name_val = clean_str(row[name_col])
            id_val = row[id_col]
            if name_val and pd.notna(id_val):
                id_int = int(clean_num(id_val))
                if name_val not in seen:
                    items.append({"name": name_val, "id": id_int})
                    seen.add(name_val)
    # Ordenar por id
    items.sort(key=lambda x: x["id"])
    return items

params = {
    "lines": extract_param_list(df_param, "LINEAS", "ID LINEA"),
    "categories": extract_param_list(df_param, "CATEGORIAS", "ID CATEGORIA"),
    "styles": extract_param_list(df_param, "ESTILO-DETALLE", "ID ESTILO-DETALLE"),
    "genders": extract_param_list(df_param, "GENERO", "ID GENERO"),
    "colors": extract_param_list(df_param, "COLOR", "ID COLOR"),
    "sizes": extract_param_list(df_param, "TALLA", "ID TALLA"),
    "providers": extract_param_list(df_param, "PROVEEDOR-MARCA", "ID PROVEEDOR")
}

# === 3. MAESTRA (lookup) ===
print("Cargando MAESTRA para consultas...")
df_maestra = pd.read_excel(file_path, sheet_name="MAESTRA", skiprows=2)

maestra_by_sku = {}
maestra_by_name = {}

for idx, row in df_maestra.iterrows():
    sku = clean_sku(row.get("SKU"))
    bc = clean_bc(row.get("CODIGO DE BARRAS"))
    name = clean_str(row.get("NOMBRE COMPLETO"))
    
    prod_data = {
        "barcode": bc,
        "sku": sku,
        "name": name,
        "line": clean_str(row.get("LINEA")),
        "category": clean_str(row.get("CATEGORIA")),
        "gender": clean_str(row.get("GENERO")),
        "style": clean_str(row.get("ESTILO-DETALLE")),
        "color": clean_str(row.get("COLOR")),
        "size": clean_size(row.get("TALLA")),
        "provider": clean_str(row.get("PROVEEDOR-MARCA"))
    }
    
    if sku:
        maestra_by_sku[sku] = prod_data
    if name:
        maestra_by_name[name.upper()] = prod_data

# === 4. PURCHASES ===
print("Procesando PURCHASES...")
df_compras = pd.read_excel(file_path, sheet_name="COMPRAS", skiprows=2)
purchases = []

# Filtrar compras válidas
df_compras_valid = df_compras[
    df_compras["FECHA INGRESO"].notna() &
    df_compras["SKU"].notna() &
    df_compras["CANTIDAD COMPRA"].notna() &
    (df_compras["CANTIDAD COMPRA"] > 0)
]

for idx, row in df_compras_valid.iterrows():
    date_val = str(row["FECHA INGRESO"]).split(" ")[0]
    bc = clean_bc(row.get("CODIGO DE BARRAS"))
    sku = clean_sku(row.get("SKU"))
    name = clean_str(row.get("NOMBRE COMPLETO"))
    provider = clean_str(row.get("PROVEEDOR MARCA"))
    qty = int(clean_num(row.get("CANTIDAD COMPRA")))
    cost = int(clean_num(row.get("VALOR UNT")))
    total = int(clean_num(row.get("VALOR TOTAL COMPRA ")))
    sell = int(clean_num(row.get("PRECIO DE VENTA")))
    
    purchases.append({
        "date": date_val,
        "barcode": bc,
        "sku": sku,
        "name": name,
        "provider": provider if provider else "-",
        "quantity": qty,
        "costPrice": cost,
        "totalPrice": total,
        "sellPrice": sell
    })

# === 5. PRODUCTS ===
print("Procesando PRODUCTS...")
df_copia = pd.read_excel(file_path, sheet_name="Copia de COMPRAS", skiprows=1)

products_dict = {}

# a. Importar desde Copia de COMPRAS (Inventario Inicial)
df_copia_valid = df_copia[
    df_copia["LINEA"].notna() &
    df_copia["NOMBRE COMPLETO.1"].notna() &
    (df_copia["NOMBRE COMPLETO.1"] != "NOMBRE COMPLETO")
]

for idx, row in df_copia_valid.iterrows():
    # Obtener datos básicos
    bc = clean_bc(row.get("CODIGO DE BARRAS"))
    sku = clean_sku(row.get("SKU"))
    name1 = clean_str(row.get("NOMBRE COMPLETO.1"))
    name_raw = clean_str(row.get("NOMBRE COMPLETO"))
    
    # Si SKU o barcode son nulos, intentar resolver desde MAESTRA por nombre
    maestra_match = None
    if name1.upper() in maestra_by_name:
        maestra_match = maestra_by_name[name1.upper()]
    elif name_raw.upper() in maestra_by_name:
        maestra_match = maestra_by_name[name_raw.upper()]
        
    if maestra_match:
        if not sku: sku = maestra_match["sku"]
        if not bc: bc = maestra_match["barcode"]
        
    # Clave de producto única (preferiblemente SKU, si no barcode, si no nombre)
    prod_key = sku if sku else (bc if bc else name1)
    
    # Campos de clasificación
    line = clean_str(row.get("LINEA"))
    category = clean_str(row.get("CATEGORIA"))
    gender = clean_str(row.get("GENERO"))
    
    # Estilo: usar columna ESTILO-DETALLE.1 si tiene valor desglosado
    style = clean_str(row.get("ESTILO-DETALLE.1"))
    if not style:
        style = clean_str(row.get("ESTILO-DETALLE"))
        
    color = clean_str(row.get("COLOR"))
    size = clean_size(row.get("TALLA"))
    provider = clean_str(row.get("PROVEEDOR-MARCA"))
    
    stock = int(clean_num(row.get("Stock Inicial")))
    cost = int(clean_num(row.get("Costo Compra Unidad")))
    sell = int(clean_num(row.get("Precio Venta")))
    
    # Si ya existe en el diccionario, acumulamos stock (por si acaso)
    if prod_key in products_dict:
        products_dict[prod_key]["stock"] += stock
    else:
        products_dict[prod_key] = {
            "barcode": bc,
            "sku": sku,
            "name": name1,
            "stock": stock,
            "costPrice": cost,
            "sellPrice": sell,
            "line": line,
            "category": category,
            "gender": gender,
            "style": style if style else "-",
            "color": color if color else "-",
            "size": size,
            "provider": provider if provider else "-"
        }

# b. Importar productos nuevos desde COMPRAS
# Agrupar compras válidas por SKU
compras_by_sku = {}
for pur in purchases:
    sku = pur["sku"]
    if sku:
        if sku not in compras_by_sku:
            compras_by_sku[sku] = []
        compras_by_sku[sku].append(pur)

for sku, group in compras_by_sku.items():
    # Si este SKU no está en los productos que importamos de Copia de COMPRAS, lo agregamos como nuevo
    if sku not in products_dict:
        # Obtener datos de la última compra
        last_pur = group[-1]
        
        # Intentar buscar en MAESTRA para completar atributos detallados
        maestra_match = maestra_by_sku.get(sku)
        if not maestra_match and last_pur["name"].upper() in maestra_by_name:
            maestra_match = maestra_by_name[last_pur["name"].upper()]
            
        if maestra_match:
            bc = maestra_match["barcode"] if maestra_match["barcode"] else last_pur["barcode"]
            name = maestra_match["name"]
            line = maestra_match["line"]
            category = maestra_match["category"]
            gender = maestra_match["gender"]
            style = maestra_match["style"]
            color = maestra_match["color"]
            size = maestra_match["size"]
            provider = maestra_match["provider"]
        else:
            # Si no está en maestra, deducimos de la compra y rellenamos por defecto
            bc = last_pur["barcode"]
            name = last_pur["name"]
            line = "-"
            category = "-"
            gender = "-"
            style = "-"
            color = "-"
            size = "-"
            provider = last_pur["provider"]
            
        # El stock es la suma de cantidades compradas en COMPRAS
        total_stock = sum(p["quantity"] for p in group)
        
        products_dict[sku] = {
            "barcode": bc,
            "sku": sku,
            "name": name,
            "stock": total_stock,
            "costPrice": last_pur["costPrice"],
            "sellPrice": last_pur["sellPrice"],
            "line": line if line else "-",
            "category": category if category else "-",
            "gender": gender if gender else "-",
            "style": style if style else "-",
            "color": color if color else "-",
            "size": size,
            "provider": provider if provider else "-"
        }

products = list(products_dict.values())

# === 6. GUARDAR JSON ===
output_data = {
    "config": config,
    "params": params,
    "products": products,
    "purchases": purchases
}

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(output_data, f, ensure_ascii=False, indent=2)

print("\n=== SINOPSIS DEL PROCESAMIENTO ===")
print(f"Configuración guardada. Claves: {list(config.keys())}")
print(f"Params guardados. Conteos: " + ", ".join(f"{k}: {len(v)}" for k, v in params.items()))
print(f"Productos guardados: {len(products)}")
print(f"Compras guardadas: {len(purchases)}")
print(f"Archivo JSON actualizado en: {output_path}")
