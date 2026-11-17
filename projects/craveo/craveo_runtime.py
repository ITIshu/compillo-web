"""
Craveo Stdlib Runtime (Python 3 + SQLite + HTTPServer)

Allows Craveo to run zero-dependency on standard Python 3 when Flask/Jinja2
are not installed in the container, while sharing the same SQLite database
(database/food_delivery.db), routes, seed_data.py, and business logic.
"""

import hashlib
import hmac
import html
import http.cookies
import http.server
import json
import os
import re
import secrets
import socketserver
import sqlite3
import sys
import threading
import urllib.parse
from datetime import datetime, timedelta

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_DIR = os.path.join(BASE_DIR, "database")
DB_PATH = os.path.join(DATABASE_DIR, "food_delivery.db")

DELIVERY_FEE = 29.0
FREE_DELIVERY_ABOVE = 499.0
GST_RATE = 0.05

ORDER_STATUSES = [
    "Placed",
    "Confirmed",
    "Preparing",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
]

STATUS_META = {
    "Placed": {"step": 1, "tone": "info"},
    "Confirmed": {"step": 2, "tone": "info"},
    "Preparing": {"step": 3, "tone": "warn"},
    "Out for Delivery": {"step": 4, "tone": "warn"},
    "Delivered": {"step": 5, "tone": "ok"},
    "Cancelled": {"step": 0, "tone": "bad"},
}

DB_LOCK = threading.RLock()


# ---------------------------------------------------------------------------
# Password hashing (salted PBKDF2-SHA256, zero external dependencies)
# ---------------------------------------------------------------------------
def hash_password(raw_password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), 200_000)
    return f"pbkdf2:sha256:200000${salt}${dk.hex()}"


def verify_password(stored_hash: str, raw_password: str) -> bool:
    if not stored_hash or not raw_password:
        return False
    try:
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        header, salt, expected_hex = parts
        iters = 200_000
        if ":" in header:
            segs = header.split(":")
            if len(segs) == 3 and segs[2].isdigit():
                iters = int(segs[2])
        dk = hashlib.pbkdf2_hmac("sha256", raw_password.encode("utf-8"), salt.encode("utf-8"), iters)
        return hmac.compare_digest(dk.hex(), expected_hex)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# Database connection & schema
# ---------------------------------------------------------------------------
def get_conn():
    os.makedirs(DATABASE_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            phone TEXT,
            address TEXT,
            is_admin INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            slug TEXT NOT NULL UNIQUE,
            emoji TEXT DEFAULT '🍽️'
        );

        CREATE TABLE IF NOT EXISTS restaurants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            cuisine TEXT NOT NULL,
            description TEXT,
            address TEXT,
            city TEXT DEFAULT 'Bengaluru',
            rating REAL DEFAULT 4.2,
            rating_count INTEGER DEFAULT 120,
            delivery_time INTEGER DEFAULT 30,
            price_for_two INTEGER DEFAULT 400,
            image TEXT DEFAULT 'restaurants/default.svg',
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS food_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            image TEXT DEFAULT 'food/default.svg',
            is_veg INTEGER NOT NULL DEFAULT 1,
            is_available INTEGER NOT NULL DEFAULT 1,
            is_bestseller INTEGER NOT NULL DEFAULT 0,
            prep_time INTEGER DEFAULT 20,
            restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
            category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS cart_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            food_id INTEGER NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
            quantity INTEGER NOT NULL DEFAULT 1,
            added_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            user_id INTEGER NOT NULL REFERENCES users(id),
            subtotal REAL NOT NULL DEFAULT 0,
            delivery_fee REAL NOT NULL DEFAULT 0,
            tax REAL NOT NULL DEFAULT 0,
            total REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'Placed',
            payment_method TEXT DEFAULT 'Cash on Delivery',
            payment_status TEXT DEFAULT 'Paid',
            delivery_name TEXT,
            delivery_phone TEXT,
            delivery_address TEXT,
            notes TEXT,
            placed_at TEXT NOT NULL,
            updated_at TEXT,
            eta_minutes INTEGER DEFAULT 35
        );

        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            food_id INTEGER REFERENCES food_items(id) ON DELETE SET NULL,
            food_name TEXT NOT NULL,
            restaurant_name TEXT,
            unit_price REAL NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 1,
            image TEXT
        );

        CREATE TABLE IF NOT EXISTS web_sessions (
            sid TEXT PRIMARY KEY,
            user_id INTEGER,
            csrf_token TEXT NOT NULL,
            flashes_json TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL
        );
        """
    )
    conn.commit()


# ---------------------------------------------------------------------------
# Lightweight ORM Shim so seed_data.py populates SQLite unmodified
# ---------------------------------------------------------------------------
class _ShimRestaurant:
    _by_id = {}

    def __init__(self, **kwargs):
        self.id = None
        self.name = kwargs.get("name", "")
        self.cuisine = kwargs.get("cuisine", "")
        self.description = kwargs.get("description")
        self.address = kwargs.get("address")
        self.city = kwargs.get("city", "Bengaluru")
        self.rating = float(kwargs.get("rating", 4.2))
        self.rating_count = int(kwargs.get("rating_count", 120))
        self.delivery_time = int(kwargs.get("delivery_time", 30))
        self.price_for_two = int(kwargs.get("price_for_two", 400))
        self.image = kwargs.get("image", "restaurants/default.svg")
        self.is_active = 1 if kwargs.get("is_active", True) else 0
        self.created_at = (kwargs.get("created_at") or datetime.utcnow()).isoformat()


class _ShimCategory:
    def __init__(self, **kwargs):
        self.id = None
        self.name = kwargs.get("name", "")
        self.slug = kwargs.get("slug", "")
        self.emoji = kwargs.get("emoji", "🍽️")


class _ShimFoodItem:
    def __init__(self, **kwargs):
        self.id = None
        self.name = kwargs.get("name", "")
        self.description = kwargs.get("description")
        self.price = float(kwargs.get("price", 0))
        self.image = kwargs.get("image", "food/default.svg")
        self.is_veg = 1 if kwargs.get("is_veg", True) else 0
        self.is_available = 1 if kwargs.get("is_available", True) else 0
        self.is_bestseller = 1 if kwargs.get("is_bestseller", False) else 0
        self.prep_time = int(kwargs.get("prep_time", 20))
        self.restaurant_id = kwargs.get("restaurant_id")
        self.category_id = kwargs.get("category_id")

    @property
    def restaurant(self):
        return _ShimRestaurant._by_id.get(self.restaurant_id)


class _ShimUser:
    def __init__(self, **kwargs):
        self.id = None
        self.name = kwargs.get("name", "")
        self.email = kwargs.get("email", "")
        self.password_hash = kwargs.get("password_hash", "")
        self.phone = kwargs.get("phone")
        self.address = kwargs.get("address")
        self.is_admin = 1 if kwargs.get("is_admin", False) else 0
        self.created_at = (kwargs.get("created_at") or datetime.utcnow()).isoformat()

    def set_password(self, raw_password):
        self.password_hash = hash_password(raw_password)


class _ShimOrder:
    def __init__(self, **kwargs):
        self.id = None
        self.order_number = kwargs.get("order_number", "")
        self.user_id = kwargs.get("user_id")
        self.subtotal = float(kwargs.get("subtotal", 0))
        self.delivery_fee = float(kwargs.get("delivery_fee", 0))
        self.tax = float(kwargs.get("tax", 0))
        self.total = float(kwargs.get("total", 0))
        self.status = kwargs.get("status", "Placed")
        self.payment_method = kwargs.get("payment_method", "Cash on Delivery")
        self.payment_status = kwargs.get("payment_status", "Paid")
        self.delivery_name = kwargs.get("delivery_name")
        self.delivery_phone = kwargs.get("delivery_phone")
        self.delivery_address = kwargs.get("delivery_address")
        self.notes = kwargs.get("notes")
        placed = kwargs.get("placed_at") or datetime.utcnow()
        updated = kwargs.get("updated_at") or datetime.utcnow()
        self.placed_at = placed.isoformat() if isinstance(placed, datetime) else str(placed)
        self.updated_at = updated.isoformat() if isinstance(updated, datetime) else str(updated)
        self.eta_minutes = int(kwargs.get("eta_minutes", 35))


class _ShimOrderItem:
    def __init__(self, **kwargs):
        self.id = None
        self.order_id = kwargs.get("order_id")
        self.food_id = kwargs.get("food_id")
        self.food_name = kwargs.get("food_name", "")
        self.restaurant_name = kwargs.get("restaurant_name")
        self.unit_price = float(kwargs.get("unit_price", 0))
        self.quantity = int(kwargs.get("quantity", 1))
        self.image = kwargs.get("image")


class _ShimSession:
    def __init__(self, conn):
        self.conn = conn
        self.pending = []

    def add(self, obj):
        self.pending.append(obj)

    def flush(self):
        cur = self.conn.cursor()
        for obj in self.pending:
            if obj.id is not None:
                continue
            if isinstance(obj, _ShimCategory):
                cur.execute(
                    "INSERT INTO categories (name, slug, emoji) VALUES (?, ?, ?)",
                    (obj.name, obj.slug, obj.emoji),
                )
                obj.id = cur.lastrowid
            elif isinstance(obj, _ShimRestaurant):
                cur.execute(
                    """INSERT INTO restaurants
                    (name, cuisine, description, address, city, rating, rating_count,
                     delivery_time, price_for_two, image, is_active, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        obj.name, obj.cuisine, obj.description, obj.address, obj.city,
                        obj.rating, obj.rating_count, obj.delivery_time, obj.price_for_two,
                        obj.image, obj.is_active, obj.created_at,
                    ),
                )
                obj.id = cur.lastrowid
                _ShimRestaurant._by_id[obj.id] = obj
            elif isinstance(obj, _ShimFoodItem):
                cur.execute(
                    """INSERT INTO food_items
                    (name, description, price, image, is_veg, is_available, is_bestseller,
                     prep_time, restaurant_id, category_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        obj.name, obj.description, obj.price, obj.image, obj.is_veg,
                        obj.is_available, obj.is_bestseller, obj.prep_time,
                        obj.restaurant_id, obj.category_id,
                    ),
                )
                obj.id = cur.lastrowid
            elif isinstance(obj, _ShimUser):
                cur.execute(
                    """INSERT INTO users
                    (name, email, password_hash, phone, address, is_admin, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        obj.name, obj.email, obj.password_hash, obj.phone,
                        obj.address, obj.is_admin, obj.created_at,
                    ),
                )
                obj.id = cur.lastrowid
            elif isinstance(obj, _ShimOrder):
                cur.execute(
                    """INSERT INTO orders
                    (order_number, user_id, subtotal, delivery_fee, tax, total, status,
                     payment_method, payment_status, delivery_name, delivery_phone,
                     delivery_address, notes, placed_at, updated_at, eta_minutes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        obj.order_number, obj.user_id, obj.subtotal, obj.delivery_fee,
                        obj.tax, obj.total, obj.status, obj.payment_method,
                        obj.payment_status, obj.delivery_name, obj.delivery_phone,
                        obj.delivery_address, obj.notes, obj.placed_at,
                        obj.updated_at, obj.eta_minutes,
                    ),
                )
                obj.id = cur.lastrowid
            elif isinstance(obj, _ShimOrderItem):
                cur.execute(
                    """INSERT INTO order_items
                    (order_id, food_id, food_name, restaurant_name, unit_price, quantity, image)
                    VALUES (?, ?, ?, ?, ?, ?, ?)""",
                    (
                        obj.order_id, obj.food_id, obj.food_name, obj.restaurant_name,
                        obj.unit_price, obj.quantity, obj.image,
                    ),
                )
                obj.id = cur.lastrowid
        self.pending.clear()

    def commit(self):
        self.flush()
        self.conn.commit()


class _ShimDB:
    def __init__(self, conn):
        self.session = _ShimSession(conn)


def ensure_database_seeded():
    with DB_LOCK:
        conn = get_conn()
        try:
            init_schema(conn)
            count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
            if count == 0:
                _ShimRestaurant._by_id.clear()
                db_shim = _ShimDB(conn)
                from seed_data import seed_all

                seed_all(
                    db_shim,
                    _ShimUser,
                    _ShimRestaurant,
                    _ShimCategory,
                    _ShimFoodItem,
                    _ShimOrder,
                    _ShimOrderItem,
                )
                return True
            return False
        finally:
            conn.close()


# ---------------------------------------------------------------------------
# Formatting & SVG artwork generators
# ---------------------------------------------------------------------------
def esc(text) -> str:
    return html.escape("" if text is None else str(text), quote=True)


def rupees(value) -> str:
    try:
        v = float(value)
    except (TypeError, ValueError):
        return "₹0"
    if v == int(v):
        return "₹{:,.0f}".format(v)
    return "₹{:,.2f}".format(v)


def datefmt(iso_str: str) -> str:
    if not iso_str:
        return ""
    try:
        dt = datetime.fromisoformat(str(iso_str).replace("Z", ""))
        return dt.strftime("%d %b %Y, %I:%M %p")
    except Exception:
        return str(iso_str)


def user_initials(name: str) -> str:
    parts = [p for p in (name or "").split() if p]
    return "".join(p[0].upper() for p in parts[:2]) or "U"


def veg_dot(is_veg) -> str:
    color = "#15803d" if is_veg else "#b91c1c"
    shape = (
        f'<circle cx="7" cy="7" r="3.4" fill="{color}"/>'
        if is_veg
        else f'<polygon points="7,3 11,10.5 3,10.5" fill="{color}"/>'
    )
    return (
        f'<span title="{"Veg" if is_veg else "Non-Veg"}" '
        f'style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;'
        f'border:1.5px solid {color};border-radius:3px;background:#fff;flex-shrink:0;">'
        f'<svg width="14" height="14" viewBox="0 0 14 14">{shape}</svg></span>'
    )


SVG_PALETTES = [
    ("#ffedd5", "#ea580c", "#9a3412"),
    ("#fee2e2", "#dc2626", "#991b1b"),
    ("#fef3c7", "#d97706", "#92400e"),
    ("#dcfce7", "#16a34a", "#166534"),
    ("#fce7f3", "#db2777", "#9d174d"),
    ("#e0e7ff", "#4f46e5", "#3730a3"),
]


def render_svg_asset(rel_path: str) -> bytes:
    key = rel_path.lower()
    if key == "brand/logo.svg" or key == "brand/favicon.svg":
        svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="16" fill="#E1481F"/>
  <circle cx="32" cy="34" r="17" fill="#FFF7ED"/>
  <circle cx="32" cy="34" r="11" fill="#FDBA74"/>
  <path d="M22 19c2-4 5-6 10-6s8 2 10 6" stroke="#FFF7ED" stroke-width="3.5" stroke-linecap="round" fill="none"/>
</svg>"""
        return svg.encode("utf-8")

    idx = sum(ord(c) for c in key) % len(SVG_PALETTES)
    bg, fg, dark = SVG_PALETTES[idx]

    emoji = "🍽️"
    subtitle = "Craveo Kitchen"
    if "biryani" in key:
        emoji, subtitle = "🍛", "Dum Biryani"
    elif "pizza" in key or "napoli" in key:
        emoji, subtitle = "🍕", "Wood-Fired"
    elif "burger" in key:
        emoji, subtitle = "🍔", "Gourmet Burger"
    elif "dosa" in key or "idli" in key:
        emoji, subtitle = "🥘", "South Indian"
    elif "curry" in key or "naan" in key or "kebab" in key or "spice" in key:
        emoji, subtitle = "🍲", "North Indian"
    elif "noodles" in key or "manchurian" in key or "chilli" in key or "wok" in key or "springroll" in key:
        emoji, subtitle = "🍜", "Wok Tossed"
    elif "momo" in key:
        emoji, subtitle = "🥟", "Steamed Momos"
    elif "salad" in key or "wrap" in key or "green" in key:
        emoji, subtitle = "🥗", "Fresh Bowls"
    elif "cake" in key or "tiramisu" in key or "brownie" in key or "gulab" in key or "kesari" in key or "sweet" in key:
        emoji, subtitle = "🍰", "Patisserie"
    elif "coffee" in key or "shake" in key or "drink" in key:
        emoji, subtitle = "🥤", "Craft Drinks"
    elif "fries" in key or "nuggets" in key or "soup" in key or "bread" in key:
        emoji, subtitle = "🍟", "Hot Starters"

    is_restaurant = key.startswith("restaurants/")
    w, h = (640, 360) if is_restaurant else (400, 300)
    cx, cy = w // 2, h // 2 - 12
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{bg}"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="{w}" height="{h}" fill="url(#g)"/>
  <circle cx="{cx}" cy="{cy}" r="{76 if is_restaurant else 62}" fill="{fg}" opacity="0.14"/>
  <circle cx="{cx}" cy="{cy}" r="{58 if is_restaurant else 46}" fill="#ffffff" stroke="{fg}" stroke-width="2" opacity="0.92"/>
  <text x="{cx}" y="{cy + 16}" font-size="{54 if is_restaurant else 44}" text-anchor="middle">{emoji}</text>
  <text x="{cx}" y="{h - 32}" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="{dark}" text-anchor="middle">{esc(subtitle)}</text>
</svg>"""
    return svg.encode("utf-8")


# ---------------------------------------------------------------------------
# Business queries & helpers
# ---------------------------------------------------------------------------
def get_cart_summary(conn, user_id: int):
    rows = conn.execute(
        """
        SELECT ci.id, ci.quantity, ci.food_id,
               fi.name AS food_name, fi.price, fi.image, fi.is_veg,
               r.id AS restaurant_id, r.name AS restaurant_name
        FROM cart_items ci
        JOIN food_items fi ON fi.id = ci.food_id
        JOIN restaurants r ON r.id = fi.restaurant_id
        WHERE ci.user_id = ?
        ORDER BY ci.added_at DESC
        """,
        (user_id,),
    ).fetchall()

    items = []
    subtotal = 0.0
    count = 0
    for row in rows:
        line_total = round(float(row["price"]) * int(row["quantity"]), 2)
        subtotal += line_total
        count += int(row["quantity"])
        items.append({**dict(row), "line_total": line_total})

    subtotal = round(subtotal, 2)
    delivery_fee = DELIVERY_FEE if (items and subtotal < FREE_DELIVERY_ABOVE) else 0.0
    tax = round(subtotal * GST_RATE, 2)
    total = round(subtotal + delivery_fee + tax, 2)
    return {
        "items": items,
        "count": count,
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "tax": tax,
        "total": total,
        "free_delivery_above": FREE_DELIVERY_ABOVE,
        "amount_to_free_delivery": max(0.0, round(FREE_DELIVERY_ABOVE - subtotal, 2)),
    }


def generate_order_number(conn) -> str:
    while True:
        cand = "CRAV" + datetime.now().strftime("%y%m%d") + "-" + str(secrets.randbelow(9000) + 1000)
        if not conn.execute("SELECT 1 FROM orders WHERE order_number = ?", (cand,)).fetchone():
            return cand


def validate_registration(name, email, password, confirm, phone):
    errors = []
    if not name or len(name.strip()) < 2:
        errors.append("Please enter your full name (at least 2 characters).")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$", email or ""):
        errors.append("Please enter a valid email address.")
    if not password or len(password) < 6:
        errors.append("Password must be at least 6 characters long.")
    if password != confirm:
        errors.append("The two passwords do not match.")
    if phone and not re.match(r"^[6-9]\d{9}$", phone.strip()):
        errors.append("Enter a valid 10-digit Indian mobile number.")
    return errors


# ---------------------------------------------------------------------------
# HTML layout & components
# ---------------------------------------------------------------------------
CRAVEO_CSS = """
:root {
  --bg: #FAF7F2;
  --surface: #FFFFFF;
  --surface-alt: #F4EFE6;
  --ink: #1C1917;
  --muted: #57534E;
  --border: #E7E0D6;
  --accent: #E1481F;
  --accent-dark: #C23612;
  --accent-soft: #FFF0EB;
  --ok: #15803D;
  --warn: #B45309;
  --bad: #B91C1C;
  --radius: 14px;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg);
  color: var(--ink);
  line-height: 1.5;
}
a { color: inherit; text-decoration: none; }
img { display: block; max-width: 100%; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
.nav {
  position: sticky; top: 0; z-index: 40;
  background: rgba(250, 247, 242, 0.94);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border);
}
.nav-inner {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; min-height: 64px; flex-wrap: wrap; padding: 8px 0;
}
.brand { display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
.brand-badge {
  width: 34px; height: 34px; border-radius: 10px; background: var(--accent);
  color: #fff; display: grid; place-items: center; font-weight: 800; font-size: 18px;
}
.nav-links { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.nav-link {
  padding: 7px 12px; border-radius: 9px; font-size: 14px; font-weight: 600; color: var(--muted);
}
.nav-link:hover, .nav-link.active { background: var(--surface-alt); color: var(--ink); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 16px; border-radius: 10px; font-weight: 600; font-size: 14px;
  border: 1px solid transparent; cursor: pointer; font-family: inherit; transition: 140ms ease;
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-dark); }
.btn-outline { background: var(--surface); border-color: var(--border); color: var(--ink); }
.btn-outline:hover { background: var(--surface-alt); }
.btn-sm { padding: 6px 12px; font-size: 13px; border-radius: 8px; }
.btn-danger { background: #FEF2F2; color: var(--bad); border-color: #FECACA; }
.btn-danger:hover { background: #FEE2E2; }
.badge-count {
  display: inline-flex; align-items: center; justify-content: center; min-width: 20px; height: 20px;
  padding: 0 6px; border-radius: 999px; background: var(--accent); color: #fff; font-size: 12px; font-weight: 700;
}
.hero {
  background: linear-gradient(135deg, #1C1917 0%, #2E1A14 55%, #4A1E10 100%);
  color: #FFFDF9; border-radius: 22px; padding: 38px 34px; margin: 22px 0 28px;
  display: grid; grid-template-columns: 1.4fr 1fr; gap: 28px; align-items: center;
}
.hero h1 { font-size: clamp(28px, 4vw, 42px); line-height: 1.12; margin: 0 0 12px; letter-spacing: -0.03em; }
.hero p { color: #E7DED3; font-size: 15px; margin: 0 0 22px; max-width: 540px; }
.search-bar {
  display: flex; gap: 8px; background: #fff; padding: 6px; border-radius: 14px;
  box-shadow: 0 12px 28px rgba(0,0,0,0.2);
}
.search-bar input {
  flex: 1; border: 0; outline: 0; padding: 10px 12px; font-size: 15px; font-family: inherit; color: var(--ink);
}
.section-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  margin: 28px 0 16px;
}
.section-head h2 { margin: 0; font-size: 22px; letter-spacing: -0.02em; }
.grid-cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); gap: 12px; }
.cat-card {
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px;
  padding: 14px 10px; text-align: center; transition: 140ms ease;
}
.cat-card:hover { border-color: var(--accent); transform: translateY(-2px); }
.cat-emoji { font-size: 26px; display: block; margin-bottom: 6px; }
.cat-name { font-size: 13px; font-weight: 700; }
.grid-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(265px, 1fr)); gap: 18px; }
.card {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; display: flex; flex-direction: column; transition: 160ms ease;
}
.card:hover { box-shadow: 0 10px 26px rgba(28,25,23,0.07); transform: translateY(-2px); }
.card-img { width: 100%; height: 158px; object-fit: cover; background: var(--surface-alt); }
.card-body { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 6px; }
.card-title { font-weight: 700; font-size: 16px; margin: 0; }
.muted { color: var(--muted); font-size: 13px; }
.meta-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; margin-top: auto; padding-top: 8px; }
.rating { display: inline-flex; align-items: center; gap: 4px; background: #DCFCE7; color: #166534; font-weight: 700; padding: 2px 8px; border-radius: 6px; font-size: 12px; }
.pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; background: var(--surface-alt); }
.pill-best { background: #FEF3C7; color: #92400E; }
.pill-info { background: #E0F2FE; color: #075985; }
.pill-warn { background: #FEF3C7; color: #92400E; }
.pill-ok { background: #DCFCE7; color: #166534; }
.pill-bad { background: #FEE2E2; color: #991B1B; }
.flash {
  padding: 12px 16px; border-radius: 12px; margin: 14px 0; font-size: 14px; font-weight: 600;
  border: 1px solid transparent;
}
.flash-success { background: #ECFDF5; color: #065F46; border-color: #A7F3D0; }
.flash-error { background: #FEF2F2; color: #991B1B; border-color: #FECACA; }
.flash-info { background: #EFF6FF; color: #1E40AF; border-color: #BFDBFE; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 20px; }
.form-grid { display: grid; gap: 14px; }
.label { display: block; font-size: 13px; font-weight: 700; margin-bottom: 5px; }
.input, .select, .textarea {
  width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border);
  background: #fff; font-family: inherit; font-size: 14px; color: var(--ink);
}
.input:focus, .select:focus, .textarea:focus { outline: 2px solid rgba(225,72,31,0.22); border-color: var(--accent); }
.filter-bar {
  display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
  background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 12px 14px; margin-bottom: 18px;
}
.split-2 { display: grid; grid-template-columns: 1.6fr 1fr; gap: 22px; align-items: start; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 11px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
.timeline { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 18px 0; }
.step {
  padding: 10px 8px; border-radius: 10px; text-align: center; font-size: 12px; font-weight: 700;
  background: var(--surface-alt); color: var(--muted); border: 1px solid var(--border);
}
.step.done { background: #DCFCE7; color: #166534; border-color: #86EFAC; }
.toast {
  position: fixed; bottom: 22px; right: 22px; z-index: 99;
  background: #1C1917; color: #fff; padding: 11px 16px; border-radius: 10px;
  font-size: 13px; font-weight: 600; box-shadow: 0 12px 30px rgba(0,0,0,0.25);
  display: none;
}
footer { margin-top: 48px; padding: 26px 0; border-top: 1px solid var(--border); color: var(--muted); font-size: 13px; }
@media (max-width: 820px) {
  .hero { grid-template-columns: 1fr; padding: 26px 20px; }
  .split-2 { grid-template-columns: 1fr; }
  .timeline { grid-template-columns: 1fr; }
}
"""


def render_page(
    title: str,
    body_html: str,
    *,
    prefix: str,
    user,
    cart_count: int,
    csrf_token: str,
    flashes=None,
    active_nav: str = "",
) -> str:
    flash_html = ""
    for msg, cat in (flashes or []):
        cls = "flash-success" if cat == "success" else ("flash-error" if cat == "error" else "flash-info")
        flash_html += f'<div class="flash {cls}">{esc(msg)}</div>'

    if user:
        if user["is_admin"]:
            auth_nav = f"""
              <a class="nav-link {'active' if active_nav=='admin' else ''}" href="{prefix}/admin">Admin Dashboard</a>
              <a class="nav-link {'active' if active_nav=='profile' else ''}" href="{prefix}/profile">{esc(user['name'].split()[0])}</a>
              <a class="btn btn-outline btn-sm" href="{prefix}/logout">Log out</a>
            """
        else:
            auth_nav = f"""
              <a class="nav-link {'active' if active_nav=='orders' else ''}" href="{prefix}/orders">Orders</a>
              <a class="nav-link {'active' if active_nav=='cart' else ''}" href="{prefix}/cart">
                Cart <span id="nav-cart-badge" class="badge-count">{cart_count}</span>
              </a>
              <a class="nav-link {'active' if active_nav=='profile' else ''}" href="{prefix}/profile">{esc(user['name'].split()[0])}</a>
              <a class="btn btn-outline btn-sm" href="{prefix}/logout">Log out</a>
            """
    else:
        auth_nav = f"""
          <a class="nav-link" href="{prefix}/admin/login">Admin</a>
          <a class="btn btn-outline btn-sm" href="{prefix}/login">Log in</a>
          <a class="btn btn-primary btn-sm" href="{prefix}/register">Sign up</a>
        """

    js = f"""
<script>
const CRAVEO_PREFIX = {json.dumps(prefix)};
const CRAVEO_CSRF = {json.dumps(csrf_token)};
function showToast(msg) {{
  const t = document.getElementById('craveo-toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {{ t.style.display = 'none'; }}, 2600);
}}
async function ajaxAddToCart(e, foodId) {{
  e.preventDefault();
  try {{
    const res = await fetch(CRAVEO_PREFIX + '/cart/add/' + foodId, {{
      method: 'POST',
      headers: {{
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': CRAVEO_CSRF,
        'Content-Type': 'application/x-www-form-urlencoded'
      }},
      body: 'quantity=1&csrf_token=' + encodeURIComponent(CRAVEO_CSRF)
    }});
    if (res.redirected) {{
      window.location.href = res.url;
      return;
    }}
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {{
      window.location.href = CRAVEO_PREFIX + '/login';
      return;
    }}
    const data = await res.json();
    if (!res.ok || !data.ok) {{
      showToast(data.message || 'Please log in to add items.');
      return;
    }}
    const badge = document.getElementById('nav-cart-badge');
    if (badge) badge.textContent = String(data.cart_count);
    showToast(data.message || 'Added to cart!');
  }} catch (err) {{
    showToast('Could not update cart right now.');
  }}
}}
</script>
"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)} — Craveo</title>
  <link rel="icon" href="{prefix}/static/images/brand/favicon.svg" type="image/svg+xml" />
  <style>{CRAVEO_CSS}</style>
</head>
<body>
  <header class="nav">
    <div class="container nav-inner">
      <a class="brand" href="{prefix}/">
        <span class="brand-badge">C</span>
        <span>Craveo</span>
      </a>
      <nav class="nav-links">
        <a class="nav-link {'active' if active_nav=='home' else ''}" href="{prefix}/">Home</a>
        <a class="nav-link {'active' if active_nav=='restaurants' else ''}" href="{prefix}/restaurants">Restaurants</a>
        <a class="nav-link {'active' if active_nav=='search' else ''}" href="{prefix}/search">Search Food</a>
        {auth_nav}
      </nav>
    </div>
  </header>
  <main class="container">
    {flash_html}
    {body_html}
  </main>
  <footer>
    <div class="container" style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
      <span><strong>Craveo</strong> — Fresh meals delivered fast across Bengaluru.</span>
      <span>Demo customer: <code>customer@craveo.com</code> / <code>Customer@123</code> · Admin: <code>admin@craveo.com</code> / <code>Admin@123</code></span>
    </div>
  </footer>
  <div id="craveo-toast" class="toast"></div>
  {js}
</body>
</html>"""


def render_food_card(f, *, prefix: str, csrf_token: str, user, next_url: str = "/") -> str:
    best_badge = '<span class="pill pill-best">Bestseller</span>' if f["is_bestseller"] else ""
    rest_name = esc(f.get("restaurant_name", ""))
    add_action = f"{prefix}/cart/add/{f['id']}"
    if user:
        add_btn = f"""
          <form method="POST" action="{add_action}" onsubmit="return ajaxAddToCart(event, {f['id']})">
            <input type="hidden" name="csrf_token" value="{esc(csrf_token)}" />
            <input type="hidden" name="next" value="{esc(next_url)}" />
            <button type="submit" class="btn btn-primary btn-sm">+ ADD</button>
          </form>
        """
    else:
        add_btn = f'<a class="btn btn-outline btn-sm" href="{prefix}/login">+ ADD</a>'

    return f"""
    <div class="card">
      <img class="card-img" src="{prefix}/static/images/{esc(f['image'])}" alt="{esc(f['name'])}" />
      <div class="card-body">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
          <div style="display:flex;align-items:center;gap:7px;">
            {veg_dot(f['is_veg'])}
            <span class="muted">{rest_name}</span>
          </div>
          {best_badge}
        </div>
        <h3 class="card-title">{esc(f['name'])}</h3>
        <p class="muted" style="margin:0;">{esc((f['description'] or '')[:96])}{'...' if len(f['description'] or '') > 96 else ''}</p>
        <div class="meta-row">
          <strong style="font-size:16px;">{rupees(f['price'])}</strong>
          {add_btn}
        </div>
      </div>
    </div>
    """


def render_restaurant_card(r, *, prefix: str) -> str:
    return f"""
    <a class="card" href="{prefix}/restaurant/{r['id']}">
      <img class="card-img" src="{prefix}/static/images/{esc(r['image'])}" alt="{esc(r['name'])}" />
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
          <h3 class="card-title">{esc(r['name'])}</h3>
          <span class="rating">★ {r['rating']:.1f}</span>
        </div>
        <div class="muted">{esc(r['cuisine'])}</div>
        <div class="meta-row">
          <span class="muted">{int(r['delivery_time'])} mins · {esc(r['city'])}</span>
          <strong>{rupees(r['price_for_two'])} for two</strong>
        </div>
      </div>
    </a>
    """


# ---------------------------------------------------------------------------
# HTTP Handler
# ---------------------------------------------------------------------------
class ReusableThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class CraveoHandler(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format, *args):
        # Clean concise console log
        sys.stdout.write(f"[Craveo] {self.address_string()} - {format % args}\n")
        sys.stdout.flush()

    def get_prefix(self) -> str:
        if self.headers.get("X-Compillo-Proxy") == "1":
            port = self.server.server_address[1]
            return f"/api/ports/proxy/{port}"
        return ""

    def wants_json(self) -> bool:
        xrw = self.headers.get("X-Requested-With", "")
        acc = self.headers.get("Accept", "")
        return xrw == "XMLHttpRequest" or acc.startswith("application/json")

    def parse_cookies(self):
        c = http.cookies.SimpleCookie()
        raw = self.headers.get("Cookie", "")
        if raw:
            try:
                c.load(raw)
            except Exception:
                pass
        return c

    def load_session(self, conn):
        cookies = self.parse_cookies()
        sid = cookies["craveo_sid"].value if "craveo_sid" in cookies else None
        row = None
        if sid:
            row = conn.execute("SELECT * FROM web_sessions WHERE sid = ?", (sid,)).fetchone()
        new_cookie = False
        if not row:
            sid = secrets.token_urlsafe(24)
            csrf = secrets.token_hex(16)
            conn.execute(
                "INSERT INTO web_sessions (sid, user_id, csrf_token, flashes_json, updated_at) VALUES (?, NULL, ?, '[]', ?)",
                (sid, csrf, datetime.utcnow().isoformat()),
            )
            conn.commit()
            row = conn.execute("SELECT * FROM web_sessions WHERE sid = ?", (sid,)).fetchone()
            new_cookie = True

        user = None
        if row["user_id"] is not None:
            user = conn.execute("SELECT * FROM users WHERE id = ?", (row["user_id"],)).fetchone()
        return {
            "sid": sid,
            "csrf": row["csrf_token"],
            "user": dict(user) if user else None,
            "flashes": json.loads(row["flashes_json"] or "[]"),
            "new_cookie": new_cookie,
        }

    def add_flash(self, conn, sid: str, message: str, category: str = "info"):
        row = conn.execute("SELECT flashes_json FROM web_sessions WHERE sid = ?", (sid,)).fetchone()
        flashes = json.loads(row["flashes_json"] or "[]") if row else []
        flashes.append([message, category])
        conn.execute(
            "UPDATE web_sessions SET flashes_json = ?, updated_at = ? WHERE sid = ?",
            (json.dumps(flashes), datetime.utcnow().isoformat(), sid),
        )
        conn.commit()

    def pop_flashes(self, conn, sess):
        flashes = sess.get("flashes") or []
        if flashes:
            conn.execute("UPDATE web_sessions SET flashes_json = '[]' WHERE sid = ?", (sess["sid"],))
            conn.commit()
        return flashes

    def set_session_user(self, conn, sid: str, user_id):
        conn.execute(
            "UPDATE web_sessions SET user_id = ?, updated_at = ? WHERE sid = ?",
            (user_id, datetime.utcnow().isoformat(), sid),
        )
        conn.commit()

    def read_form_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        raw = self.rfile.read(min(length, 2_000_000)).decode("utf-8", errors="replace")
        parsed = urllib.parse.parse_qs(raw, keep_blank_values=True)
        return {k: v[0] for k, v in parsed.items()}

    def send_bytes(self, status: int, content_type: str, data: bytes, sess=None, extra_headers=None):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if sess and sess.get("new_cookie"):
            self.send_header("Set-Cookie", f"craveo_sid={sess['sid']}; Path=/; HttpOnly; SameSite=Lax")
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(data)

    def send_html(self, status: int, doc: str, sess=None):
        self.send_bytes(status, "text/html; charset=utf-8", doc.encode("utf-8"), sess=sess)

    def send_json(self, status: int, payload: dict, sess=None):
        self.send_bytes(status, "application/json; charset=utf-8", json.dumps(payload).encode("utf-8"), sess=sess)

    def send_redirect(self, root_relative_location: str, sess=None):
        # Always send root-relative paths in Location header; Compillo proxy rewrites /... cleanly!
        loc = root_relative_location if root_relative_location.startswith("/") else "/" + root_relative_location
        self.send_response(302)
        self.send_header("Location", loc)
        self.send_header("Content-Length", "0")
        if sess and sess.get("new_cookie"):
            self.send_header("Set-Cookie", f"craveo_sid={sess['sid']}; Path=/; HttpOnly; SameSite=Lax")
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path or "/"
        qs = {k: v[0] for k, v in urllib.parse.parse_qs(parsed.query).items()}
        prefix = self.get_prefix()

        if path.startswith("/static/images/"):
            rel = path[len("/static/images/"):]
            svg = render_svg_asset(rel)
            self.send_bytes(200, "image/svg+xml; charset=utf-8", svg)
            return

        if path == "/api/health":
            self.send_json(200, {"status": "ok", "app": "Craveo", "port": self.server.server_address[1]})
            return

        with DB_LOCK:
            conn = get_conn()
            try:
                sess = self.load_session(conn)
                user = sess["user"]
                cart_sum = get_cart_summary(conn, user["id"]) if user else {"count": 0, "items": [], "subtotal": 0, "delivery_fee": 0, "tax": 0, "total": 0}
                flashes = self.pop_flashes(conn, sess)

                def page(title, body, active_nav="", status=200):
                    doc = render_page(
                        title, body,
                        prefix=prefix, user=user, cart_count=cart_sum["count"],
                        csrf_token=sess["csrf"], flashes=flashes, active_nav=active_nav,
                    )
                    self.send_html(status, doc, sess=sess)

                # ---- Home ----
                if path == "/":
                    restaurants = conn.execute(
                        "SELECT * FROM restaurants WHERE is_active = 1 ORDER BY rating DESC LIMIT 8"
                    ).fetchall()
                    categories = conn.execute("SELECT * FROM categories ORDER BY id").fetchall()
                    trending = conn.execute(
                        """SELECT fi.*, r.name AS restaurant_name
                           FROM food_items fi
                           JOIN restaurants r ON r.id = fi.restaurant_id
                           WHERE fi.is_available = 1 AND r.is_active = 1
                           ORDER BY fi.is_bestseller DESC, fi.price DESC LIMIT 8"""
                    ).fetchall()

                    cats_html = "".join(
                        f'<a class="cat-card" href="{prefix}/search?category={esc(c["slug"])}">'
                        f'<span class="cat-emoji">{esc(c["emoji"])}</span>'
                        f'<span class="cat-name">{esc(c["name"])}</span></a>'
                        for c in categories
                    )
                    rest_html = "".join(render_restaurant_card(dict(r), prefix=prefix) for r in restaurants)
                    food_html = "".join(
                        render_food_card(dict(f), prefix=prefix, csrf_token=sess["csrf"], user=user, next_url="/")
                        for f in trending
                    )
                    body = f"""
                    <section class="hero">
                      <div>
                        <h1>Cravings delivered hot from Bengaluru&apos;s finest kitchens.</h1>
                        <p>Browse 8 curated restaurants and 51 freshly prepared dishes — live cart, simulated UPI/Card checkout, and real-time order tracking.</p>
                        <form class="search-bar" method="GET" action="{prefix}/search">
                          <input type="text" name="q" placeholder="Search biryani, masala dosa, pizza, momos..." />
                          <button type="submit" class="btn btn-primary">Search Food</button>
                        </form>
                      </div>
                      <div class="panel" style="background:rgba(255,255,255,0.08);border-color:rgba(255,255,255,0.16);color:#fff;">
                        <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.06em;color:#FDBA74;font-weight:700;">Quick Demo Sign-In</div>
                        <div style="margin-top:10px;font-size:13px;color:#F5F5F4;">
                          <div>Customer: <code>customer@craveo.com</code> / <code>Customer@123</code></div>
                          <div style="margin-top:4px;">Admin: <code>admin@craveo.com</code> / <code>Admin@123</code></div>
                        </div>
                        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
                          <a class="btn btn-primary btn-sm" href="{prefix}/restaurants">Explore Restaurants</a>
                          <a class="btn btn-outline btn-sm" href="{prefix}/login" style="background:transparent;color:#fff;border-color:rgba(255,255,255,0.35);">Sign In</a>
                        </div>
                      </div>
                    </section>
                    <div class="section-head"><h2>Browse by Category</h2></div>
                    <div class="grid-cats">{cats_html}</div>
                    <div class="section-head">
                      <h2>Top Restaurants</h2>
                      <a class="btn btn-outline btn-sm" href="{prefix}/restaurants">View all →</a>
                    </div>
                    <div class="grid-cards">{rest_html}</div>
                    <div class="section-head">
                      <h2>Trending Dishes</h2>
                      <a class="btn btn-outline btn-sm" href="{prefix}/search">Search menu →</a>
                    </div>
                    <div class="grid-cards">{food_html}</div>
                    """
                    page("Home", body, active_nav="home")
                    return

                # ---- Restaurants ----
                if path == "/restaurants":
                    q = (qs.get("q") or "").strip()
                    cuisine = (qs.get("cuisine") or "").strip()
                    sort = (qs.get("sort") or "rating").strip()
                    veg = qs.get("veg") == "1"

                    sql = "SELECT * FROM restaurants WHERE is_active = 1"
                    params = []
                    if q:
                        sql += " AND (LOWER(name) LIKE ? OR LOWER(cuisine) LIKE ? OR LOWER(city) LIKE ?)"
                        like = f"%{q.lower()}%"
                        params.extend([like, like, like])
                    if cuisine:
                        sql += " AND LOWER(cuisine) LIKE ?"
                        params.append(f"%{cuisine.lower()}%")
                    order_map = {
                        "delivery": "delivery_time ASC",
                        "price_low": "price_for_two ASC",
                        "price_high": "price_for_two DESC",
                    }
                    sql += " ORDER BY " + order_map.get(sort, "rating DESC")
                    results = [dict(r) for r in conn.execute(sql, params).fetchall()]
                    if veg:
                        filtered = []
                        for r in results:
                            foods = conn.execute("SELECT is_veg FROM food_items WHERE restaurant_id = ?", (r["id"],)).fetchall()
                            if foods and all(f["is_veg"] for f in foods):
                                filtered.append(r)
                        results = filtered

                    all_rest = conn.execute("SELECT cuisine FROM restaurants WHERE is_active = 1").fetchall()
                    cuisines = sorted({c.strip() for r in all_rest for c in (r["cuisine"] or "").split(",") if c.strip()})
                    cuisine_opts = "".join(
                        f'<option value="{esc(c)}" {"selected" if c.lower()==cuisine.lower() else ""}>{esc(c)}</option>'
                        for c in cuisines
                    )
                    cards = "".join(render_restaurant_card(r, prefix=prefix) for r in results) or '<div class="panel">No restaurants match your filters.</div>'
                    body = f"""
                    <div class="section-head"><h2>All Restaurants ({len(results)})</h2></div>
                    <form class="filter-bar" method="GET" action="{prefix}/restaurants">
                      <input class="input" style="max-width:240px;" type="text" name="q" value="{esc(q)}" placeholder="Search restaurant or city..." />
                      <select class="select" style="max-width:190px;" name="cuisine">
                        <option value="">All Cuisines</option>{cuisine_opts}
                      </select>
                      <select class="select" style="max-width:180px;" name="sort">
                        <option value="rating" {"selected" if sort=="rating" else ""}>Top Rated</option>
                        <option value="delivery" {"selected" if sort=="delivery" else ""}>Fastest Delivery</option>
                        <option value="price_low" {"selected" if sort=="price_low" else ""}>Cost: Low to High</option>
                        <option value="price_high" {"selected" if sort=="price_high" else ""}>Cost: High to Low</option>
                      </select>
                      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
                        <input type="checkbox" name="veg" value="1" {"checked" if veg else ""} /> Pure Veg
                      </label>
                      <button type="submit" class="btn btn-primary btn-sm">Apply</button>
                      <a class="btn btn-outline btn-sm" href="{prefix}/restaurants">Reset</a>
                    </form>
                    <div class="grid-cards">{cards}</div>
                    """
                    page("Restaurants", body, active_nav="restaurants")
                    return

                # ---- Restaurant Detail ----
                m = re.fullmatch(r"/restaurant/(\d+)", path)
                if m:
                    rid = int(m.group(1))
                    rest = conn.execute("SELECT * FROM restaurants WHERE id = ? AND is_active = 1", (rid,)).fetchone()
                    if not rest:
                        page("Not Found", '<div class="panel"><h2>Restaurant not found</h2><a class="btn btn-primary" href="' + prefix + '/restaurants">Browse restaurants</a></div>', status=404)
                        return
                    veg_only = qs.get("veg") == "1"
                    cat_slug = (qs.get("category") or "").strip()

                    fsql = """SELECT fi.*, r.name AS restaurant_name, c.slug AS cat_slug
                              FROM food_items fi
                              JOIN restaurants r ON r.id = fi.restaurant_id
                              LEFT JOIN categories c ON c.id = fi.category_id
                              WHERE fi.restaurant_id = ? AND fi.is_available = 1"""
                    fparams = [rid]
                    if veg_only:
                        fsql += " AND fi.is_veg = 1"
                    if cat_slug:
                        fsql += " AND c.slug = ?"
                        fparams.append(cat_slug)
                    fsql += " ORDER BY fi.id"
                    foods = [dict(f) for f in conn.execute(fsql, fparams).fetchall()]
                    cats = conn.execute(
                        "SELECT DISTINCT c.* FROM categories c JOIN food_items fi ON fi.category_id = c.id WHERE fi.restaurant_id = ?",
                        (rid,),
                    ).fetchall()
                    cat_tabs = f'<a class="pill" style="{"background:var(--accent);color:#fff;" if not cat_slug else ""}" href="{prefix}/restaurant/{rid}{"?veg=1" if veg_only else ""}">All</a>'
                    for c in cats:
                        active_style = "background:var(--accent);color:#fff;" if cat_slug == c["slug"] else ""
                        cat_tabs += f'<a class="pill" style="{active_style}" href="{prefix}/restaurant/{rid}?category={esc(c["slug"])}{"&veg=1" if veg_only else ""}">{esc(c["emoji"])} {esc(c["name"])}</a>'

                    veg_toggle_url = f"{prefix}/restaurant/{rid}?{'veg=0' if veg_only else 'veg=1'}{f'&category={urllib.parse.quote(cat_slug)}' if cat_slug else ''}"
                    cards = "".join(
                        render_food_card(f, prefix=prefix, csrf_token=sess["csrf"], user=user, next_url=f"/restaurant/{rid}")
                        for f in foods
                    ) or '<div class="panel">No dishes match your filter.</div>'
                    body = f"""
                    <div class="panel" style="margin:20px 0;display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:center;">
                      <img src="{prefix}/static/images/{esc(rest['image'])}" alt="{esc(rest['name'])}" style="border-radius:12px;height:150px;width:100%;object-fit:cover;" />
                      <div>
                        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                          <h1 style="margin:0;font-size:26px;">{esc(rest['name'])}</h1>
                          <span class="rating">★ {rest['rating']:.1f} ({rest['rating_count']})</span>
                        </div>
                        <p class="muted" style="margin:6px 0;">{esc(rest['cuisine'])} · {esc(rest['address'])}, {esc(rest['city'])}</p>
                        <p style="margin:8px 0 12px;font-size:14px;">{esc(rest['description'] or '')}</p>
                        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:13px;">
                          <span class="pill">⏱ {rest['delivery_time']} mins</span>
                          <span class="pill">💰 {rupees(rest['price_for_two'])} for two</span>
                          <a class="pill" style="{"background:#DCFCE7;color:#166534;" if veg_only else ""}" href="{veg_toggle_url}">{"✓ Pure Veg Only" if veg_only else "Veg Filter"}</a>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px;">{cat_tabs}</div>
                    <div class="grid-cards">{cards}</div>
                    """
                    page(rest["name"], body, active_nav="restaurants")
                    return

                # ---- Search ----
                if path == "/search":
                    q = (qs.get("q") or "").strip()
                    veg = qs.get("veg") == "1"
                    cat_slug = (qs.get("category") or "").strip()
                    sort = (qs.get("sort") or "relevance").strip()
                    max_price_raw = (qs.get("max_price") or "").strip()
                    max_price = float(max_price_raw) if max_price_raw.replace(".", "", 1).isdigit() else None

                    fsql = """SELECT fi.*, r.name AS restaurant_name, r.rating AS rest_rating
                              FROM food_items fi
                              JOIN restaurants r ON r.id = fi.restaurant_id
                              LEFT JOIN categories c ON c.id = fi.category_id
                              WHERE fi.is_available = 1 AND r.is_active = 1"""
                    fparams = []
                    if q:
                        like = f"%{q.lower()}%"
                        fsql += " AND (LOWER(fi.name) LIKE ? OR LOWER(fi.description) LIKE ? OR LOWER(r.name) LIKE ? OR LOWER(r.cuisine) LIKE ?)"
                        fparams.extend([like, like, like, like])
                    if veg:
                        fsql += " AND fi.is_veg = 1"
                    if max_price is not None:
                        fsql += " AND fi.price <= ?"
                        fparams.append(max_price)
                    if cat_slug:
                        fsql += " AND c.slug = ?"
                        fparams.append(cat_slug)
                    order_map = {
                        "price_low": "fi.price ASC",
                        "price_high": "fi.price DESC",
                        "rating": "r.rating DESC",
                    }
                    fsql += " ORDER BY " + order_map.get(sort, "fi.is_bestseller DESC, fi.id ASC")
                    results = [dict(f) for f in conn.execute(fsql, fparams).fetchall()]
                    cats = conn.execute("SELECT * FROM categories ORDER BY id").fetchall()
                    cat_opts = "".join(
                        f'<option value="{esc(c["slug"])}" {"selected" if c["slug"]==cat_slug else ""}>{esc(c["name"])}</option>'
                        for c in cats
                    )
                    cards = "".join(
                        render_food_card(f, prefix=prefix, csrf_token=sess["csrf"], user=user, next_url="/search")
                        for f in results
                    ) or '<div class="panel">No dishes found. Try clearing your filters.</div>'
                    body = f"""
                    <div class="section-head"><h2>Search Dishes ({len(results)})</h2></div>
                    <form class="filter-bar" method="GET" action="{prefix}/search">
                      <input class="input" style="max-width:240px;" type="text" name="q" value="{esc(q)}" placeholder="Dish, ingredient, restaurant..." />
                      <select class="select" style="max-width:170px;" name="category"><option value="">All Categories</option>{cat_opts}</select>
                      <input class="input" style="max-width:130px;" type="number" name="max_price" value="{esc(max_price_raw)}" placeholder="Max ₹ price" />
                      <select class="select" style="max-width:160px;" name="sort">
                        <option value="relevance" {"selected" if sort=="relevance" else ""}>Relevance</option>
                        <option value="price_low" {"selected" if sort=="price_low" else ""}>Price: Low to High</option>
                        <option value="price_high" {"selected" if sort=="price_high" else ""}>Price: High to Low</option>
                        <option value="rating" {"selected" if sort=="rating" else ""}>Top Restaurant</option>
                      </select>
                      <label style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;">
                        <input type="checkbox" name="veg" value="1" {"checked" if veg else ""} /> Veg Only
                      </label>
                      <button type="submit" class="btn btn-primary btn-sm">Search</button>
                      <a class="btn btn-outline btn-sm" href="{prefix}/search">Clear</a>
                    </form>
                    <div class="grid-cards">{cards}</div>
                    """
                    page("Search Food", body, active_nav="search")
                    return

                # ---- Auth GET ----
                if path == "/login":
                    if user:
                        self.send_redirect("/", sess=sess)
                        return
                    body = f"""
                    <div class="panel" style="max-width:440px;margin:34px auto;">
                      <h2 style="margin-top:0;">Log in to Craveo</h2>
                      <p class="muted">Demo customer: <code>customer@craveo.com</code> / <code>Customer@123</code></p>
                      <form class="form-grid" method="POST" action="{prefix}/login">
                        <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                        <div><label class="label">Email</label><input class="input" type="email" name="email" required value="customer@craveo.com" /></div>
                        <div><label class="label">Password</label><input class="input" type="password" name="password" required value="Customer@123" /></div>
                        <button class="btn btn-primary" type="submit">Log in</button>
                      </form>
                      <p class="muted" style="margin-top:14px;">New here? <a href="{prefix}/register" style="color:var(--accent);font-weight:700;">Create an account</a> · <a href="{prefix}/admin/login" style="color:var(--accent);font-weight:700;">Admin login</a></p>
                    </div>
                    """
                    page("Log in", body)
                    return

                if path == "/register":
                    if user:
                        self.send_redirect("/", sess=sess)
                        return
                    body = f"""
                    <div class="panel" style="max-width:460px;margin:34px auto;">
                      <h2 style="margin-top:0;">Create your Craveo account</h2>
                      <form class="form-grid" method="POST" action="{prefix}/register">
                        <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                        <div><label class="label">Full Name</label><input class="input" type="text" name="name" required /></div>
                        <div><label class="label">Email</label><input class="input" type="email" name="email" required /></div>
                        <div><label class="label">Mobile (10 digits, optional)</label><input class="input" type="text" name="phone" placeholder="9876543210" /></div>
                        <div><label class="label">Password (min 6 chars)</label><input class="input" type="password" name="password" required /></div>
                        <div><label class="label">Confirm Password</label><input class="input" type="password" name="confirm_password" required /></div>
                        <button class="btn btn-primary" type="submit">Create Account</button>
                      </form>
                    </div>
                    """
                    page("Sign up", body)
                    return

                if path == "/logout":
                    if user:
                        self.set_session_user(conn, sess["sid"], None)
                        self.add_flash(conn, sess["sid"], "You have been logged out.", "info")
                    self.send_redirect("/", sess=sess)
                    return

                if path == "/profile":
                    if not user:
                        self.add_flash(conn, sess["sid"], "Please log in to continue.", "error")
                        self.send_redirect("/login", sess=sess)
                        return
                    u_orders = conn.execute("SELECT * FROM orders WHERE user_id = ? ORDER BY placed_at DESC LIMIT 5", (user["id"],)).fetchall()
                    rows_html = "".join(
                        f'<tr><td><a href="{prefix}/orders/{esc(o["order_number"])}" style="color:var(--accent);font-weight:700;">{esc(o["order_number"])}</a></td>'
                        f'<td>{esc(o["status"])}</td><td>{rupees(o["total"])}</td><td class="muted">{datefmt(o["placed_at"])}</td></tr>'
                        for o in u_orders
                    ) or '<tr><td colspan="4" class="muted">No orders yet.</td></tr>'
                    body = f"""
                    <div class="split-2" style="margin-top:22px;">
                      <div class="panel">
                        <h2 style="margin-top:0;">Your Profile ({user_initials(user['name'])})</h2>
                        <form class="form-grid" method="POST" action="{prefix}/profile">
                          <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                          <div><label class="label">Full Name</label><input class="input" name="name" value="{esc(user['name'])}" required /></div>
                          <div><label class="label">Email</label><input class="input" value="{esc(user['email'])}" disabled /></div>
                          <div><label class="label">Phone</label><input class="input" name="phone" value="{esc(user['phone'] or '')}" /></div>
                          <div><label class="label">Saved Address</label><textarea class="textarea" name="address" rows="3">{esc(user['address'] or '')}</textarea></div>
                          <button class="btn btn-primary" type="submit">Save Profile</button>
                        </form>
                      </div>
                      <div class="panel">
                        <h3 style="margin-top:0;">Recent Orders</h3>
                        <table><thead><tr><th>Order #</th><th>Status</th><th>Total</th><th>Placed</th></tr></thead><tbody>{rows_html}</tbody></table>
                      </div>
                    </div>
                    """
                    page("Profile", body, active_nav="profile")
                    return

                # ---- Cart ----
                if path == "/cart":
                    if not user:
                        self.add_flash(conn, sess["sid"], "Please log in to view your cart.", "error")
                        self.send_redirect("/login", sess=sess)
                        return
                    if not cart_sum["items"]:
                        body = f"""
                        <div class="panel" style="text-align:center;margin:32px auto;max-width:520px;padding:40px 24px;">
                          <h2 style="margin-top:0;">Your cart is empty</h2>
                          <p class="muted">Explore top Bengaluru kitchens and add something delicious.</p>
                          <a class="btn btn-primary" href="{prefix}/restaurants">Browse Restaurants</a>
                        </div>
                        """
                        page("Cart", body, active_nav="cart")
                        return
                    items_rows = ""
                    for it in cart_sum["items"]:
                        items_rows += f"""
                        <tr>
                          <td><strong>{esc(it['food_name'])}</strong><div class="muted">{esc(it['restaurant_name'])}</div></td>
                          <td>{rupees(it['price'])}</td>
                          <td>
                            <div style="display:flex;align-items:center;gap:6px;">
                              <form method="POST" action="{prefix}/cart/update/{it['id']}"><input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" /><input type="hidden" name="action" value="decrease" /><button class="btn btn-outline btn-sm" type="submit">−</button></form>
                              <strong>{it['quantity']}</strong>
                              <form method="POST" action="{prefix}/cart/update/{it['id']}"><input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" /><input type="hidden" name="action" value="increase" /><button class="btn btn-outline btn-sm" type="submit">+</button></form>
                            </div>
                          </td>
                          <td><strong>{rupees(it['line_total'])}</strong></td>
                          <td>
                            <form method="POST" action="{prefix}/cart/remove/{it['id']}"><input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" /><button class="btn btn-danger btn-sm" type="submit">Remove</button></form>
                          </td>
                        </tr>"""
                    free_msg = (
                        f"Add {rupees(cart_sum['amount_to_free_delivery'])} more for FREE delivery!"
                        if cart_sum["amount_to_free_delivery"] > 0
                        else "You unlocked FREE delivery!"
                    )
                    body = f"""
                    <div class="section-head">
                      <h2>Your Cart ({cart_sum['count']} items)</h2>
                      <form method="POST" action="{prefix}/cart/clear"><input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" /><button class="btn btn-outline btn-sm" type="submit">Clear Cart</button></form>
                    </div>
                    <div class="split-2">
                      <div class="panel"><table><thead><tr><th>Dish</th><th>Price</th><th>Qty</th><th>Total</th><th></th></tr></thead><tbody>{items_rows}</tbody></table></div>
                      <div class="panel">
                        <h3 style="margin-top:0;">Bill Summary</h3>
                        <p class="muted">{free_msg}</p>
                        <div style="display:grid;gap:8px;font-size:14px;margin:14px 0;">
                          <div style="display:flex;justify-content:space-between;"><span>Subtotal</span><span>{rupees(cart_sum['subtotal'])}</span></div>
                          <div style="display:flex;justify-content:space-between;"><span>Delivery Fee</span><span>{'FREE' if cart_sum['delivery_fee']==0 else rupees(cart_sum['delivery_fee'])}</span></div>
                          <div style="display:flex;justify-content:space-between;"><span>GST (5%)</span><span>{rupees(cart_sum['tax'])}</span></div>
                          <hr style="border:0;border-top:1px solid var(--border);width:100%;" />
                          <div style="display:flex;justify-content:space-between;font-size:17px;font-weight:800;"><span>Total Payable</span><span>{rupees(cart_sum['total'])}</span></div>
                        </div>
                        <a class="btn btn-primary" style="width:100%;" href="{prefix}/checkout">Proceed to Checkout →</a>
                      </div>
                    </div>
                    """
                    page("Cart", body, active_nav="cart")
                    return

                # ---- Checkout GET ----
                if path == "/checkout":
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    if not cart_sum["items"]:
                        self.add_flash(conn, sess["sid"], "Your cart is empty. Add something delicious first.", "info")
                        self.send_redirect("/restaurants", sess=sess)
                        return
                    body = f"""
                    <div class="section-head"><h2>Checkout</h2></div>
                    <div class="split-2">
                      <form class="panel form-grid" method="POST" action="{prefix}/checkout">
                        <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                        <div><label class="label">Recipient Name</label><input class="input" name="name" value="{esc(user['name'])}" required /></div>
                        <div><label class="label">Mobile Number (10 digits)</label><input class="input" name="phone" value="{esc(user['phone'] or '')}" required placeholder="9812345678" /></div>
                        <div><label class="label">Delivery Address</label><textarea class="textarea" name="address" rows="3" required>{esc(user['address'] or '')}</textarea></div>
                        <div>
                          <label class="label">Payment Method (Simulated)</label>
                          <select class="select" name="payment_method">
                            <option value="Cash on Delivery">Cash on Delivery</option>
                            <option value="UPI">UPI (Instant)</option>
                            <option value="Card">Credit / Debit Card</option>
                          </select>
                        </div>
                        <div><label class="label">Cooking / Delivery Instructions</label><input class="input" name="notes" placeholder="Ring doorbell twice..." /></div>
                        <button class="btn btn-primary" type="submit">Place Order · {rupees(cart_sum['total'])}</button>
                      </form>
                      <div class="panel">
                        <h3 style="margin-top:0;">Order Summary ({cart_sum['count']} items)</h3>
                        {"".join(f'<div style="display:flex;justify-content:space-between;font-size:14px;padding:4px 0;"><span>{it["quantity"]}× {esc(it["food_name"])}</span><span>{rupees(it["line_total"])}</span></div>' for it in cart_sum["items"])}
                        <hr style="border:0;border-top:1px solid var(--border);margin:12px 0;" />
                        <div style="display:flex;justify-content:space-between;font-size:14px;"><span>Delivery</span><span>{'FREE' if cart_sum['delivery_fee']==0 else rupees(cart_sum['delivery_fee'])}</span></div>
                        <div style="display:flex;justify-content:space-between;font-size:14px;"><span>GST (5%)</span><span>{rupees(cart_sum['tax'])}</span></div>
                        <div style="display:flex;justify-content:space-between;font-weight:800;font-size:17px;margin-top:8px;"><span>Total</span><span>{rupees(cart_sum['total'])}</span></div>
                      </div>
                    </div>
                    """
                    page("Checkout", body)
                    return

                # ---- Order Success ----
                ms = re.fullmatch(r"/order/success/([A-Za-z0-9-]+)", path)
                if ms:
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    onum = ms.group(1)
                    order = conn.execute("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", (onum, user["id"])).fetchone()
                    if not order:
                        page("Order Not Found", '<div class="panel">Order not found.</div>', status=404)
                        return
                    body = f"""
                    <div class="panel" style="max-width:580px;margin:34px auto;text-align:center;padding:34px;">
                      <div style="font-size:44px;">🎉</div>
                      <h1 style="margin:8px 0;">Order Confirmed!</h1>
                      <p class="muted">Order <strong>{esc(order['order_number'])}</strong> · Total paid <strong>{rupees(order['total'])}</strong> · ETA {order['eta_minutes']} mins</p>
                      <div style="display:flex;gap:10px;justify-content:center;margin-top:20px;">
                        <a class="btn btn-primary" href="{prefix}/orders/{esc(order['order_number'])}">Track Order</a>
                        <a class="btn btn-outline" href="{prefix}/restaurants">Order More</a>
                      </div>
                    </div>
                    """
                    page("Order Confirmed", body, active_nav="orders")
                    return

                # ---- Orders List ----
                if path == "/orders":
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    status_filter = (qs.get("status") or "").strip()
                    sql = "SELECT * FROM orders WHERE user_id = ?"
                    params = [user["id"]]
                    if status_filter == "live":
                        sql += " AND status IN ('Placed', 'Confirmed', 'Preparing', 'Out for Delivery')"
                    elif status_filter in ORDER_STATUSES:
                        sql += " AND status = ?"
                        params.append(status_filter)
                    sql += " ORDER BY placed_at DESC"
                    u_orders = conn.execute(sql, params).fetchall()
                    rows = ""
                    for o in u_orders:
                        tone = STATUS_META.get(o["status"], {}).get("tone", "info")
                        rows += f"""
                        <tr>
                          <td><a href="{prefix}/orders/{esc(o['order_number'])}" style="color:var(--accent);font-weight:700;">{esc(o['order_number'])}</a></td>
                          <td><span class="pill pill-{tone}">{esc(o['status'])}</span></td>
                          <td>{esc(o['payment_method'])}</td>
                          <td><strong>{rupees(o['total'])}</strong></td>
                          <td class="muted">{datefmt(o['placed_at'])}</td>
                          <td><a class="btn btn-outline btn-sm" href="{prefix}/orders/{esc(o['order_number'])}">Track →</a></td>
                        </tr>"""
                    body = f"""
                    <div class="section-head">
                      <h2>Your Orders ({len(u_orders)})</h2>
                      <div style="display:flex;gap:8px;">
                        <a class="btn btn-outline btn-sm" href="{prefix}/orders">All</a>
                        <a class="btn btn-outline btn-sm" href="{prefix}/orders?status=live">Live</a>
                        <a class="btn btn-outline btn-sm" href="{prefix}/orders?status=Delivered">Delivered</a>
                      </div>
                    </div>
                    <div class="panel"><table><thead><tr><th>Order #</th><th>Status</th><th>Payment</th><th>Total</th><th>Placed</th><th></th></tr></thead><tbody>{rows or '<tr><td colspan="6" class="muted">No matching orders.</td></tr>'}</tbody></table></div>
                    """
                    page("Orders", body, active_nav="orders")
                    return

                # ---- Order Detail ----
                mo = re.fullmatch(r"/orders/([A-Za-z0-9-]+)", path)
                if mo:
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    order = conn.execute("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", (mo.group(1), user["id"])).fetchone()
                    if not order:
                        page("Order Not Found", '<div class="panel">Order not found.</div>', status=404)
                        return
                    oitems = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (order["id"],)).fetchall()
                    step_num = STATUS_META.get(order["status"], {}).get("step", 1)
                    steps = ["Placed", "Confirmed", "Preparing", "Out for Delivery", "Delivered"]
                    timeline_html = '<div class="timeline">' + "".join(
                        f'<div class="step {"done" if idx+1 <= step_num and order["status"] != "Cancelled" else ""}">{s}</div>'
                        for idx, s in enumerate(steps)
                    ) + "</div>"
                    cancel_btn = ""
                    if order["status"] in ("Placed", "Confirmed"):
                        cancel_btn = f'<form method="POST" action="{prefix}/orders/{esc(order["order_number"])}/cancel"><input type="hidden" name="csrf_token" value="{esc(sess["csrf"])}" /><button class="btn btn-danger btn-sm" type="submit">Cancel Order</button></form>'
                    reorder_btn = f'<form method="POST" action="{prefix}/orders/{esc(order["order_number"])}/reorder"><input type="hidden" name="csrf_token" value="{esc(sess["csrf"])}" /><button class="btn btn-primary btn-sm" type="submit">Reorder Items</button></form>'
                    lines_html = "".join(
                        f'<tr><td>{esc(i["food_name"])}<div class="muted">{esc(i["restaurant_name"])}</div></td><td>{i["quantity"]}</td><td>{rupees(i["unit_price"])}</td><td><strong>{rupees(i["unit_price"]*i["quantity"])}</strong></td></tr>'
                        for i in oitems
                    )
                    body = f"""
                    <div class="section-head">
                      <div><h2>Order {esc(order['order_number'])}</h2><div class="muted">Placed {datefmt(order['placed_at'])}</div></div>
                      <div style="display:flex;gap:8px;">{reorder_btn}{cancel_btn}</div>
                    </div>
                    <div class="panel">
                      <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;">
                        <span>Status: <strong>{esc(order['status'])}</strong></span>
                        <span>Delivery to: <strong>{esc(order['delivery_name'])}</strong> ({esc(order['delivery_phone'])}) — {esc(order['delivery_address'])}</span>
                      </div>
                      {timeline_html}
                      <table><thead><tr><th>Dish</th><th>Qty</th><th>Unit</th><th>Line Total</th></tr></thead><tbody>{lines_html}</tbody></table>
                      <div style="margin-top:14px;text-align:right;font-size:15px;">
                        Subtotal: {rupees(order['subtotal'])} · Delivery: {rupees(order['delivery_fee'])} · GST: {rupees(order['tax'])} · <strong>Total: {rupees(order['total'])}</strong>
                      </div>
                    </div>
                    """
                    page(f"Order {order['order_number']}", body, active_nav="orders")
                    return

                # ---- Admin Login ----
                if path == "/admin/login":
                    if user and user["is_admin"]:
                        self.send_redirect("/admin", sess=sess)
                        return
                    body = f"""
                    <div class="panel" style="max-width:440px;margin:34px auto;">
                      <h2 style="margin-top:0;">Craveo Admin Sign-In</h2>
                      <p class="muted">Demo admin: <code>admin@craveo.com</code> / <code>Admin@123</code></p>
                      <form class="form-grid" method="POST" action="{prefix}/admin/login">
                        <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                        <div><label class="label">Admin Email</label><input class="input" type="email" name="email" required value="admin@craveo.com" /></div>
                        <div><label class="label">Password</label><input class="input" type="password" name="password" required value="Admin@123" /></div>
                        <button class="btn btn-primary" type="submit">Open Admin Dashboard</button>
                      </form>
                    </div>
                    """
                    page("Admin Login", body)
                    return

                # ---- Admin Protected Routes ----
                if path.startswith("/admin"):
                    if not user:
                        self.add_flash(conn, sess["sid"], "Please log in as an administrator.", "error")
                        self.send_redirect("/admin/login", sess=sess)
                        return
                    if not user["is_admin"]:
                        self.add_flash(conn, sess["sid"], "You do not have permission to open the admin area.", "error")
                        self.send_redirect("/", sess=sess)
                        return

                    admin_nav = f"""
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:18px 0;">
                      <a class="btn btn-outline btn-sm" href="{prefix}/admin">Overview</a>
                      <a class="btn btn-outline btn-sm" href="{prefix}/admin/orders">Orders</a>
                      <a class="btn btn-outline btn-sm" href="{prefix}/admin/restaurants">Restaurants</a>
                      <a class="btn btn-outline btn-sm" href="{prefix}/admin/foods">Food Items</a>
                      <a class="btn btn-outline btn-sm" href="{prefix}/admin/customers">Customers</a>
                    </div>"""

                    if path == "/admin":
                        rev = conn.execute("SELECT COALESCE(SUM(total), 0.0) FROM orders WHERE status != 'Cancelled'").fetchone()[0]
                        stats = {
                            "orders": conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
                            "live": conn.execute("SELECT COUNT(*) FROM orders WHERE status IN ('Placed','Confirmed','Preparing','Out for Delivery')").fetchone()[0],
                            "customers": conn.execute("SELECT COUNT(*) FROM users WHERE is_admin = 0").fetchone()[0],
                            "restaurants": conn.execute("SELECT COUNT(*) FROM restaurants").fetchone()[0],
                            "foods": conn.execute("SELECT COUNT(*) FROM food_items").fetchone()[0],
                            "revenue": round(float(rev), 2),
                        }
                        recent = conn.execute("SELECT * FROM orders ORDER BY placed_at DESC LIMIT 8").fetchall()
                        rows = "".join(
                            f'<tr><td><a href="{prefix}/admin/orders/{o["id"]}" style="color:var(--accent);font-weight:700;">{esc(o["order_number"])}</a></td>'
                            f'<td>{esc(o["delivery_name"])}</td><td>{esc(o["status"])}</td><td>{rupees(o["total"])}</td></tr>'
                            for o in recent
                        )
                        body = f"""
                        {admin_nav}
                        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:22px;">
                          <div class="panel"><div class="muted">Revenue</div><strong style="font-size:24px;">{rupees(stats['revenue'])}</strong></div>
                          <div class="panel"><div class="muted">Total Orders</div><strong style="font-size:24px;">{stats['orders']}</strong></div>
                          <div class="panel"><div class="muted">Live Orders</div><strong style="font-size:24px;">{stats['live']}</strong></div>
                          <div class="panel"><div class="muted">Restaurants</div><strong style="font-size:24px;">{stats['restaurants']}</strong></div>
                          <div class="panel"><div class="muted">Dishes</div><strong style="font-size:24px;">{stats['foods']}</strong></div>
                          <div class="panel"><div class="muted">Customers</div><strong style="font-size:24px;">{stats['customers']}</strong></div>
                        </div>
                        <div class="panel"><h3 style="margin-top:0;">Recent Orders</h3><table><thead><tr><th>Order #</th><th>Customer</th><th>Status</th><th>Total</th></tr></thead><tbody>{rows}</tbody></table></div>
                        """
                        page("Admin Dashboard", body, active_nav="admin")
                        return

                    if path == "/admin/orders":
                        orders_rows = conn.execute("SELECT * FROM orders ORDER BY placed_at DESC").fetchall()
                        trows = ""
                        for o in orders_rows:
                            opts = "".join(
                                f'<option value="{esc(st)}" {"selected" if st==o["status"] else ""}>{esc(st)}</option>'
                                for st in ORDER_STATUSES
                            )
                            trows += f"""
                            <tr>
                              <td><a href="{prefix}/admin/orders/{o['id']}" style="color:var(--accent);font-weight:700;">{esc(o['order_number'])}</a></td>
                              <td>{esc(o['delivery_name'])}</td>
                              <td>{rupees(o['total'])}</td>
                              <td>
                                <form method="POST" action="{prefix}/admin/orders/{o['id']}/status" style="display:flex;gap:6px;">
                                  <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                                  <select class="select" style="padding:5px 8px;width:auto;" name="status">{opts}</select>
                                  <button class="btn btn-primary btn-sm" type="submit">Update</button>
                                </form>
                              </td>
                            </tr>"""
                        body = f'{admin_nav}<div class="panel"><h2 style="margin-top:0;">Manage Orders</h2><table><thead><tr><th>Order #</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>{trows}</tbody></table></div>'
                        page("Admin Orders", body, active_nav="admin")
                        return

                    mao = re.fullmatch(r"/admin/orders/(\d+)", path)
                    if mao:
                        o = conn.execute("SELECT * FROM orders WHERE id = ?", (int(mao.group(1)),)).fetchone()
                        if not o:
                            page("Not Found", '<div class="panel">Order not found.</div>', status=404)
                            return
                        oitems = conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],)).fetchall()
                        opts = "".join(f'<option value="{esc(st)}" {"selected" if st==o["status"] else ""}>{esc(st)}</option>' for st in ORDER_STATUSES)
                        body = f"""{admin_nav}<div class="panel">
                          <h2 style="margin-top:0;">{esc(o['order_number'])} — {esc(o['status'])}</h2>
                          <p class="muted">{esc(o['delivery_name'])} · {esc(o['delivery_phone'])} · {esc(o['delivery_address'])}</p>
                          <form method="POST" action="{prefix}/admin/orders/{o['id']}/status" style="display:flex;gap:8px;max-width:340px;margin:12px 0;">
                            <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                            <select class="select" name="status">{opts}</select>
                            <button class="btn btn-primary btn-sm" type="submit">Update Status</button>
                          </form>
                          <table><thead><tr><th>Dish</th><th>Restaurant</th><th>Qty</th><th>Unit</th></tr></thead><tbody>{"".join(f'<tr><td>{esc(i["food_name"])}</td><td>{esc(i["restaurant_name"])}</td><td>{i["quantity"]}</td><td>{rupees(i["unit_price"])}</td></tr>' for i in oitems)}</tbody></table>
                        </div>"""
                        page("Admin Order Detail", body, active_nav="admin")
                        return

                    if path == "/admin/restaurants":
                        rests = conn.execute("SELECT * FROM restaurants ORDER BY id DESC").fetchall()
                        rows = "".join(
                            f'<tr><td><strong>{esc(r["name"])}</strong><div class="muted">{esc(r["cuisine"])}</div></td>'
                            f'<td>{esc(r["city"])}</td><td>★ {r["rating"]:.1f}</td><td>{"Active" if r["is_active"] else "Hidden"}</td>'
                            f'<td style="display:flex;gap:6px;"><form method="POST" action="{prefix}/admin/restaurants/{r["id"]}/delete"><input type="hidden" name="csrf_token" value="{esc(sess["csrf"])}" /><button class="btn btn-danger btn-sm" type="submit">Delete</button></form></td></tr>'
                            for r in rests
                        )
                        body = f'{admin_nav}<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h2 style="margin:0;">Restaurants ({len(rests)})</h2><a class="btn btn-primary btn-sm" href="{prefix}/admin/restaurants/add">+ Add Restaurant</a></div><table><thead><tr><th>Restaurant</th><th>City</th><th>Rating</th><th>Status</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>'
                        page("Admin Restaurants", body, active_nav="admin")
                        return

                    if path == "/admin/restaurants/add":
                        body = f"""{admin_nav}<div class="panel" style="max-width:540px;"><h2 style="margin-top:0;">Add Restaurant</h2>
                        <form class="form-grid" method="POST" action="{prefix}/admin/restaurants/add">
                          <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                          <div><label class="label">Name</label><input class="input" name="name" required /></div>
                          <div><label class="label">Cuisine</label><input class="input" name="cuisine" required placeholder="North Indian, Biryani" /></div>
                          <div><label class="label">Address</label><input class="input" name="address" /></div>
                          <div><label class="label">City</label><input class="input" name="city" value="Bengaluru" /></div>
                          <div><label class="label">Description</label><textarea class="textarea" name="description" rows="2"></textarea></div>
                          <button class="btn btn-primary" type="submit">Create Restaurant</button>
                        </form></div>"""
                        page("Add Restaurant", body, active_nav="admin")
                        return

                    if path == "/admin/foods":
                        foods = conn.execute(
                            "SELECT fi.*, r.name AS rname FROM food_items fi JOIN restaurants r ON r.id = fi.restaurant_id ORDER BY fi.id DESC"
                        ).fetchall()
                        rows = "".join(
                            f'<tr><td>{veg_dot(f["is_veg"])} <strong>{esc(f["name"])}</strong></td><td>{esc(f["rname"])}</td><td>{rupees(f["price"])}</td>'
                            f'<td><form method="POST" action="{prefix}/admin/foods/{f["id"]}/delete"><input type="hidden" name="csrf_token" value="{esc(sess["csrf"])}" /><button class="btn btn-danger btn-sm" type="submit">Delete</button></form></td></tr>'
                            for f in foods
                        )
                        body = f'{admin_nav}<div class="panel"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;"><h2 style="margin:0;">Food Items ({len(foods)})</h2><a class="btn btn-primary btn-sm" href="{prefix}/admin/foods/add">+ Add Dish</a></div><table><thead><tr><th>Dish</th><th>Restaurant</th><th>Price</th><th></th></tr></thead><tbody>{rows}</tbody></table></div>'
                        page("Admin Food Items", body, active_nav="admin")
                        return

                    if path == "/admin/foods/add":
                        rest_opts = "".join(
                            f'<option value="{r["id"]}">{esc(r["name"])}</option>'
                            for r in conn.execute("SELECT id, name FROM restaurants ORDER BY name").fetchall()
                        )
                        cat_opts = "".join(
                            f'<option value="{c["id"]}">{esc(c["name"])}</option>'
                            for c in conn.execute("SELECT id, name FROM categories ORDER BY name").fetchall()
                        )
                        body = f"""{admin_nav}<div class="panel" style="max-width:540px;"><h2 style="margin-top:0;">Add Food Item</h2>
                        <form class="form-grid" method="POST" action="{prefix}/admin/foods/add">
                          <input type="hidden" name="csrf_token" value="{esc(sess['csrf'])}" />
                          <div><label class="label">Dish Name</label><input class="input" name="name" required /></div>
                          <div><label class="label">Restaurant</label><select class="select" name="restaurant_id">{rest_opts}</select></div>
                          <div><label class="label">Category</label><select class="select" name="category_id">{cat_opts}</select></div>
                          <div><label class="label">Price (₹)</label><input class="input" type="number" step="0.01" name="price" required /></div>
                          <div><label class="label">Description</label><textarea class="textarea" name="description" rows="2"></textarea></div>
                          <label style="display:flex;align-items:center;gap:8px;font-size:14px;"><input type="checkbox" name="is_veg" value="on" checked /> Vegetarian</label>
                          <button class="btn btn-primary" type="submit">Add Dish</button>
                        </form></div>"""
                        page("Add Food Item", body, active_nav="admin")
                        return

                    if path == "/admin/customers":
                        custs = conn.execute("SELECT * FROM users WHERE is_admin = 0 ORDER BY created_at DESC").fetchall()
                        rows = "".join(
                            f'<tr><td><strong>{esc(c["name"])}</strong></td><td>{esc(c["email"])}</td><td>{esc(c["phone"] or "-")}</td><td class="muted">{datefmt(c["created_at"])}</td></tr>'
                            for c in custs
                        )
                        body = f'{admin_nav}<div class="panel"><h2 style="margin-top:0;">Registered Customers ({len(custs)})</h2><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Joined</th></tr></thead><tbody>{rows}</tbody></table></div>'
                        page("Customers", body, active_nav="admin")
                        return

                # 404 fallback
                page(
                    "Page Not Found",
                    f'<div class="panel" style="text-align:center;margin:34px auto;max-width:480px;"><h2>404 — Page not found</h2><p class="muted">{esc(path)}</p><a class="btn btn-primary" href="{prefix}/">Back to Home</a></div>',
                    status=404,
                )
            finally:
                conn.close()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path or "/"
        form = self.read_form_body()

        with DB_LOCK:
            conn = get_conn()
            try:
                sess = self.load_session(conn)
                user = sess["user"]

                # CSRF check
                sent_csrf = form.get("csrf_token") or self.headers.get("X-CSRF-Token")
                if not sent_csrf or sent_csrf != sess["csrf"]:
                    if self.wants_json():
                        self.send_json(400, {"ok": False, "message": "Session expired. Refresh the page."}, sess=sess)
                        return
                    self.add_flash(conn, sess["sid"], "Your session expired. Please try that again.", "error")
                    self.send_redirect("/", sess=sess)
                    return

                # ---- Auth POST ----
                if path == "/login":
                    email = (form.get("email") or "").strip().lower()
                    password = form.get("password") or ""
                    u = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
                    if not u or not verify_password(u["password_hash"], password):
                        self.add_flash(conn, sess["sid"], "Incorrect email or password.", "error")
                        self.send_redirect("/login", sess=sess)
                        return
                    self.set_session_user(conn, sess["sid"], u["id"])
                    if u["is_admin"]:
                        self.send_redirect("/admin", sess=sess)
                        return
                    self.add_flash(conn, sess["sid"], f"Welcome back, {u['name'].split()[0]}!", "success")
                    self.send_redirect("/", sess=sess)
                    return

                if path == "/register":
                    name = (form.get("name") or "").strip()
                    email = (form.get("email") or "").strip().lower()
                    phone = (form.get("phone") or "").strip()
                    pw = form.get("password") or ""
                    confirm = form.get("confirm_password") or ""
                    errors = validate_registration(name, email, pw, confirm, phone)
                    if not errors and conn.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                        errors.append("An account with this email already exists.")
                    if errors:
                        for err in errors:
                            self.add_flash(conn, sess["sid"], err, "error")
                        self.send_redirect("/register", sess=sess)
                        return
                    cur = conn.execute(
                        "INSERT INTO users (name, email, password_hash, phone, is_admin, created_at) VALUES (?, ?, ?, ?, 0, ?)",
                        (name, email, hash_password(pw), phone or None, datetime.utcnow().isoformat()),
                    )
                    conn.commit()
                    self.set_session_user(conn, sess["sid"], cur.lastrowid)
                    self.add_flash(conn, sess["sid"], f"Welcome to Craveo, {name.split()[0]}!", "success")
                    self.send_redirect("/", sess=sess)
                    return

                if path == "/admin/login":
                    email = (form.get("email") or "").strip().lower()
                    pw = form.get("password") or ""
                    u = conn.execute("SELECT * FROM users WHERE email = ? AND is_admin = 1", (email,)).fetchone()
                    if not u or not verify_password(u["password_hash"], pw):
                        self.add_flash(conn, sess["sid"], "Invalid admin credentials.", "error")
                        self.send_redirect("/admin/login", sess=sess)
                        return
                    self.set_session_user(conn, sess["sid"], u["id"])
                    self.add_flash(conn, sess["sid"], f"Signed in as administrator ({u['name']}).", "success")
                    self.send_redirect("/admin", sess=sess)
                    return

                if path == "/profile":
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    name = (form.get("name") or "").strip()
                    phone = (form.get("phone") or "").strip()
                    address = (form.get("address") or "").strip()
                    if len(name) < 2:
                        self.add_flash(conn, sess["sid"], "Please enter your full name.", "error")
                    elif phone and not re.match(r"^[6-9]\d{9}$", phone):
                        self.add_flash(conn, sess["sid"], "Enter a valid 10-digit mobile number.", "error")
                    else:
                        conn.execute(
                            "UPDATE users SET name = ?, phone = ?, address = ? WHERE id = ?",
                            (name, phone or None, address or None, user["id"]),
                        )
                        conn.commit()
                        self.add_flash(conn, sess["sid"], "Profile updated.", "success")
                    self.send_redirect("/profile", sess=sess)
                    return

                # ---- Cart POST ----
                m_add = re.fullmatch(r"/cart/add/(\d+)", path)
                if m_add:
                    if not user:
                        if self.wants_json():
                            self.send_json(401, {"ok": False, "message": "Please log in to add items to your cart."}, sess=sess)
                            return
                        self.add_flash(conn, sess["sid"], "Please log in to continue.", "error")
                        self.send_redirect("/login", sess=sess)
                        return
                    fid = int(m_add.group(1))
                    food = conn.execute(
                        "SELECT fi.* FROM food_items fi JOIN restaurants r ON r.id = fi.restaurant_id WHERE fi.id = ? AND fi.is_available = 1 AND r.is_active = 1",
                        (fid,),
                    ).fetchone()
                    if not food:
                        if self.wants_json():
                            self.send_json(404, {"ok": False, "message": "This item is unavailable."}, sess=sess)
                            return
                        self.send_redirect("/", sess=sess)
                        return
                    qty = max(1, min(int(form.get("quantity") or 1), 20))
                    existing = conn.execute("SELECT * FROM cart_items WHERE user_id = ? AND food_id = ?", (user["id"], fid)).fetchone()
                    if existing:
                        conn.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", (min(existing["quantity"] + qty, 20), existing["id"]))
                    else:
                        conn.execute(
                            "INSERT INTO cart_items (user_id, food_id, quantity, added_at) VALUES (?, ?, ?, ?)",
                            (user["id"], fid, qty, datetime.utcnow().isoformat()),
                        )
                    conn.commit()
                    summary = get_cart_summary(conn, user["id"])
                    if self.wants_json():
                        self.send_json(200, {"ok": True, "message": f"{food['name']} added to cart", "cart_count": summary["count"], "subtotal": summary["subtotal"]}, sess=sess)
                        return
                    self.add_flash(conn, sess["sid"], f"{food['name']} added to your cart.", "success")
                    nxt = form.get("next") or f"/restaurant/{food['restaurant_id']}"
                    self.send_redirect(nxt if nxt.startswith("/") else "/", sess=sess)
                    return

                m_upd = re.fullmatch(r"/cart/update/(\d+)", path)
                if m_upd:
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    cid = int(m_upd.group(1))
                    item = conn.execute("SELECT * FROM cart_items WHERE id = ? AND user_id = ?", (cid, user["id"])).fetchone()
                    if item:
                        act = form.get("action", "set")
                        if act == "increase":
                            nq = min(item["quantity"] + 1, 20)
                        elif act == "decrease":
                            nq = item["quantity"] - 1
                        else:
                            nq = max(1, min(int(form.get("quantity") or item["quantity"]), 20))
                        if nq <= 0:
                            conn.execute("DELETE FROM cart_items WHERE id = ?", (cid,))
                        else:
                            conn.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", (nq, cid))
                        conn.commit()
                    self.send_redirect("/cart", sess=sess)
                    return

                m_rem = re.fullmatch(r"/cart/remove/(\d+)", path)
                if m_rem:
                    if user:
                        conn.execute("DELETE FROM cart_items WHERE id = ? AND user_id = ?", (int(m_rem.group(1)), user["id"]))
                        conn.commit()
                    self.send_redirect("/cart", sess=sess)
                    return

                if path == "/cart/clear":
                    if user:
                        conn.execute("DELETE FROM cart_items WHERE user_id = ?", (user["id"],))
                        conn.commit()
                    self.send_redirect("/cart", sess=sess)
                    return

                # ---- Checkout POST ----
                if path == "/checkout":
                    if not user:
                        self.send_redirect("/login", sess=sess)
                        return
                    summary = get_cart_summary(conn, user["id"])
                    if not summary["items"]:
                        self.send_redirect("/restaurants", sess=sess)
                        return
                    name = (form.get("name") or "").strip()
                    phone = (form.get("phone") or "").strip()
                    address = (form.get("address") or "").strip()
                    pm = form.get("payment_method") or "Cash on Delivery"
                    notes = (form.get("notes") or "").strip()

                    errors = []
                    if len(name) < 2:
                        errors.append("Please enter the recipient's name.")
                    if not re.match(r"^[6-9]\d{9}$", phone):
                        errors.append("Enter a valid 10-digit mobile number.")
                    if len(address) < 10:
                        errors.append("Please enter a complete delivery address (at least 10 characters).")
                    if pm not in ("Cash on Delivery", "UPI", "Card"):
                        errors.append("Choose a valid payment method.")
                    if errors:
                        for e in errors:
                            self.add_flash(conn, sess["sid"], e, "error")
                        self.send_redirect("/checkout", sess=sess)
                        return

                    onum = generate_order_number(conn)
                    pstatus = "Paid" if pm in ("UPI", "Card") else "Pay on delivery"
                    now_iso = datetime.utcnow().isoformat()
                    eta = max(20, 30 + 5 * min(len(summary["items"]), 4))
                    cur = conn.execute(
                        """INSERT INTO orders
                        (order_number, user_id, subtotal, delivery_fee, tax, total, status,
                         payment_method, payment_status, delivery_name, delivery_phone,
                         delivery_address, notes, placed_at, updated_at, eta_minutes)
                        VALUES (?, ?, ?, ?, ?, ?, 'Placed', ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (
                            onum, user["id"], summary["subtotal"], summary["delivery_fee"],
                            summary["tax"], summary["total"], pm, pstatus, name, phone,
                            address, notes or None, now_iso, now_iso, eta,
                        ),
                    )
                    oid = cur.lastrowid
                    for it in summary["items"]:
                        conn.execute(
                            """INSERT INTO order_items
                            (order_id, food_id, food_name, restaurant_name, unit_price, quantity, image)
                            VALUES (?, ?, ?, ?, ?, ?, ?)""",
                            (oid, it["food_id"], it["food_name"], it["restaurant_name"], it["price"], it["quantity"], it["image"]),
                        )
                    conn.execute("DELETE FROM cart_items WHERE user_id = ?", (user["id"],))
                    conn.commit()
                    self.add_flash(conn, sess["sid"], "Order placed successfully! Your food is on its way soon.", "success")
                    self.send_redirect(f"/order/success/{onum}", sess=sess)
                    return

                # ---- Order Cancel / Reorder ----
                mc = re.fullmatch(r"/orders/([A-Za-z0-9-]+)/cancel", path)
                if mc and user:
                    onum = mc.group(1)
                    o = conn.execute("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", (onum, user["id"])).fetchone()
                    if o and o["status"] in ("Placed", "Confirmed"):
                        conn.execute("UPDATE orders SET status = 'Cancelled', updated_at = ? WHERE id = ?", (datetime.utcnow().isoformat(), o["id"]))
                        conn.commit()
                        self.add_flash(conn, sess["sid"], "Order cancelled.", "info")
                    else:
                        self.add_flash(conn, sess["sid"], "This order can no longer be cancelled.", "error")
                    self.send_redirect(f"/orders/{onum}", sess=sess)
                    return

                mr = re.fullmatch(r"/orders/([A-Za-z0-9-]+)/reorder", path)
                if mr and user:
                    onum = mr.group(1)
                    o = conn.execute("SELECT * FROM orders WHERE order_number = ? AND user_id = ?", (onum, user["id"])).fetchone()
                    if o:
                        for it in conn.execute("SELECT * FROM order_items WHERE order_id = ?", (o["id"],)).fetchall():
                            if not it["food_id"]:
                                continue
                            ex = conn.execute("SELECT * FROM cart_items WHERE user_id = ? AND food_id = ?", (user["id"], it["food_id"])).fetchone()
                            if ex:
                                conn.execute("UPDATE cart_items SET quantity = ? WHERE id = ?", (min(ex["quantity"] + it["quantity"], 20), ex["id"]))
                            else:
                                conn.execute("INSERT INTO cart_items (user_id, food_id, quantity, added_at) VALUES (?, ?, ?, ?)", (user["id"], it["food_id"], min(it["quantity"], 20), datetime.utcnow().isoformat()))
                        conn.commit()
                        self.add_flash(conn, sess["sid"], "Order items added back to your cart.", "success")
                        self.send_redirect("/cart", sess=sess)
                        return

                # ---- Admin POST ----
                if path.startswith("/admin"):
                    if not user or not user["is_admin"]:
                        self.send_redirect("/admin/login", sess=sess)
                        return

                    mos = re.fullmatch(r"/admin/orders/(\d+)/status", path)
                    if mos:
                        oid = int(mos.group(1))
                        st = form.get("status", "")
                        if st in ORDER_STATUSES:
                            conn.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (st, datetime.utcnow().isoformat(), oid))
                            conn.commit()
                            self.add_flash(conn, sess["sid"], f"Order updated to “{st}”.", "success")
                        self.send_redirect("/admin/orders", sess=sess)
                        return

                    if path == "/admin/restaurants/add":
                        name = (form.get("name") or "").strip()
                        cuisine = (form.get("cuisine") or "").strip()
                        if name and cuisine:
                            conn.execute(
                                "INSERT INTO restaurants (name, cuisine, description, address, city, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
                                (name, cuisine, form.get("description") or "", form.get("address") or "", form.get("city") or "Bengaluru", datetime.utcnow().isoformat()),
                            )
                            conn.commit()
                            self.add_flash(conn, sess["sid"], f"Restaurant “{name}” added.", "success")
                        self.send_redirect("/admin/restaurants", sess=sess)
                        return

                    mrd = re.fullmatch(r"/admin/restaurants/(\d+)/delete", path)
                    if mrd:
                        conn.execute("DELETE FROM restaurants WHERE id = ?", (int(mrd.group(1)),))
                        conn.commit()
                        self.add_flash(conn, sess["sid"], "Restaurant deleted.", "info")
                        self.send_redirect("/admin/restaurants", sess=sess)
                        return

                    if path == "/admin/foods/add":
                        name = (form.get("name") or "").strip()
                        price = float(form.get("price") or 0)
                        rid = int(form.get("restaurant_id") or 0)
                        cid = int(form.get("category_id") or 0) or None
                        if name and price > 0 and rid > 0:
                            conn.execute(
                                "INSERT INTO food_items (name, description, price, is_veg, is_available, restaurant_id, category_id) VALUES (?, ?, ?, ?, 1, ?, ?)",
                                (name, form.get("description") or "", price, 1 if form.get("is_veg") == "on" else 0, rid, cid),
                            )
                            conn.commit()
                            self.add_flash(conn, sess["sid"], f"“{name}” added to menu.", "success")
                        self.send_redirect("/admin/foods", sess=sess)
                        return

                    mfd = re.fullmatch(r"/admin/foods/(\d+)/delete", path)
                    if mfd:
                        conn.execute("DELETE FROM food_items WHERE id = ?", (int(mfd.group(1)),))
                        conn.commit()
                        self.add_flash(conn, sess["sid"], "Dish deleted.", "info")
                        self.send_redirect("/admin/foods", sess=sess)
                        return

                self.send_redirect("/", sess=sess)
            finally:
                conn.close()


def resolve_port(default_port=5000):
    if len(sys.argv) > 1 and sys.argv[1].isdigit():
        return int(sys.argv[1]), True
    val = os.environ.get("CRAVEO_PORT")
    if val and val.isdigit():
        return int(val), True
    return default_port, False


def run_server(default_port=5000):
    created = ensure_database_seeded()
    print("Database created and seeded with demo data." if created else "Database ready.", flush=True)

    requested_port, is_explicit = resolve_port(default_port)
    httpd = None
    attempts = 1 if is_explicit else 10
    for offset in range(attempts):
        cand = requested_port + offset
        try:
            httpd = ReusableThreadingTCPServer(("0.0.0.0", cand), CraveoHandler)
            break
        except OSError:
            if offset == attempts - 1:
                raise

    bound_port = httpd.server_address[1]
    print("==================================================", flush=True)
    print(f"  Craveo Food Delivery running at http://127.0.0.1:{bound_port}", flush=True)
    print(f"  Localhost URL: http://localhost:{bound_port}", flush=True)
    print("==================================================", flush=True)
    with httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nCraveo server stopped.")


if __name__ == "__main__":
    run_server()
