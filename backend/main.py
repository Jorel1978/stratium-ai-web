from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .motor import CostEngine, create_coffee_shop_example

# Este es el objeto "app" que el servidor está buscando
app = FastAPI()

# Configuración necesaria para que tu React (Puerto 5173) hable con Python (Puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializamos el motor con el ejemplo de la cafetería
engine = create_coffee_shop_example()

@app.get("/")
def read_root():
    return {"status": "Stratium AI Online"}

@app.get("/api/portfolio/ranking")
def get_ranking():
    return engine.get_portfolio_ranking()

@app.get("/api/products/{product_id}/cost-breakdown")
def get_breakdown(product_id: str):
    # Intentamos obtener el desglose del producto
    breakdown = engine.get_cost_breakdown(product_id)
    if breakdown:
        return breakdown.to_dict()
    return {"error": "Producto no encontrado"}


