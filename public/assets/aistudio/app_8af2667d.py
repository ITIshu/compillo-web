"""
Craveo — a full-stack food delivery web application.

Stack : Python + Flask, Flask-SQLAlchemy (SQLite), Flask-Login, Jinja2, vanilla JS
Author: Craveo project

Run locally:
    python app.py
Then open http://127.0.0.1:5000
"""

import os
import re
import secrets
from datetime import datetime, timedelta
from functools import wraps

from flask import (
    Flask,
    abort,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

# ----------------------------------------------------------------------------
# App configuration
# ----------------------------------------------------------------------------
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_DIR = os.path.join(BASE_DIR, "database")
os.makedirs(DATABASE_DIR, exist_ok=True)

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "craveo-dev-secret-key-change-me-in-production"
)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
    DATABASE_DIR, "food_delivery.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

db = SQLAlchemy(app)

login_manager = LoginManager(app)
login_manager.login_view = "login"
login_manager.login_message = "Please log in to continue."
login_manager.login_message_category = "error"

# Business constants (all values in Indian Rupees)
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


# ----------------------------------------------------------------------------
# Database models
# ----------------------------------------------------------------------------
class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    phone = db.Column(db.String(15), nullable=True)
    address = db.Column(db.Text, nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    cart_items = db.relationship(
        "CartItem", backref="user", lazy=True, cascade="all, delete-orphan"
    )
    orders = db.relationship("Order", backref="user", lazy=True)

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        return check_password_hash(self.password_hash, raw_password)

    @property
    def initials(self):
        parts = [p for p in self.name.split() if p]
        return "".join(p[0].upper() for p in parts[:2]) or "U"

    def __repr__(self):
        return f"<User {self.email}>"


class Restaurant(db.Model):
    __tablename__ = "restaurants"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    cuisine = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    address = db.Column(db.String(200), nullable=True)
    city = db.Column(db.String(80), default="Bengaluru")
    rating = db.Column(db.Float, default=4.2)
    rating_count = db.Column(db.Integer, default=120)
    delivery_time = db.Column(db.Integer, default=30)  # minutes
    price_for_two = db.Column(db.Integer, default=400)
    image = db.Column(db.String(200), default="restaurants/default.svg")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    foods = db.relationship(
        "FoodItem",
        backref="restaurant",
        lazy=True,
        cascade="all, delete-orphan",
        order_by="FoodItem.id",
    )

    @property
    def veg_only(self):
        return bool(self.foods) and all(f.is_veg for f in self.foods)

    def __repr__(self):
        return f"<Restaurant {self.name}>"


class Category(db.Model):
    __tablename__ = "categories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(60), unique=True, nullable=False)
    slug = db.Column(db.String(60), unique=True, nullable=False)
    emoji = db.Column(db.String(10), default="🍽️")

    foods = db.relationship("FoodItem", backref="category", lazy=True)

    def __repr__(self):
        return f"<Category {self.name}>"


class FoodItem(db.Model):
    __tablename__ = "food_items"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    price = db.Column(db.Float, nullable=False)
    image = db.Column(db.String(200), default="food/default.svg")
    is_veg = db.Column(db.Boolean, default=True, nullable=False)
    is_available = db.Column(db.Boolean, default=True, nullable=False)
    is_bestseller = db.Column(db.Boolean, default=False, nullable=False)
    prep_time = db.Column(db.Integer, default=20)
    restaurant_id = db.Column(
        db.Integer, db.ForeignKey("restaurants.id"), nullable=False
    )
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"), nullable=True)

    def __repr__(self):
        return f"<FoodItem {self.name}>"


class CartItem(db.Model):
    __tablename__ = "cart_items"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey("food_items.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    food = db.relationship("FoodItem", lazy="joined")

    @property
    def line_total(self):
        return round(self.food.price * self.quantity, 2)


class Order(db.Model):
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    subtotal = db.Column(db.Float, nullable=False, default=0)
    delivery_fee = db.Column(db.Float, nullable=False, default=0)
    tax = db.Column(db.Float, nullable=False, default=0)
    total = db.Column(db.Float, nullable=False, default=0)
    status = db.Column(db.String(30), default="Placed", nullable=False)
    payment_method = db.Column(db.String(30), default="Cash on Delivery")
    payment_status = db.Column(db.String(30), default="Paid")
    delivery_name = db.Column(db.String(80), nullable=True)
    delivery_phone = db.Column(db.String(15), nullable=True)
    delivery_address = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    placed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(
        db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    eta_minutes = db.Column(db.Integer, default=35)

    items = db.relationship(
        "OrderItem", backref="order", lazy=True, cascade="all, delete-orphan"
    )

    @property
    def item_count(self):
        return sum(i.quantity for i in self.items)

    @property
    def restaurant_names(self):
        names = []
        for item in self.items:
            if item.restaurant_name and item.restaurant_name not in names:
                names.append(item.restaurant_name)
        return names

    @property
    def status_step(self):
        return STATUS_META.get(self.status, {}).get("step", 1)

    @property
    def status_tone(self):
        return STATUS_META.get(self.status, {}).get("tone", "info")

    @property
    def is_live(self):
        return self.status in ("Placed", "Confirmed", "Preparing", "Out for Delivery")

    def __repr__(self):
        return f"<Order {self.order_number}>"


class OrderItem(db.Model):
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    food_id = db.Column(db.Integer, db.ForeignKey("food_items.id"), nullable=True)
    food_name = db.Column(db.String(120), nullable=False)
    restaurant_name = db.Column(db.String(120), nullable=True)
    unit_price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, nullable=False, default=1)
    image = db.Column(db.String(200), nullable=True)

    @property
    def line_total(self):
        return round(self.unit_price * self.quantity, 2)


# ----------------------------------------------------------------------------
# Login manager
# ----------------------------------------------------------------------------
@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


# ----------------------------------------------------------------------------
# CSRF protection (lightweight, no extra dependency)
# ----------------------------------------------------------------------------
def csrf_token():
    if "_csrf_token" not in session:
        session["_csrf_token"] = secrets.token_hex(16)
    return session["_csrf_token"]


app.jinja_env.globals["csrf_token"] = csrf_token


@app.before_request
def protect_from_csrf():
    if request.method != "POST":
        return None
    token = session.get("_csrf_token")
    sent = request.form.get("csrf_token") or request.headers.get("X-CSRF-Token")
    if not token or sent != token:
        if request.path.startswith("/api/"):
            return jsonify(ok=False, message="Session expired. Refresh the page."), 400
        flash("Your session expired. Please try that again.", "error")
        return redirect(request.referrer or url_for("index"))
    return None


# ----------------------------------------------------------------------------
# Helpers
# ----------------------------------------------------------------------------
def admin_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not current_user.is_authenticated:
            flash("Please log in as an administrator.", "error")
            return redirect(url_for("admin_login", next=request.path))
        if not current_user.is_admin:
            flash("You do not have permission to open the admin area.", "error")
            return redirect(url_for("index"))
        return view(*args, **kwargs)

    return wrapper


def wants_json():
    return (
        request.headers.get("X-Requested-With") == "XMLHttpRequest"
        or request.accept_mimetypes.best == "application/json"
    )


def cart_items():
    if not current_user.is_authenticated:
        return []
    return (
        CartItem.query.filter_by(user_id=current_user.id)
        .order_by(CartItem.added_at.desc())
        .all()
    )


def cart_summary(items=None):
    items = cart_items() if items is None else items
    subtotal = round(sum(i.line_total for i in items), 2)
    count = sum(i.quantity for i in items)
    delivery_fee = 0.0
    if items and subtotal < FREE_DELIVERY_ABOVE:
        delivery_fee = DELIVERY_FEE
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


@app.context_processor
def inject_globals():
    summary = cart_summary() if current_user.is_authenticated else {"count": 0}
    return {
        "cart_count": summary["count"],
        "ORDER_STATUSES": ORDER_STATUSES,
        "STATUS_META": STATUS_META,
        "current_year": datetime.now().year,
    }


def generate_order_number():
    while True:
        candidate = "CRAV" + datetime.now().strftime("%y%m%d") + "-" + str(
            secrets.randbelow(9000) + 1000
        )
        if not Order.query.filter_by(order_number=candidate).first():
            return candidate


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


# ----------------------------------------------------------------------------
# Public storefront routes
# ----------------------------------------------------------------------------
@app.route("/")
def index():
    restaurants = (
        Restaurant.query.filter_by(is_active=True)
        .order_by(Restaurant.rating.desc())
        .limit(8)
        .all()
    )
    categories = Category.query.order_by(Category.id).all()
    trending = (
        FoodItem.query.join(Restaurant)
        .filter(FoodItem.is_available.is_(True), Restaurant.is_active.is_(True))
        .order_by(FoodItem.is_bestseller.desc(), FoodItem.price.desc())
        .limit(8)
        .all()
    )
    return render_template(
        "index.html",
        restaurants=restaurants,
        categories=categories,
        trending=trending,
    )


@app.route("/restaurants")
def restaurants():
    q = (request.args.get("q") or "").strip()
    cuisine = (request.args.get("cuisine") or "").strip()
    sort = (request.args.get("sort") or "rating").strip()
    veg = request.args.get("veg") == "1"

    query = Restaurant.query.filter_by(is_active=True)

    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                Restaurant.name.ilike(like),
                Restaurant.cuisine.ilike(like),
                Restaurant.city.ilike(like),
            )
        )
    if cuisine:
        query = query.filter(Restaurant.cuisine.ilike(f"%{cuisine}%"))
    if sort == "delivery":
        query = query.order_by(Restaurant.delivery_time.asc())
    elif sort == "price_low":
        query = query.order_by(Restaurant.price_for_two.asc())
    elif sort == "price_high":
        query = query.order_by(Restaurant.price_for_two.desc())
    else:
        query = query.order_by(Restaurant.rating.desc())

    results = query.all()
    if veg:
        results = [r for r in results if r.veg_only]

    cuisine_options = sorted(
        {c.strip() for r in Restaurant.query.filter_by(is_active=True) for c in (r.cuisine or "").split(",") if c.strip()}
    )

    return render_template(
        "restaurants.html",
        restaurants=results,
        q=q,
        cuisine=cuisine,
        sort=sort,
        veg=veg,
        cuisine_options=cuisine_options,
        total=len(results),
    )


@app.route("/restaurant/<int:restaurant_id>")
def restaurant_detail(restaurant_id):
    restaurant = db.session.get(Restaurant, restaurant_id)
    if not restaurant or not restaurant.is_active:
        abort(404)

    veg_only = request.args.get("veg") == "1"
    category_slug = (request.args.get("category") or "").strip()

    foods = [f for f in restaurant.foods if f.is_available]
    if veg_only:
        foods = [f for f in foods if f.is_veg]
    if category_slug:
        foods = [
            f for f in foods if f.category and f.category.slug == category_slug
        ]

    categories = (
        Category.query.join(FoodItem)
        .filter(FoodItem.restaurant_id == restaurant.id)
        .distinct()
        .all()
    )
    return render_template(
        "restaurant_detail.html",
        restaurant=restaurant,
        foods=foods,
        categories=categories,
        veg_only=veg_only,
        active_category=category_slug,
    )


@app.route("/search")
def search():
    q = (request.args.get("q") or "").strip()
    veg = request.args.get("veg") == "1"
    max_price = request.args.get("max_price", type=float)
    category_slug = (request.args.get("category") or "").strip()
    sort = (request.args.get("sort") or "relevance").strip()

    query = FoodItem.query.join(Restaurant).filter(
        FoodItem.is_available.is_(True), Restaurant.is_active.is_(True)
    )

    if q:
        like = f"%{q}%"
        query = query.filter(
            db.or_(
                FoodItem.name.ilike(like),
                FoodItem.description.ilike(like),
                Restaurant.name.ilike(like),
                Restaurant.cuisine.ilike(like),
            )
        )
    if veg:
        query = query.filter(FoodItem.is_veg.is_(True))
    if max_price:
        query = query.filter(FoodItem.price <= max_price)
    if category_slug:
        query = query.join(Category).filter(Category.slug == category_slug)

    if sort == "price_low":
        query = query.order_by(FoodItem.price.asc())
    elif sort == "price_high":
        query = query.order_by(FoodItem.price.desc())
    elif sort == "rating":
        query = query.order_by(Restaurant.rating.desc())
    else:
        query = query.order_by(FoodItem.is_bestseller.desc(), FoodItem.id.asc())

    results = query.all()
    categories = Category.query.order_by(Category.id).all()

    return render_template(
        "search.html",
        q=q,
        results=results,
        categories=categories,
        veg=veg,
        max_price=max_price,
        active_category=category_slug,
        sort=sort,
    )


# ----------------------------------------------------------------------------
# Authentication
# ----------------------------------------------------------------------------
@app.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    form = {"name": "", "email": "", "phone": ""}
    if request.method == "POST":
        form = {
            "name": request.form.get("name", "").strip(),
            "email": request.form.get("email", "").strip().lower(),
            "phone": request.form.get("phone", "").strip(),
        }
        password = request.form.get("password", "")
        confirm = request.form.get("confirm_password", "")

        errors = validate_registration(
            form["name"], form["email"], password, confirm, form["phone"]
        )
        if not errors and User.query.filter_by(email=form["email"]).first():
            errors.append("An account with this email already exists. Try logging in.")

        if errors:
            for message in errors:
                flash(message, "error")
            return render_template("register.html", form=form)

        user = User(
            name=form["name"], email=form["email"], phone=form["phone"] or None
        )
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        login_user(user)
        flash(f"Welcome to Craveo, {user.name.split()[0]}! Let's get you fed.", "success")
        return redirect(request.args.get("next") or url_for("index"))

    return render_template("register.html", form=form)


@app.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("index"))

    email = ""
    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email).first()

        if not user or not user.check_password(password):
            flash("Incorrect email or password. Please try again.", "error")
            return render_template("login.html", email=email)

        login_user(user, remember=bool(request.form.get("remember")))
        if user.is_admin:
            return redirect(url_for("admin_dashboard"))
        flash(f"Welcome back, {user.name.split()[0]}!", "success")
        return redirect(request.args.get("next") or url_for("index"))

    return render_template("login.html", email=email)


@app.route("/logout")
def logout():
    if current_user.is_authenticated:
        logout_user()
        flash("You have been logged out.", "info")
    return redirect(url_for("index"))


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    if request.method == "POST":
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()

        if len(name) < 2:
            flash("Please enter your full name.", "error")
        elif phone and not re.match(r"^[6-9]\d{9}$", phone):
            flash("Enter a valid 10-digit mobile number.", "error")
        else:
            current_user.name = name
            current_user.phone = phone or None
            current_user.address = address or None
            db.session.commit()
            flash("Profile updated.", "success")
            return redirect(url_for("profile"))

    orders = (
        Order.query.filter_by(user_id=current_user.id)
        .order_by(Order.placed_at.desc())
        .limit(5)
        .all()
    )
    return render_template("profile.html", orders=orders)


# ----------------------------------------------------------------------------
# Cart
# ----------------------------------------------------------------------------
@app.route("/cart")
@login_required
def cart():
    summary = cart_summary()
    return render_template("cart.html", **summary)


@app.route("/cart/add/<int:food_id>", methods=["POST"])
@login_required
def add_to_cart(food_id):
    food = db.session.get(FoodItem, food_id)
    if not food or not food.is_available or not food.restaurant.is_active:
        if wants_json():
            return jsonify(ok=False, message="This item is unavailable."), 404
        flash("That item is not available right now.", "error")
        return redirect(url_for("index"))

    quantity = request.form.get("quantity", 1, type=int) or 1
    quantity = max(1, min(quantity, 20))

    item = CartItem.query.filter_by(user_id=current_user.id, food_id=food.id).first()
    if item:
        item.quantity = min(item.quantity + quantity, 20)
    else:
        item = CartItem(user_id=current_user.id, food_id=food.id, quantity=quantity)
        db.session.add(item)
    db.session.commit()

    summary = cart_summary()
    if wants_json():
        return jsonify(
            ok=True,
            message=f"{food.name} added to cart",
            cart_count=summary["count"],
            subtotal=summary["subtotal"],
            item_id=item.id,
            quantity=item.quantity,
        )
    flash(f"{food.name} added to your cart.", "success")
    return redirect(request.form.get("next") or url_for("restaurant_detail", restaurant_id=food.restaurant_id))


@app.route("/cart/update/<int:item_id>", methods=["POST"])
@login_required
def update_cart(item_id):
    item = CartItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    if not item:
        if wants_json():
            return jsonify(ok=False, message="Item not in cart."), 404
        flash("That item is no longer in your cart.", "error")
        return redirect(url_for("cart"))

    action = request.form.get("action", "set")
    if action == "increase":
        item.quantity = min(item.quantity + 1, 20)
    elif action == "decrease":
        item.quantity -= 1
    else:
        item.quantity = request.form.get("quantity", item.quantity, type=int) or item.quantity
        item.quantity = max(1, min(item.quantity, 20))

    if item.quantity <= 0:
        db.session.delete(item)
    db.session.commit()

    summary = cart_summary()
    if wants_json():
        return jsonify(
            ok=True,
            cart_count=summary["count"],
            subtotal=summary["subtotal"],
            delivery_fee=summary["delivery_fee"],
            tax=summary["tax"],
            total=summary["total"],
            line_total=item.line_total if item.quantity > 0 else 0,
            quantity=item.quantity if item.quantity > 0 else 0,
            removed=item.quantity <= 0,
        )
    return redirect(url_for("cart"))


@app.route("/cart/remove/<int:item_id>", methods=["POST"])
@login_required
def remove_from_cart(item_id):
    item = CartItem.query.filter_by(id=item_id, user_id=current_user.id).first()
    if item:
        db.session.delete(item)
        db.session.commit()

    summary = cart_summary()
    if wants_json():
        return jsonify(ok=True, message="Item removed", cart_count=summary["count"], subtotal=summary["subtotal"])
    flash("Item removed from cart.", "info")
    return redirect(url_for("cart"))


@app.route("/cart/clear", methods=["POST"])
@login_required
def clear_cart():
    CartItem.query.filter_by(user_id=current_user.id).delete()
    db.session.commit()
    if wants_json():
        return jsonify(ok=True, cart_count=0, subtotal=0)
    flash("Cart cleared.", "info")
    return redirect(url_for("cart"))


# ----------------------------------------------------------------------------
# Checkout & orders
# ----------------------------------------------------------------------------
@app.route("/checkout", methods=["GET", "POST"])
@login_required
def checkout():
    summary = cart_summary()
    if not summary["items"]:
        flash("Your cart is empty. Add something delicious first.", "info")
        return redirect(url_for("restaurants"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        payment_method = request.form.get("payment_method", "Cash on Delivery")
        notes = request.form.get("notes", "").strip()

        errors = []
        if len(name) < 2:
            errors.append("Please enter the recipient's name.")
        if not re.match(r"^[6-9]\d{9}$", phone):
            errors.append("Enter a valid 10-digit mobile number.")
        if len(address) < 10:
            errors.append("Please enter a complete delivery address.")
        if payment_method not in ("Cash on Delivery", "UPI", "Card"):
            errors.append("Choose a valid payment method.")

        if errors:
            for message in errors:
                flash(message, "error")
            return render_template(
                "checkout.html",
                **summary,
                form={
                    "name": name,
                    "phone": phone,
                    "address": address,
                    "payment_method": payment_method,
                    "notes": notes,
                },
            )

        # Simulated payment: card/UPI orders are marked paid instantly.
        payment_status = "Paid" if payment_method in ("UPI", "Card") else "Pay on delivery"

        order = Order(
            order_number=generate_order_number(),
            user_id=current_user.id,
            subtotal=summary["subtotal"],
            delivery_fee=summary["delivery_fee"],
            tax=summary["tax"],
            total=summary["total"],
            status="Placed",
            payment_method=payment_method,
            payment_status=payment_status,
            delivery_name=name,
            delivery_phone=phone,
            delivery_address=address,
            notes=notes or None,
            eta_minutes=max(20, 30 + 5 * min(len(summary["items"]), 4)),
        )
        db.session.add(order)
        db.session.flush()

        for cart_item in summary["items"]:
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    food_id=cart_item.food.id,
                    food_name=cart_item.food.name,
                    restaurant_name=cart_item.food.restaurant.name,
                    unit_price=cart_item.food.price,
                    quantity=cart_item.quantity,
                    image=cart_item.food.image,
                )
            )

        # Save address on the profile for next time
        if not current_user.address:
            current_user.address = address
        if not current_user.phone:
            current_user.phone = phone

        CartItem.query.filter_by(user_id=current_user.id).delete()
        db.session.commit()

        flash("Order placed successfully! Your food is on its way soon.", "success")
        return redirect(url_for("order_success", order_number=order.order_number))

    form = {
        "name": current_user.name,
        "phone": current_user.phone or "",
        "address": current_user.address or "",
        "payment_method": "Cash on Delivery",
        "notes": "",
    }
    return render_template("checkout.html", **summary, form=form)


@app.route("/order/success/<order_number>")
@login_required
def order_success(order_number):
    order = Order.query.filter_by(
        order_number=order_number, user_id=current_user.id
    ).first_or_404()
    return render_template("order_success.html", order=order)


@app.route("/orders")
@login_required
def orders():
    status = (request.args.get("status") or "").strip()
    query = Order.query.filter_by(user_id=current_user.id)
    if status == "live":
        query = query.filter(Order.status.in_(["Placed", "Confirmed", "Preparing", "Out for Delivery"]))
    elif status and status in ORDER_STATUSES:
        query = query.filter_by(status=status)
    user_orders = query.order_by(Order.placed_at.desc()).all()
    return render_template("orders.html", orders=user_orders, status=status)


@app.route("/orders/<order_number>")
@login_required
def order_detail(order_number):
    order = Order.query.filter_by(
        order_number=order_number, user_id=current_user.id
    ).first_or_404()
    return render_template("order_detail.html", order=order)


@app.route("/orders/<order_number>/cancel", methods=["POST"])
@login_required
def cancel_order(order_number):
    order = Order.query.filter_by(
        order_number=order_number, user_id=current_user.id
    ).first_or_404()
    if order.status in ("Placed", "Confirmed"):
        order.status = "Cancelled"
        db.session.commit()
        flash("Order cancelled. Any amount paid will be refunded in 3-5 days.", "info")
    else:
        flash("This order can no longer be cancelled. Please contact support.", "error")
    return redirect(url_for("order_detail", order_number=order.order_number))


@app.route("/orders/<order_number>/reorder", methods=["POST"])
@login_required
def reorder(order_number):
    order = Order.query.filter_by(
        order_number=order_number, user_id=current_user.id
    ).first_or_404()
    added = 0
    for item in order.items:
        food = db.session.get(FoodItem, item.food_id) if item.food_id else None
        if not food or not food.is_available:
            continue
        existing = CartItem.query.filter_by(
            user_id=current_user.id, food_id=food.id
        ).first()
        if existing:
            existing.quantity = min(existing.quantity + item.quantity, 20)
        else:
            db.session.add(
                CartItem(
                    user_id=current_user.id,
                    food_id=food.id,
                    quantity=min(item.quantity, 20),
                )
            )
        added += 1
    db.session.commit()
    if added:
        flash(f"{added} item(s) added back to your cart.", "success")
        return redirect(url_for("cart"))
    flash("None of those items are available right now.", "error")
    return redirect(url_for("order_detail", order_number=order.order_number))


# ----------------------------------------------------------------------------
# Admin authentication
# ----------------------------------------------------------------------------
@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if current_user.is_authenticated and current_user.is_admin:
        return redirect(url_for("admin_dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        user = User.query.filter_by(email=email, is_admin=True).first()
        if not user or not user.check_password(password):
            flash("Invalid admin credentials.", "error")
            return render_template("admin/login.html", email=email)
        login_user(user)
        flash(f"Signed in as administrator ({user.name}).", "success")
        return redirect(request.args.get("next") or url_for("admin_dashboard"))

    return render_template("admin/login.html", email="")


# ----------------------------------------------------------------------------
# Admin dashboard
# ----------------------------------------------------------------------------
@app.route("/admin")
@admin_required
def admin_dashboard():
    revenue = (
        db.session.query(func.coalesce(func.sum(Order.total), 0.0))
        .filter(Order.status != "Cancelled")
        .scalar()
        or 0.0
    )
    stats = {
        "orders": Order.query.count(),
        "live_orders": Order.query.filter(
            Order.status.in_(["Placed", "Confirmed", "Preparing", "Out for Delivery"])
        ).count(),
        "customers": User.query.filter_by(is_admin=False).count(),
        "restaurants": Restaurant.query.count(),
        "foods": FoodItem.query.count(),
        "revenue": round(float(revenue), 2),
    }
    recent_orders = Order.query.order_by(Order.placed_at.desc()).limit(8).all()
    top_foods = (
        db.session.query(
            OrderItem.food_name,
            func.sum(OrderItem.quantity).label("qty"),
            func.sum(OrderItem.quantity * OrderItem.unit_price).label("sales"),
        )
        .group_by(OrderItem.food_name)
        .order_by(func.sum(OrderItem.quantity).desc())
        .limit(5)
        .all()
    )
    status_breakdown = (
        db.session.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )
    return render_template(
        "admin/dashboard.html",
        stats=stats,
        recent_orders=recent_orders,
        top_foods=top_foods,
        status_breakdown=dict(status_breakdown),
    )


# ---- Admin: restaurants ----------------------------------------------------
@app.route("/admin/restaurants")
@admin_required
def admin_restaurants():
    q = (request.args.get("q") or "").strip()
    query = Restaurant.query
    if q:
        query = query.filter(
            db.or_(Restaurant.name.ilike(f"%{q}%"), Restaurant.cuisine.ilike(f"%{q}%"))
        )
    items = query.order_by(Restaurant.id.desc()).all()
    return render_template("admin/restaurants.html", restaurants=items, q=q)


def _restaurant_form_values():
    return {
        "name": request.form.get("name", "").strip(),
        "cuisine": request.form.get("cuisine", "").strip(),
        "description": request.form.get("description", "").strip(),
        "address": request.form.get("address", "").strip(),
        "city": request.form.get("city", "Bengaluru").strip(),
        "rating": request.form.get("rating", "4.2", type=float) or 4.2,
        "rating_count": request.form.get("rating_count", 120, type=int) or 120,
        "delivery_time": request.form.get("delivery_time", 30, type=int) or 30,
        "price_for_two": request.form.get("price_for_two", 400, type=int) or 400,
        "image": request.form.get("image", "").strip(),
        "is_active": request.form.get("is_active") == "on",
    }


@app.route("/admin/restaurants/add", methods=["GET", "POST"])
@admin_required
def admin_restaurant_add():
    if request.method == "POST":
        data = _restaurant_form_values()
        if not data["name"] or not data["cuisine"]:
            flash("Restaurant name and cuisine are required.", "error")
            return render_template("admin/restaurant_form.html", restaurant=None, form=data)
        data["image"] = data["image"] or "restaurants/default.svg"
        restaurant = Restaurant(**data)
        db.session.add(restaurant)
        db.session.commit()
        flash(f"Restaurant “{restaurant.name}” added.", "success")
        return redirect(url_for("admin_restaurants"))

    return render_template(
        "admin/restaurant_form.html",
        restaurant=None,
        form={
            "name": "",
            "cuisine": "",
            "description": "",
            "address": "",
            "city": "Bengaluru",
            "rating": 4.2,
            "rating_count": 120,
            "delivery_time": 30,
            "price_for_two": 400,
            "image": "restaurants/default.svg",
            "is_active": True,
        },
    )


@app.route("/admin/restaurants/<int:restaurant_id>/edit", methods=["GET", "POST"])
@admin_required
def admin_restaurant_edit(restaurant_id):
    restaurant = db.session.get(Restaurant, restaurant_id)
    if not restaurant:
        abort(404)

    if request.method == "POST":
        data = _restaurant_form_values()
        if not data["name"] or not data["cuisine"]:
            flash("Restaurant name and cuisine are required.", "error")
            return render_template(
                "admin/restaurant_form.html", restaurant=restaurant, form=data
            )
        data["image"] = data["image"] or restaurant.image or "restaurants/default.svg"
        for key, value in data.items():
            setattr(restaurant, key, value)
        db.session.commit()
        flash(f"Restaurant “{restaurant.name}” updated.", "success")
        return redirect(url_for("admin_restaurants"))

    return render_template(
        "admin/restaurant_form.html",
        restaurant=restaurant,
        form={
            "name": restaurant.name,
            "cuisine": restaurant.cuisine,
            "description": restaurant.description or "",
            "address": restaurant.address or "",
            "city": restaurant.city or "",
            "rating": restaurant.rating,
            "rating_count": restaurant.rating_count,
            "delivery_time": restaurant.delivery_time,
            "price_for_two": restaurant.price_for_two,
            "image": restaurant.image,
            "is_active": restaurant.is_active,
        },
    )


@app.route("/admin/restaurants/<int:restaurant_id>/delete", methods=["POST"])
@admin_required
def admin_restaurant_delete(restaurant_id):
    restaurant = db.session.get(Restaurant, restaurant_id)
    if not restaurant:
        abort(404)
    name = restaurant.name
    db.session.delete(restaurant)
    db.session.commit()
    flash(f"Restaurant “{name}” and its menu were deleted.", "info")
    return redirect(url_for("admin_restaurants"))


# ---- Admin: food items -----------------------------------------------------
@app.route("/admin/foods")
@admin_required
def admin_foods():
    q = (request.args.get("q") or "").strip()
    restaurant_id = request.args.get("restaurant_id", type=int)
    query = FoodItem.query.join(Restaurant)
    if q:
        query = query.filter(FoodItem.name.ilike(f"%{q}%"))
    if restaurant_id:
        query = query.filter(FoodItem.restaurant_id == restaurant_id)
    foods = query.order_by(FoodItem.id.desc()).all()
    return render_template(
        "admin/foods.html",
        foods=foods,
        q=q,
        restaurant_id=restaurant_id,
        restaurants=Restaurant.query.order_by(Restaurant.name).all(),
    )


def _food_form_values():
    return {
        "name": request.form.get("name", "").strip(),
        "description": request.form.get("description", "").strip(),
        "price": request.form.get("price", 0, type=float) or 0,
        "image": request.form.get("image", "").strip(),
        "is_veg": request.form.get("is_veg") == "on",
        "is_available": request.form.get("is_available") == "on",
        "is_bestseller": request.form.get("is_bestseller") == "on",
        "prep_time": request.form.get("prep_time", 20, type=int) or 20,
        "restaurant_id": request.form.get("restaurant_id", type=int),
        "category_id": request.form.get("category_id", type=int),
    }


@app.route("/admin/foods/add", methods=["GET", "POST"])
@admin_required
def admin_food_add():
    restaurants = Restaurant.query.order_by(Restaurant.name).all()
    categories = Category.query.order_by(Category.name).all()
    if not restaurants:
        flash("Add a restaurant before creating food items.", "error")
        return redirect(url_for("admin_restaurant_add"))

    if request.method == "POST":
        data = _food_form_values()
        if not data["name"] or data["price"] <= 0 or not data["restaurant_id"]:
            flash("Food name, price (above 0) and restaurant are required.", "error")
            return render_template(
                "admin/food_form.html",
                food=None,
                form=data,
                restaurants=restaurants,
                categories=categories,
            )
        data["image"] = data["image"] or "food/default.svg"
        food = FoodItem(**data)
        db.session.add(food)
        db.session.commit()
        flash(f"“{food.name}” added to the menu.", "success")
        return redirect(url_for("admin_foods"))

    return render_template(
        "admin/food_form.html",
        food=None,
        form={
            "name": "",
            "description": "",
            "price": 0,
            "image": "food/default.svg",
            "is_veg": True,
            "is_available": True,
            "is_bestseller": False,
            "prep_time": 20,
            "restaurant_id": restaurants[0].id,
            "category_id": categories[0].id if categories else None,
        },
        restaurants=restaurants,
        categories=categories,
    )


@app.route("/admin/foods/<int:food_id>/edit", methods=["GET", "POST"])
@admin_required
def admin_food_edit(food_id):
    food = db.session.get(FoodItem, food_id)
    if not food:
        abort(404)
    restaurants = Restaurant.query.order_by(Restaurant.name).all()
    categories = Category.query.order_by(Category.name).all()

    if request.method == "POST":
        data = _food_form_values()
        if not data["name"] or data["price"] <= 0 or not data["restaurant_id"]:
            flash("Food name, price (above 0) and restaurant are required.", "error")
            return render_template(
                "admin/food_form.html",
                food=food,
                form=data,
                restaurants=restaurants,
                categories=categories,
            )
        data["image"] = data["image"] or food.image or "food/default.svg"
        for key, value in data.items():
            setattr(food, key, value)
        db.session.commit()
        flash(f"“{food.name}” updated.", "success")
        return redirect(url_for("admin_foods"))

    return render_template(
        "admin/food_form.html",
        food=food,
        form={
            "name": food.name,
            "description": food.description or "",
            "price": food.price,
            "image": food.image,
            "is_veg": food.is_veg,
            "is_available": food.is_available,
            "is_bestseller": food.is_bestseller,
            "prep_time": food.prep_time,
            "restaurant_id": food.restaurant_id,
            "category_id": food.category_id,
        },
        restaurants=restaurants,
        categories=categories,
    )


@app.route("/admin/foods/<int:food_id>/delete", methods=["POST"])
@admin_required
def admin_food_delete(food_id):
    food = db.session.get(FoodItem, food_id)
    if not food:
        abort(404)
    name = food.name
    CartItem.query.filter_by(food_id=food.id).delete()
    db.session.delete(food)
    db.session.commit()
    flash(f"“{name}” removed from the menu.", "info")
    return redirect(url_for("admin_foods"))


# ---- Admin: orders ---------------------------------------------------------
@app.route("/admin/orders")
@admin_required
def admin_orders():
    status = (request.args.get("status") or "").strip()
    q = (request.args.get("q") or "").strip()
    query = Order.query
    if status and status in ORDER_STATUSES:
        query = query.filter_by(status=status)
    if q:
        like = f"%{q}%"
        query = query.join(User).filter(
            db.or_(
                Order.order_number.ilike(like),
                User.name.ilike(like),
                User.email.ilike(like),
            )
        )
    all_orders = query.order_by(Order.placed_at.desc()).all()
    return render_template(
        "admin/orders.html", orders=all_orders, status=status, q=q
    )


@app.route("/admin/orders/<int:order_id>")
@admin_required
def admin_order_detail(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        abort(404)
    return render_template("admin/order_detail.html", order=order)


@app.route("/admin/orders/<int:order_id>/status", methods=["POST"])
@admin_required
def admin_order_status(order_id):
    order = db.session.get(Order, order_id)
    if not order:
        abort(404)
    status = request.form.get("status", "")
    if status not in ORDER_STATUSES:
        flash("That is not a valid order status.", "error")
        return redirect(request.referrer or url_for("admin_orders"))

    order.status = status
    order.updated_at = datetime.utcnow()
    db.session.commit()
    flash(f"Order {order.order_number} marked as “{status}”.", "success")
    return redirect(request.referrer or url_for("admin_orders"))


# ---- Admin: customers ------------------------------------------------------
@app.route("/admin/customers")
@admin_required
def admin_customers():
    q = (request.args.get("q") or "").strip()
    query = User.query.filter_by(is_admin=False)
    if q:
        like = f"%{q}%"
        query = query.filter(db.or_(User.name.ilike(like), User.email.ilike(like)))
    customers = query.order_by(User.created_at.desc()).all()

    spend = dict(
        db.session.query(Order.user_id, func.sum(Order.total))
        .filter(Order.status != "Cancelled")
        .group_by(Order.user_id)
        .all()
    )
    order_counts = dict(
        db.session.query(Order.user_id, func.count(Order.id))
        .group_by(Order.user_id)
        .all()
    )
    return render_template(
        "admin/customers.html",
        customers=customers,
        spend=spend,
        order_counts=order_counts,
        q=q,
    )


# ----------------------------------------------------------------------------
# Error handlers
# ----------------------------------------------------------------------------
@app.errorhandler(404)
def not_found(error):
    return render_template("404.html"), 404


@app.errorhandler(500)
def server_error(error):
    db.session.rollback()
    return render_template("500.html"), 500


# ----------------------------------------------------------------------------
# Template helpers
# ----------------------------------------------------------------------------
@app.template_filter("rupees")
def rupees(value):
    try:
        value = float(value)
    except (TypeError, ValueError):
        return "₹0"
    if value == int(value):
        return "₹{:,.0f}".format(value)
    return "₹{:,.2f}".format(value)


@app.template_filter("datefmt")
def datefmt(value, fmt="%d %b %Y, %I:%M %p"):
    if not value:
        return ""
    return value.strftime(fmt)


@app.template_filter("slugify")
def slugify(value):
    return re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")


# ----------------------------------------------------------------------------
# First-run setup: create tables and seed demo data
# ----------------------------------------------------------------------------
def seed_database():
    """Create the database and fill it with demo restaurants, dishes and users."""
    db.create_all()
    if User.query.first():
        return False

    from seed_data import seed_all  # local module, keeps app.py readable

    seed_all(db, User, Restaurant, Category, FoodItem, Order, OrderItem)
    return True


if __name__ == "__main__":
    with app.app_context():
        created = seed_database()
        if created:
            print("Database created and seeded with demo data.")
        else:
            print("Database ready.")
    print("Craveo is running at http://127.0.0.1:5000")
    app.run(debug=True, host="127.0.0.1", port=5000)
