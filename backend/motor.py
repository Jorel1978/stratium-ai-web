"""
Stratium AI - Multi-SKU Cost Engine v1.0
Autor: Senior Software Architect (CFO-Tech)
Descripción: Motor de gestión de portafolio multiproducto con BOM, 
             costeo dinámico, análisis de margen y simulador what-if.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Union
from enum import Enum
import json
from copy import deepcopy


# ============================================================
# ESTRUCTURAS DE DATOS (Dataclasses para serialización JSON)
# ============================================================

class UnitType(Enum):
    """Tipos de unidades para insumos"""
    GRAMOS = "gr"
    MILILITROS = "ml"
    UNIDADES = "units"
    KILOGRAMOS = "kg"
    LITROS = "l"
    PORCENTAJE = "%"


@dataclass
class Ingredient:
    """Representa un insumo/materia prima"""
    id: str
    name: str
    unit_price: float  # Precio por unidad base
    unit_type: UnitType
    stock_quantity: float = 0.0
    supplier: Optional[str] = None
    last_updated: Optional[str] = None  # ISO format date
    
    def __post_init__(self):
        if self.unit_price < 0:
            raise ValueError(f"El precio de {self.name} no puede ser negativo")
    
    def to_dict(self) -> dict:
        """Serializar a diccionario para API/JSON"""
        return {
            "id": self.id,
            "name": self.name,
            "unit_price": self.unit_price,
            "unit_type": self.unit_type.value,
            "stock_quantity": self.stock_quantity,
            "supplier": self.supplier,
            "last_updated": self.last_updated
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Ingredient':
        """Crear desde diccionario (deserialización)"""
        data_copy = data.copy()
        data_copy['unit_type'] = UnitType(data_copy['unit_type'])
        return cls(**data_copy)


@dataclass
class BOMItem:
    """Item de la lista de materiales (Bill of Materials)"""
    ingredient_id: str
    quantity: float  # Cantidad necesaria por unidad de producto terminado
    waste_factor: float = 0.0  # Factor de merma (0.05 = 5% de pérdida)
    
    def effective_quantity(self) -> float:
        """Cantidad efectiva considerando merma"""
        return self.quantity * (1 + self.waste_factor)
    
    def to_dict(self) -> dict:
        return {
            "ingredient_id": self.ingredient_id,
            "quantity": self.quantity,
            "waste_factor": self.waste_factor
        }


@dataclass
class Product:
    """Producto terminado con su receta (BOM)"""
    id: str
    name: str
    selling_price: float
    bom: List[BOMItem] = field(default_factory=list)
    fixed_cost_allocation: float = 0.0  # Costos fijos asignados por unidad
    commission_rate: float = 0.0  # Comisión de venta (ej: 0.15 = 15%)
    is_active: bool = True
    
    def __post_init__(self):
        if self.selling_price < 0:
            raise ValueError(f"El precio de venta de {self.name} no puede ser negativo")
        if not (0 <= self.commission_rate <= 1):
            raise ValueError(f"La comisión de {self.name} debe estar entre 0 y 1")
    
    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "selling_price": self.selling_price,
            "bom": [item.to_dict() for item in self.bom],
            "fixed_cost_allocation": self.fixed_cost_allocation,
            "commission_rate": self.commission_rate,
            "is_active": self.is_active
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Product':
        data_copy = data.copy()
        data_copy['bom'] = [BOMItem(**item) for item in data.get('bom', [])]
        return cls(**data_copy)


@dataclass
class CostBreakdown:
    """Desglose detallado de costos para un producto"""
    product_id: str
    product_name: str
    variable_cost: float  # Costos variables (insumos)
    fixed_cost: float     # Costos fijos asignados
    commission_cost: float  # Comisiones
    total_unit_cost: float  # Costo total unitario
    selling_price: float
    gross_margin: float   # Margen bruto absoluto
    margin_percentage: float  # Margen en porcentaje
    is_profitable: bool
    alerts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "product_id": self.product_id,
            "product_name": self.product_name,
            "variable_cost": round(self.variable_cost, 2),
            "fixed_cost": round(self.fixed_cost, 2),
            "commission_cost": round(self.commission_cost, 2),
            "total_unit_cost": round(self.total_unit_cost, 2),
            "selling_price": round(self.selling_price, 2),
            "gross_margin": round(self.gross_margin, 2),
            "margin_percentage": round(self.margin_percentage, 2),
            "is_profitable": self.is_profitable,
            "alerts": self.alerts
        }


# ============================================================
# MOTOR DE COSTEO PRINCIPAL
# ============================================================

class CostEngine:
    """
    Motor central de cálculo de costos multiproducto.
    
    Características:
    - Gestión de recetas (BOM) con múltiples insumos
    - Recálculo automático al cambiar precios de insumos
    - Análisis de margen por SKU con ranking
    - Simulador what-if para impacto de cambios en insumos
    """
    
    MIN_PROFIT_MARGIN = 0.20  # Umbral mínimo de rentabilidad (20%)
    
    def __init__(self, currency: str = "COP", fixed_monthly_costs: float = 0.0):
        """
        Inicializar el motor de costeo.
        
        Args:
            currency: Código de moneda (COP, USD, EUR, etc.)
            fixed_monthly_costs: Costos fijos mensuales del negocio
        """
        self.currency = currency
        self.fixed_monthly_costs = fixed_monthly_costs
        self._ingredients: Dict[str, Ingredient] = {}
        self._products: Dict[str, Product] = {}
        self._cost_cache: Dict[str, CostBreakdown] = {}
    
    # --------------------------------------------------------
    # GESTIÓN DE INSUMOS
    # --------------------------------------------------------
    
    def add_ingredient(self, ingredient: Ingredient) -> None:
        """Agregar o actualizar un insumo"""
        if ingredient.id in self._ingredients:
            # Si el precio cambió, invalidar caché de productos afectados
            old_price = self._ingredients[ingredient.id].unit_price
            if old_price != ingredient.unit_price:
                self._invalidate_cache_for_ingredient(ingredient.id)
        
        self._ingredients[ingredient.id] = ingredient
    
    def update_ingredient_price(self, ingredient_id: str, new_price: float) -> bool:
        """
        Actualizar precio de un insumo y recalcular productos afectados.
        
        Returns:
            True si se actualizó exitosamente, False si no existe el insumo
        """
        if ingredient_id not in self._ingredients:
            return False
        
        ingredient = self._ingredients[ingredient_id]
        ingredient.unit_price = new_price
        ingredient.last_updated = self._get_iso_date()
        
        # Invalidar caché de productos que usan este insumo
        self._invalidate_cache_for_ingredient(ingredient_id)
        
        return True
    
    def bulk_update_prices(self, price_updates: Dict[str, float]) -> Dict[str, bool]:
        """
        Actualizar múltiples precios de insumos de forma masiva.
        
        Args:
            price_updates: Diccionario {ingredient_id: new_price}
        
        Returns:
            Diccionario con resultados por insumo
        """
        results = {}
        for ingredient_id, new_price in price_updates.items():
            results[ingredient_id] = self.update_ingredient_price(ingredient_id, new_price)
        return results
    
    def _invalidate_cache_for_ingredient(self, ingredient_id: str) -> None:
        """Invalidar caché de productos que dependen de un insumo"""
        for product_id, product in self._products.items():
            if any(bom.ingredient_id == ingredient_id for bom in product.bom):
                self._cost_cache.pop(product_id, None)
    
    # --------------------------------------------------------
    # GESTIÓN DE PRODUCTOS
    # --------------------------------------------------------
    
    def add_product(self, product: Product) -> None:
        """Agregar o actualizar un producto terminado"""
        # Validar que todos los insumos del BOM existen
        for bom_item in product.bom:
            if bom_item.ingredient_id not in self._ingredients:
                raise ValueError(
                    f"Producto '{product.name}' referencia insumo inexistente: "
                    f"{bom_item.ingredient_id}"
                )
        
        self._products[product.id] = product
        self._cost_cache.pop(product.id, None)  # Invalidar caché si existía
    
    def remove_product(self, product_id: str) -> bool:
        """Eliminar un producto del portafolio"""
        if product_id in self._products:
            del self._products[product_id]
            self._cost_cache.pop(product_id, None)
            return True
        return False
    
    # --------------------------------------------------------
    # CÁLCULO DE COSTOS (CORE)
    # --------------------------------------------------------
    
    def calculate_product_cost(self, product: Product) -> CostBreakdown:
        """
        Calcular desglose completo de costos para un producto.
        
        Incluye:
        - Costos variables (insumos con merma)
        - Costos fijos asignados
        - Comisiones de venta
        - Margen bruto y porcentaje
        """
        # 1. Calcular costo variable (insumos)
        variable_cost = 0.0
        ingredient_details = []
        
        for bom_item in product.bom:
            ingredient = self._ingredients.get(bom_item.ingredient_id)
            if not ingredient:
                continue  # Ya validado en add_product, pero por seguridad
            
            effective_qty = bom_item.effective_quantity()
            item_cost = effective_qty * ingredient.unit_price
            
            variable_cost += item_cost
            ingredient_details.append({
                "name": ingredient.name,
                "quantity": effective_qty,
                "unit_price": ingredient.unit_price,
                "total": item_cost
            })
        
        # 2. Calcular comisiones
        commission_cost = product.selling_price * product.commission_rate
        
        # 3. Costo total unitario
        total_unit_cost = variable_cost + product.fixed_cost_allocation + commission_cost
        
        # 4. Calcular márgenes
        gross_margin = product.selling_price - total_unit_cost
        margin_percentage = (gross_margin / product.selling_price * 100) if product.selling_price > 0 else 0
        
        # 5. Generar alertas de auditoría
        alerts = []
        if margin_percentage < 0:
            alerts.append(f"❌ PÉRDIDA: Margen negativo de {margin_percentage:.1f}%")
        elif margin_percentage < self.MIN_PROFIT_MARGIN * 100:
            alerts.append(f"⚠️ RIESGO: Margen {margin_percentage:.1f}% bajo umbral {self.MIN_PROFIT_MARGIN*100:.0f}%")
        
        if product.fixed_cost_allocation == 0 and self.fixed_monthly_costs > 0:
            alerts.append("ℹ️ Sin asignación de costos fijos - margen puede estar sobreestimado")
        
        return CostBreakdown(
            product_id=product.id,
            product_name=product.name,
            variable_cost=variable_cost,
            fixed_cost=product.fixed_cost_allocation,
            commission_cost=commission_cost,
            total_unit_cost=total_unit_cost,
            selling_price=product.selling_price,
            gross_margin=gross_margin,
            margin_percentage=margin_percentage,
            is_profitable=margin_percentage >= self.MIN_PROFIT_MARGIN * 100,
            alerts=alerts
        )
    
    def get_cost_breakdown(self, product_id: str) -> Optional[CostBreakdown]:
        """
        Obtener desglose de costos con caché para rendimiento.
        
        Returns:
            CostBreakdown o None si el producto no existe
        """
        if product_id not in self._products:
            return None
        
        # Usar caché si está disponible
        if product_id in self._cost_cache:
            return self._cost_cache[product_id]
        
        # Calcular y guardar en caché
        product = self._products[product_id]
        breakdown = self.calculate_product_cost(product)
        self._cost_cache[product_id] = breakdown
        
        return breakdown
    
    # --------------------------------------------------------
    # ANÁLISIS DE PORTAFOLIO
    # --------------------------------------------------------
    
    def get_portfolio_ranking(self, min_margin_threshold: float = None) -> Dict[str, List[dict]]:
        """
        Generar ranking de productos por rentabilidad.
        
        Returns:
            Diccionario con:
            - 'top_performers': Top 3 productos con mejor margen
            - 'at_risk': Productos con margen < umbral o negativo
            - 'all_products': Lista completa ordenada por margen
        """
        threshold = min_margin_threshold or (self.MIN_PROFIT_MARGIN * 100)
        
        # Calcular márgenes para todos los productos activos
        product_margins = []
        for product_id, product in self._products.items():
            if not product.is_active:
                continue
            
            breakdown = self.get_cost_breakdown(product_id)
            if breakdown:
                product_margins.append({
                    "product_id": product_id,
                    "name": product.name,
                    "selling_price": product.selling_price,
                    "total_cost": breakdown.total_unit_cost,
                    "margin_pct": breakdown.margin_percentage,
                    "margin_abs": breakdown.gross_margin,
                    "is_profitable": breakdown.is_profitable
                })
        
        # Ordenar por margen descendente
        product_margins.sort(key=lambda x: x['margin_pct'], reverse=True)
        
        # Separar categorías
        top_performers = [p for p in product_margins if p['margin_pct'] >= threshold][:3]
        at_risk = [p for p in product_margins if p['margin_pct'] < threshold]
        
        return {
            "top_performers": top_performers,
            "at_risk": at_risk,
            "all_products": product_margins,
            "summary": {
                "total_products": len(product_margins),
                "profitable_count": len([p for p in product_margins if p['is_profitable']]),
                "at_risk_count": len(at_risk),
                "avg_margin": sum(p['margin_pct'] for p in product_margins) / len(product_margins) if product_margins else 0
            }
        }
    
    # --------------------------------------------------------
    # SIMULADOR WHAT-IF (Impact Analysis)
    # --------------------------------------------------------
    
    def simulate_ingredient_price_change(
        self, 
        ingredient_id: str, 
        price_change_percent: float
    ) -> Dict[str, any]:
        """
        Simular impacto de cambio de precio en un insumo.
        
        Args:
            ingredient_id: ID del insumo a simular
            price_change_percent: Cambio porcentual (ej: 15 = +15%, -10 = -10%)
        
        Returns:
            Diccionario con análisis de impacto por producto afectado
        """
        if ingredient_id not in self._ingredients:
            return {"error": f"Insumo '{ingredient_id}' no encontrado"}
        
        ingredient = self._ingredients[ingredient_id]
        original_price = ingredient.unit_price
        new_price = original_price * (1 + price_change_percent / 100)
        
        # Encontrar productos que usan este insumo
        affected_products = []
        
        for product_id, product in self._products.items():
            bom_item = next((b for b in product.bom if b.ingredient_id == ingredient_id), None)
            if not bom_item:
                continue
            
            # Calcular impacto
            original_breakdown = self.get_cost_breakdown(product_id)
            if not original_breakdown:
                continue
            
            # Calcular nuevo costo variable con precio simulado
            original_item_cost = bom_item.effective_quantity() * original_price
            new_item_cost = bom_item.effective_quantity() * new_price
            cost_delta = new_item_cost - original_item_cost
            
            new_total_cost = original_breakdown.total_unit_cost + cost_delta
            new_margin = product.selling_price - new_total_cost
            new_margin_pct = (new_margin / product.selling_price * 100) if product.selling_price > 0 else 0
            
            margin_impact = new_margin_pct - original_breakdown.margin_percentage
            
            affected_products.append({
                "product_id": product_id,
                "product_name": product.name,
                "original_margin_pct": original_breakdown.margin_percentage,
                "new_margin_pct": new_margin_pct,
                "margin_impact": margin_impact,
                "cost_impact": cost_delta,
                "was_profitable": original_breakdown.is_profitable,
                "now_profitable": new_margin_pct >= self.MIN_PROFIT_MARGIN * 100,
                "risk_level": self._assess_risk_level(margin_impact, new_margin_pct)
            })
        
        return {
            "ingredient": {
                "id": ingredient_id,
                "name": ingredient.name,
                "original_price": original_price,
                "simulated_price": new_price,
                "change_percent": price_change_percent
            },
            "affected_products_count": len(affected_products),
            "products": affected_products,
            "summary": {
                "products_at_new_risk": len([p for p in affected_products if not p['now_profitable'] and p['was_profitable']]),
                "max_margin_impact": max((p['margin_impact'] for p in affected_products), default=0),
                "avg_margin_impact": sum(p['margin_impact'] for p in affected_products) / len(affected_products) if affected_products else 0
            }
        }
    
    def _assess_risk_level(self, margin_impact: float, new_margin_pct: float) -> str:
        """Clasificar nivel de riesgo basado en impacto"""
        if new_margin_pct < 0:
            return "CRITICAL"
        elif new_margin_pct < self.MIN_PROFIT_MARGIN * 100:
            return "HIGH"
        elif margin_impact < -10:
            return "MEDIUM"
        else:
            return "LOW"
    
    # --------------------------------------------------------
    # UTILIDADES Y SERIALIZACIÓN
    # --------------------------------------------------------
    
    def export_portfolio_json(self) -> str:
        """Exportar todo el portafolio a JSON para API"""
        portfolio = {
            "currency": self.currency,
            "fixed_monthly_costs": self.fixed_monthly_costs,
            "ingredients": {k: v.to_dict() for k, v in self._ingredients.items()},
            "products": {k: v.to_dict() for k, v in self._products.items()},
            "cost_breakdowns": {k: v.to_dict() for k, v in self._cost_cache.items()}
        }
        return json.dumps(portfolio, indent=2, ensure_ascii=False)
    
    def import_portfolio_json(self, json_data: Union[str, dict]) -> None:
        """Importar portafolio desde JSON (para integración API)"""
        data = json.loads(json_data) if isinstance(json_data, str) else json_data
        
        self.currency = data.get("currency", self.currency)
        self.fixed_monthly_costs = data.get("fixed_monthly_costs", 0)
        
        # Importar insumos
        for ing_data in data.get("ingredients", {}).values():
            ingredient = Ingredient.from_dict(ing_data)
            self.add_ingredient(ingredient)
        
        # Importar productos
        for prod_data in data.get("products", {}).values():
            product = Product.from_dict(prod_data)
            self.add_product(product)
    
    @staticmethod
    def _get_iso_date() -> str:
        """Obtener fecha actual en formato ISO"""
        from datetime import datetime
        return datetime.now().isoformat()


# ============================================================
# EJEMPLO DE USO: CAFETERÍA
# ============================================================

def create_coffee_shop_example() -> CostEngine:
    """
    Crear ejemplo de portafolio de cafetería para demostración.
    
    Productos: Capuchino, Americano, Pastel de Chocolate
    Insumos: Café, Leche, Azúcar, Harina, Cacao, etc.
    """
    engine = CostEngine(currency="COP", fixed_monthly_costs=2_500_000)
    
    # --------------------------------------------------------
    # 1. Registrar Insumos
    # --------------------------------------------------------
    ingredients = [
        Ingredient("coffee_beans", "Granos de Café Premium", 45000, UnitType.KILOGRAMOS),
        Ingredient("milk", "Leche Entera", 3500, UnitType.LITROS),
        Ingredient("sugar", "Azúcar Blanca", 2800, UnitType.KILOGRAMOS),
        Ingredient("flour", "Harina de Trigo", 3200, UnitType.KILOGRAMOS),
        Ingredient("cocoa", "Cacao en Polvo", 28000, UnitType.KILOGRAMOS),
        Ingredient("butter", "Mantequilla", 8500, UnitType.KILOGRAMOS),
        Ingredient("eggs", "Huevos", 450, UnitType.UNIDADES),
        Ingredient("cup_disposable", "Vaso Desechable", 180, UnitType.UNIDADES),
        Ingredient("lid", "Tapa para Vaso", 90, UnitType.UNIDADES),
    ]
    
    for ing in ingredients:
        engine.add_ingredient(ing)
    
    # --------------------------------------------------------
    # 2. Definir Productos con sus Recetas (BOM)
    # --------------------------------------------------------
    
    # Capuchino (250ml)
    capuchino = Product(
        id="capuchino_250",
        name="Capuchino 250ml",
        selling_price=8500,
        bom=[
            BOMItem("coffee_beans", quantity=0.018, waste_factor=0.05),  # 18g con 5% merma
            BOMItem("milk", quantity=0.15),  # 150ml
            BOMItem("sugar", quantity=0.01),  # 10g
            BOMItem("cup_disposable", quantity=1),
            BOMItem("lid", quantity=1),
        ],
        fixed_cost_allocation=1200,  # Costos fijos asignados por unidad
        commission_rate=0.12  # 12% comisión plataformas
    )
    
    # Americano (300ml)
    americano = Product(
        id="americano_300",
        name="Americano 300ml",
        selling_price=6500,
        bom=[
            BOMItem("coffee_beans", quantity=0.022, waste_factor=0.05),  # 22g
            BOMItem("sugar", quantity=0.008),  # 8g
            BOMItem("cup_disposable", quantity=1),
            BOMItem("lid", quantity=1),
        ],
        fixed_cost_allocation=900,
        commission_rate=0.12
    )
    
    # Pastel de Chocolate (porción)
    pastel_chocolate = Product(
        id="chocolate_cake_slice",
        name="Pastel de Chocolate (porción)",
        selling_price=12000,
        bom=[
            BOMItem("flour", quantity=0.08),  # 80g
            BOMItem("cocoa", quantity=0.025),  # 25g
            BOMItem("sugar", quantity=0.04),  # 40g
            BOMItem("butter", quantity=0.03),  # 30g
            BOMItem("eggs", quantity=0.5),  # Medio huevo
            BOMItem("milk", quantity=0.05),  # 50ml
        ],
        fixed_cost_allocation=1800,
        commission_rate=0.15  # Mayor comisión por delivery
    )
    
    for product in [capuchino, americano, pastel_chocolate]:
        engine.add_product(product)
    
    return engine


# ============================================================
# DEMOSTRACIÓN DE FUNCIONALIDADES
# ============================================================

def run_demo():
    """Ejecutar demostración completa del motor"""
    print("🚀 Stratium AI - Multi-SKU Cost Engine Demo\n")
    
    # Crear ejemplo de cafetería
    engine = create_coffee_shop_example()
    
    # 1. Mostrar desglose de costos por producto
    print("📊 ANÁLISIS DE COSTOS POR PRODUCTO")
    print("-" * 60)
    for product_id in engine._products:
        breakdown = engine.get_cost_breakdown(product_id)
        if breakdown:
            print(f"\n☕ {breakdown.product_name}")
            print(f"   Precio Venta: ${breakdown.selling_price:,.0f}")
            print(f"   Costo Variable: ${breakdown.variable_cost:,.0f}")
            print(f"   Costo Fijo: ${breakdown.fixed_cost:,.0f}")
            print(f"   Comisiones: ${breakdown.commission_cost:,.0f}")
            print(f"   ─────────────────")
            print(f"   Costo Total: ${breakdown.total_unit_cost:,.0f}")
            print(f"   Margen Bruto: ${breakdown.gross_margin:,.0f} ({breakdown.margin_percentage:.1f}%)")
            print(f"   Estado: {'✅ Rentable' if breakdown.is_profitable else '❌ No Rentable'}")
            if breakdown.alerts:
                for alert in breakdown.alerts:
                    print(f"   ⚠️ {alert}")
    
    # 2. Ranking de portafolio
    print("\n\n🏆 RANKING DE RENTABILIDAD")
    print("-" * 60)
    ranking = engine.get_portfolio_ranking()
    
    print(f"\n📈 TOP 3 MEJORES MÁRGENES:")
    for i, prod in enumerate(ranking['top_performers'], 1):
        print(f"   {i}. {prod['name']}: {prod['margin_pct']:.1f}% margen")
    
    if ranking['at_risk']:
        print(f"\n⚠️ PRODUCTOS EN RIESGO (<20% margen):")
        for prod in ranking['at_risk']:
            print(f"   • {prod['name']}: {prod['margin_pct']:.1f}% margen")
    
    print(f"\n📋 RESUMEN:")
    print(f"   Total productos: {ranking['summary']['total_products']}")
    print(f"   Rentables: {ranking['summary']['profitable_count']}")
    print(f"   En riesgo: {ranking['summary']['at_risk_count']}")
    print(f"   Margen promedio: {ranking['summary']['avg_margin']:.1f}%")
    
    # 3. Simulador What-If: "¿Qué pasa si el café sube 15%?"
    print("\n\n🔮 SIMULADOR WHAT-IF: Café +15%")
    print("-" * 60)
    simulation = engine.simulate_ingredient_price_change("coffee_beans", 15)
    
    print(f"\nInsumo: {simulation['ingredient']['name']}")
    print(f"Precio original: ${simulation['ingredient']['original_price']:,.0f}/kg")
    print(f"Precio simulado: ${simulation['ingredient']['simulated_price']:,.0f}/kg (+15%)")
    print(f"\nProductos afectados: {simulation['affected_products_count']}")
    
    for prod in simulation['products']:
        risk_icon = "🔴" if prod['risk_level'] == "CRITICAL" else "🟠" if prod['risk_level'] == "HIGH" else "🟡"
        print(f"\n{risk_icon} {prod['product_name']}")
        print(f"   Margen original: {prod['original_margin_pct']:.1f}%")
        print(f"   Margen simulado: {prod['new_margin_pct']:.1f}%")
        print(f"   Impacto: {prod['margin_impact']:+.1f} puntos %")
        print(f"   Rentabilidad: {'✅' if prod['now_profitable'] else '❌'}")
    
    print(f"\n📊 IMPACTO AGREGADO:")
    print(f"   Productos que pasan a riesgo: {simulation['summary']['products_at_new_risk']}")
    print(f"   Máximo impacto en margen: {simulation['summary']['max_margin_impact']:+.1f}%")
    print(f"   Impacto promedio: {simulation['summary']['avg_margin_impact']:+.1f}%")
    
    # 4. Exportar a JSON (para integración API)
    print("\n\n📤 EXPORTACIÓN A JSON")
    print("-" * 60)
    json_output = engine.export_portfolio_json()
    print(f"Portafolio exportado: {len(json_output):,} caracteres")
    print(f"Primeros 200 chars: {json_output[:200]}...")
    
    print("\n✅ Demo completada exitosamente!")


if __name__ == "__main__":
    run_demo()

