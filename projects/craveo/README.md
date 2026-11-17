# 🍽️ Craveo — Full-Stack Food Delivery Web Application

A complete, working food delivery website built with **Python + Flask / SQLite** (with an automatic zero-dependency Python 3 + SQLite fallback runtime inside Compillo). Customers browse restaurants, search dishes, build a cart and place orders; administrators manage the catalogue and move every order through its delivery stages.

## Run in Compillo Terminal (Get Localhost URL & Port)

1. Open the **Terminal** tab in Compillo's bottom panel.
2. Start Craveo in the background on port `5000`:
   ```bash
   cd projects/craveo && python3 app.py &
   ```
   *(Or run one command from anywhere in Terminal: `ports start craveo`)*
3. Forward & open the localhost URL in Live Preview:
   ```bash
   ports open 5000
   ```
   - **Localhost URL / Port**: `http://127.0.0.1:5000` / `http://localhost:5000` (port `5000`)
   - **Compillo Proxy URL**: `/api/ports/proxy/5000/`

The whole app runs locally on `http://127.0.0.1:5000`. No API keys, no paid services,
no internet connection required.

---

## 1. What is included

### Customer side
| Feature | Where |
|---|---|
| Register / log in / log out (hashed passwords, sessions) | `/register`, `/login`, `/logout` |
| Home page with hero, categories, top restaurants, trending dishes | `/` |
| Restaurant listing with cuisine filters, veg filter and sorting | `/restaurants` |
| Restaurant detail page with full menu, category tabs, veg toggle | `/restaurant/<id>` |
| Food search (name, description, restaurant, cuisine) with filters | `/search` |
| Add to cart (AJAX, no page reload), increase/decrease quantity, remove | `/cart` |
| Live bill: subtotal, delivery fee, 5% GST, free delivery above ₹499 | `/cart` |
| Checkout with validation and simulated payment | `/checkout` |
| Order confirmation page with order number | `/order/success/<order_number>` |
| Order history with status filters | `/orders` |
| Individual order detail with 5-step tracking timeline | `/orders/<order_number>` |
| Cancel a young order, reorder a past order | `/orders/<order_number>` |
| Profile page: name, phone, saved delivery address | `/profile` |

### Admin side (role-protected)
| Feature | Where |
|---|---|
| Separate secure admin login | `/admin/login` |
| Dashboard: revenue, orders, customers, top dishes, status split | `/admin` |
| Add / edit / delete restaurants | `/admin/restaurants` |
| Add / edit / delete food items (veg flag, availability, bestseller) | `/admin/foods` |
| View all customer orders, search, filter by status | `/admin/orders` |
| Update any order status (Placed → Delivered / Cancelled) | `/admin/orders/<id>` |
| View registered customers with order count and total spend | `/admin/customers` |

### Technical
- 8 database tables created automatically on first run: `users`, `restaurants`,
  `categories`, `food_items`, `cart_items`, `orders`, `order_items`
- Automatic demo seeding (8 restaurants, 51 dishes, 12 categories, 3 users, 5 orders)
- Password hashing with `werkzeug.security` (`pbkdf2:sha256`, salted)
- Server-side form validation and friendly error messages
- CSRF protection on **every** POST form and AJAX request (lightweight, no extra dependency)
- JSON endpoints for the AJAX cart, with a non-JavaScript fallback on every button
- Fully responsive layout (desktop / tablet / mobile) with a mobile nav drawer
- Custom SVG food artwork generated for the project — no external image hosting
- 404 and 500 error pages, flash messaging, toast notifications, loading button states

---

## 2. Project structure

```
food_delivery_app/
│
├── app.py                  # Entire Flask application: models, routes, admin, helpers
├── seed_data.py            # Demo data (restaurants, dishes, users, sample orders)
├── requirements.txt        # Python dependencies
├── run.bat                 # One-click Windows launcher (venv + install + run)
├── README.md               # This file
│
├── database/
│   └── food_delivery.db    # Created automatically on first run
│
├── templates/
│   ├── base.html           # Shared layout: navbar, flash messages, footer
│   ├── _macros.html        # Reusable UI macros (cards, badges, bill rows, timeline)
│   ├── index.html          # Home page
│   ├── restaurants.html    # Restaurant listing + filters
│   ├── restaurant_detail.html  # Menu of one restaurant
│   ├── search.html         # Food search results
│   ├── cart.html           # Cart page
│   ├── checkout.html       # Checkout + payment method
│   ├── order_success.html  # Order confirmation
│   ├── orders.html         # Order history
│   ├── order_detail.html   # Single order + tracking
│   ├── login.html
│   ├── register.html
│   ├── profile.html
│   ├── 404.html
│   ├── 500.html
│   └── admin/
│       ├── base_admin.html      # Admin layout with sidebar
│       ├── login.html           # Admin sign-in
│       ├── dashboard.html
│       ├── restaurants.html
│       ├── restaurant_form.html
│       ├── foods.html
│       ├── food_form.html
│       ├── orders.html
│       ├── order_detail.html
│       └── customers.html
│
└── static/
    ├── css/style.css       # Design system (palette, components, responsive rules)
    ├── js/main.js          # Nav, toasts, AJAX cart, loading states, scroll reveals
    └── images/
        ├── brand/          # logo.svg, favicon.svg, hero.svg
        ├── food/           # 52 dish illustrations (.svg)
        └── restaurants/    # 9 restaurant cover images (.svg)
```

---

## 3. Localhost setup — Windows (step by step)

### Step 1 — Install Python (skip if already installed)
1. Go to <https://www.python.org/downloads/> and download **Python 3.12** (or 3.10+).
2. Run the installer and **tick “Add python.exe to PATH”** on the first screen.
3. Verify in Command Prompt:
   ```bat
   python --version
   ```
   You should see something like `Python 3.12.4`.

### Step 2 — Open the project in VS Code
1. Extract the ZIP (`food_delivery_app.zip`) anywhere, e.g. `C:\Projects\food_delivery_app`.
2. Open **VS Code** → `File ▸ Open Folder…` → select the `food_delivery_app` folder.
3. Open a terminal inside VS Code: `Terminal ▸ New Terminal` (or `Ctrl + ~`).

### Step 3 — Create a virtual environment
```bat
python -m venv venv
```
Activate it:
```bat
venv\Scripts\activate
```
Your prompt now starts with `(venv)`.

> **PowerShell error about “running scripts is disabled”?** Run this once:
> `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, then activate again.
> Or simply use the **Command Prompt** terminal profile in VS Code.

### Step 4 — Install dependencies
```bat
pip install -r requirements.txt
```
(Installs Flask, Flask-SQLAlchemy, Flask-Login, Werkzeug, SQLAlchemy.)

### Step 5 — Initialise the database
Nothing to type. The first run of `app.py` creates `database/food_delivery.db`,
builds all 8 tables and seeds the demo data automatically.

If you ever want a **fresh** database, stop the server, delete
`database\food_delivery.db` and start the app again.

### Step 6 — Run the application
```bat
python app.py
```
You will see:
```
Database created and seeded with demo data.
Craveo is running at http://127.0.0.1:5000
 * Running on http://127.0.0.1:5000
```

### Step 7 — Open it in Chrome
Visit **<http://127.0.0.1:5000>**

Press `CTRL + C` in the terminal to stop the server.

> **Shortcut:** you can also just double-click **`run.bat`** — it creates the virtual
> environment, installs dependencies and starts the server for you.

### macOS / Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Then open <http://127.0.0.1:5000>.

---

## 4. Demo accounts

| Role | Email | Password |
|---|---|---|
| Customer | `customer@craveo.com` | `Customer@123` |
| Customer | `neha@example.com` | `Neha@123` |
| Administrator | `admin@craveo.com` | `Admin@123` |

- Customer login: <http://127.0.0.1:5000/login>
- Admin login: <http://127.0.0.1:5000/admin/login>

You can also register a brand-new account from the storefront; new accounts are
always customers (never admins).

---

## 5. Try this walkthrough (2 minutes)

1. Open the home page → click any restaurant card.
2. Press **ADD** on two or three dishes — the cart badge updates instantly with a toast.
3. Click **Cart** → use `+` / `−` to change quantities and watch the bill recalculate.
4. **Proceed to checkout** → fill the address → choose *UPI (simulated)* → **Place order**.
5. You land on the confirmation page with an order number → **Track this order**.
6. Log in as the admin → `/admin/orders` → change the status to *Preparing* →
   *Out for Delivery* → *Delivered*, then refresh the customer order page to see the
   timeline move.
7. As the admin, add a restaurant and a dish, then find it on the storefront.

---

## 6. Route reference

### Public / customer
| Method | Route | Purpose |
|---|---|---|
| GET | `/` | Home page |
| GET | `/restaurants` | Restaurant list (`?q=&cuisine=&sort=&veg=1`) |
| GET | `/restaurant/<id>` | Restaurant menu (`?category=<slug>&veg=1`) |
| GET | `/search` | Food search (`?q=&category=&veg=1&max_price=&sort=`) |
| GET/POST | `/register` | Create account |
| GET/POST | `/login` | Log in |
| GET | `/logout` | Log out |
| GET/POST | `/profile` | Edit profile and address |
| GET | `/cart` | Cart page |
| POST | `/cart/add/<food_id>` | Add item (JSON when `X-Requested-With: XMLHttpRequest`) |
| POST | `/cart/update/<item_id>` | Increase / decrease / set quantity |
| POST | `/cart/remove/<item_id>` | Remove one line |
| POST | `/cart/clear` | Empty the cart |
| GET/POST | `/checkout` | Address + payment + place order |
| GET | `/order/success/<order_number>` | Confirmation |
| GET | `/orders` | Order history (`?status=live\|Delivered\|Cancelled`) |
| GET | `/orders/<order_number>` | Order detail + timeline |
| POST | `/orders/<order_number>/cancel` | Cancel (Placed / Confirmed only) |
| POST | `/orders/<order_number>/reorder` | Add the same items to the cart |

### Admin (requires `is_admin = True`)
| Method | Route | Purpose |
|---|---|---|
| GET/POST | `/admin/login` | Admin sign-in |
| GET | `/admin` | Dashboard |
| GET | `/admin/restaurants` | List restaurants |
| GET/POST | `/admin/restaurants/add` | Create restaurant |
| GET/POST | `/admin/restaurants/<id>/edit` | Edit restaurant |
| POST | `/admin/restaurants/<id>/delete` | Delete restaurant + its menu |
| GET | `/admin/foods` | List dishes |
| GET/POST | `/admin/foods/add` | Create dish |
| GET/POST | `/admin/foods/<id>/edit` | Edit dish |
| POST | `/admin/foods/<id>/delete` | Delete dish |
| GET | `/admin/orders` | All orders (`?status=&q=`) |
| GET | `/admin/orders/<id>` | Order detail |
| POST | `/admin/orders/<id>/status` | Change order status |
| GET | `/admin/customers` | Registered customers |

---

## 7. How the main logic works

**Cart totals** (`cart_summary()` in `app.py`)

```
subtotal      = Σ (item price × quantity)
delivery fee  = ₹0 if subtotal ≥ ₹499 else ₹29   (₹0 for an empty cart)
GST           = 5% of subtotal
total         = subtotal + delivery fee + GST
```

**Placing an order** (`/checkout`, POST)
1. Server-side validation: name, 10-digit Indian mobile number, address ≥ 10 chars,
   valid payment method.
2. A unique order number is generated (`CRAV` + `YYMMDD` + 4 random digits).
3. Each cart line is copied into `order_items` as a **snapshot** (dish name, price,
   restaurant name and image), so later menu edits never change old bills.
4. The cart is emptied, the address is saved to the profile, and the user is
   redirected to the confirmation page.

**Order status** — `Placed → Confirmed → Preparing → Out for Delivery → Delivered`,
plus `Cancelled`. Customers may cancel only while the order is `Placed` or `Confirmed`;
only an administrator can change status from the dashboard.

**Payments are simulated.** UPI and Card orders are marked *Paid* instantly,
Cash on Delivery is marked *Pay on delivery*. No card data is collected or stored.

---

## 8. Security notes

- Passwords are stored as salted `pbkdf2:sha256` hashes — never in plain text.
- Sessions are handled by Flask-Login; the session cookie is `HttpOnly` and `SameSite=Lax`.
- Every POST request is checked against a per-session CSRF token
  (`protect_from_csrf` in `app.py`), including AJAX calls sent with an `X-CSRF-Token` header.
- Admin routes are protected by `@admin_required`, which also blocks logged-in
  non-admin customers.
- All database access goes through SQLAlchemy ORM queries (parameterised, no string SQL).
- Customer order pages are scoped to `user_id = current_user.id`, so one customer
  can never open another customer's order.
- For real deployment you would also set a strong `SECRET_KEY` environment variable
  and turn `debug=False`:
  ```bat
  set SECRET_KEY=your-long-random-string
  python app.py
  ```

---

## 9. Testing performed

Every flow below was executed against the finished code before packaging:

- All Python files compile (`python -m py_compile app.py seed_data.py`)
- Database initialisation and seeding (8 restaurants, 51 dishes, 12 categories, 5 orders)
- Every image path referenced by the seed data exists on disk
- All public pages return 200; an unknown URL returns the custom 404 page
- Registration (valid, duplicate email, mismatched passwords), login (valid, wrong password), logout
- CSRF rejection of a POST with a bogus token
- Cart: AJAX add, increase, decrease, remove, clear, non-JS fallback add
- Checkout: validation errors, successful order, order persisted with correct totals,
  cart emptied, order number displayed
- Orders: list, live filter, detail page, cancel, reorder
- Profile update
- Admin: login, dashboard, restaurant add/edit/delete, dish add/edit/delete,
  order status update (valid + invalid), customer list
- Access control: guest → login redirect, customer → admin area blocked
- All static assets (CSS, JS, SVG images) load

A 81-check automated suite ran green; the interface was additionally reviewed in
headless Chrome at 1440 px width and in mobile breakpoints.

---

## 10. Troubleshooting

| Problem | Fix |
|---|---|
| `'python' is not recognized` | Reinstall Python and tick “Add python.exe to PATH”, or use `py app.py`. |
| `Port 5000 already in use` | Stop the other app, or change the last line of `app.py` to `app.run(debug=True, port=5001)` and open `http://127.0.0.1:5001`. |
| PowerShell blocks `activate` | Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`, or use Command Prompt. |
| `ModuleNotFoundError: No module named 'flask'` | The virtual environment is not active, or step 4 was skipped. Run `venv\Scripts\activate` then `pip install -r requirements.txt`. |
| Page looks unstyled | Hard-refresh with `Ctrl + F5` to clear the cached CSS. |
| Want fresh demo data | Stop the server, delete `database\food_delivery.db`, run `python app.py` again. |
| On Windows port 5000 blocked by another service | Use a different port as described above. |

---

## 11. Notes & next steps

- All artwork (logos, dish illustrations, restaurant covers) is original SVG generated
  for this project, so the ZIP is self-contained and works offline.
- Ideas to extend: coupon codes, rider assignment, ratings and reviews, saved
  addresses book, email notifications, Alembic migrations, PostgreSQL, Docker.
- Built as an intermediate-level learning project — the code is commented and grouped
  by concern (configuration → models → helpers → customer routes → admin routes).

**Enjoy your meal. 🍛**
