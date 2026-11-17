"""
Demo data for Craveo.

Called once from app.py on first run (when the database is empty) so that the
application is immediately usable: 8 restaurants, 51 dishes, an admin account,
a demo customer and a few past orders.
"""

from datetime import datetime, timedelta


def seed_all(db, User, Restaurant, Category, FoodItem, Order, OrderItem):
    # ---------------------------------------------------------------- categories
    categories = [
        ("Biryani", "biryani", "🍛"),
        ("Pizza", "pizza", "🍕"),
        ("Burgers", "burgers", "🍔"),
        ("South Indian", "south-indian", "🥘"),
        ("North Indian", "north-indian", "🍲"),
        ("Chinese", "chinese", "🍜"),
        ("Rolls & Wraps", "rolls-wraps", "🌯"),
        ("Momos", "momos", "🥟"),
        ("Starters", "starters", "🍟"),
        ("Salads", "salads", "🥗"),
        ("Desserts", "desserts", "🍰"),
        ("Beverages", "beverages", "🥤"),
    ]
    cat_by_slug = {}
    for name, slug, emoji in categories:
        category = Category(name=name, slug=slug, emoji=emoji)
        db.session.add(category)
        cat_by_slug[slug] = category
    db.session.flush()

    # -------------------------------------------------------------- restaurants
    restaurants_data = [
        {
            "name": "Spice Route Biryani House",
            "cuisine": "Biryani, North Indian, Mughlai",
            "description": "Slow-cooked dum biryanis sealed in clay handis, rich curries and "
            "freshly baked naans. A house of heirloom Hyderabadi recipes since 1998.",
            "address": "12, 100 Feet Road, Indiranagar",
            "city": "Bengaluru",
            "rating": 4.6,
            "rating_count": 2841,
            "delivery_time": 32,
            "price_for_two": 450,
            "image": "restaurants/spice-route.svg",
        },
        {
            "name": "Napoli Pizza Co.",
            "cuisine": "Pizza, Italian, Pasta",
            "description": "Wood-fired Neapolitan pizzas with a 48-hour fermented dough, "
            "San Marzano tomatoes and mozzarella pulled fresh every morning.",
            "address": "5th Block, Koramangala",
            "city": "Bengaluru",
            "rating": 4.4,
            "rating_count": 1926,
            "delivery_time": 28,
            "price_for_two": 600,
            "image": "restaurants/napoli.svg",
        },
        {
            "name": "Burger Bunker",
            "cuisine": "Burgers, American, Fast Food",
            "description": "Smashed patties, brioche buns and hand-cut fries. Loud music, "
            "big flavours and zero shortcuts.",
            "address": "27th Main, HSR Layout",
            "city": "Bengaluru",
            "rating": 4.3,
            "rating_count": 3510,
            "delivery_time": 25,
            "price_for_two": 350,
            "image": "restaurants/burger-bunker.svg",
        },
        {
            "name": "Dosa Junction",
            "cuisine": "South Indian, Breakfast, Vegetarian",
            "description": "Crisp dosas on a cast-iron tawa, fluffy idlis and filter coffee "
            "brewed the way it has been for four generations.",
            "address": "4th Block, Jayanagar",
            "city": "Bengaluru",
            "rating": 4.7,
            "rating_count": 4210,
            "delivery_time": 22,
            "price_for_two": 250,
            "image": "restaurants/dosa-junction.svg",
        },
        {
            "name": "Wok & Roll",
            "cuisine": "Chinese, Asian, Noodles",
            "description": "High-flame wok cooking, house-made schezwan and noodles tossed "
            "to order. Indo-Chinese comfort food done right.",
            "address": "Phoenix Marketcity, Whitefield",
            "city": "Bengaluru",
            "rating": 4.1,
            "rating_count": 1580,
            "delivery_time": 35,
            "price_for_two": 500,
            "image": "restaurants/wok-roll.svg",
        },
        {
            "name": "Momo Mahal",
            "cuisine": "Momos, Tibetan, Street Food",
            "description": "Hand-pleated momos steamed in bamboo baskets, served with fiery "
            "chilli-garlic chutney and clear soups.",
            "address": "16th Main, BTM Layout",
            "city": "Bengaluru",
            "rating": 4.5,
            "rating_count": 2380,
            "delivery_time": 27,
            "price_for_two": 300,
            "image": "restaurants/momo-mahal.svg",
        },
        {
            "name": "Green Bowl Kitchen",
            "cuisine": "Salads, Healthy, Wraps",
            "description": "Nutrition-first bowls built with cold-pressed dressings, "
            "farm greens and slow-roasted proteins. Calories on every label.",
            "address": "Ecospace Business Park, Bellandur",
            "city": "Bengaluru",
            "rating": 4.2,
            "rating_count": 940,
            "delivery_time": 24,
            "price_for_two": 400,
            "image": "restaurants/green-bowl.svg",
        },
        {
            "name": "Sweet Cravings",
            "cuisine": "Desserts, Beverages, Bakery",
            "description": "A patisserie counter for midnight sugar emergencies: "
            "cheesecakes, brownies, tiramisu and thick shakes.",
            "address": "Church Street, MG Road",
            "city": "Bengaluru",
            "rating": 4.8,
            "rating_count": 3105,
            "delivery_time": 20,
            "price_for_two": 200,
            "image": "restaurants/sweet-cravings.svg",
        },
    ]

    rest = {}
    for data in restaurants_data:
        restaurant = Restaurant(**data)
        db.session.add(restaurant)
        rest[data["name"]] = restaurant
    db.session.flush()

    # ------------------------------------------------------------------- dishes
    # (restaurant, name, price, category slug, veg, bestseller, description, image, prep)
    foods = [
        # Spice Route Biryani House
        ("Spice Route Biryani House", "Hyderabadi Chicken Dum Biryani", 329, "biryani", False, True,
         "Long-grain basmati layered with marinated chicken, saffron and fried onions, "
         "sealed and slow-cooked on dum. Served with mirchi ka salan and raita.",
         "food/biryani-chicken.svg", 30),
        ("Spice Route Biryani House", "Lucknowi Mutton Biryani", 429, "biryani", False, False,
         "Tender mutton shanks and delicate Lucknowi spices folded into fragrant rice, "
         "finished with rose water and kewra.",
         "food/biryani-mutton.svg", 40),
        ("Spice Route Biryani House", "Veg Dum Biryani", 269, "biryani", True, False,
         "Garden vegetables, paneer cubes and cashews layered with basmati and whole spices.",
         "food/biryani-veg.svg", 28),
        ("Spice Route Biryani House", "Paneer Butter Masala", 289, "north-indian", True, True,
         "Cottage cheese simmered in a silky tomato-cashew gravy with a knob of white butter.",
         "food/curry-paneer.svg", 22),
        ("Spice Route Biryani House", "Butter Chicken", 349, "north-indian", False, True,
         "Tandoor-charred chicken in a mellow tomato cream gravy. Best mopped up with naan.",
         "food/curry-chicken.svg", 24),
        ("Spice Route Biryani House", "Garlic Naan (2 pcs)", 79, "north-indian", True, False,
         "Tandoor-baked naan brushed with garlic butter and fresh coriander.",
         "food/naan.svg", 12),
        ("Spice Route Biryani House", "Chicken Seekh Kebab", 259, "starters", False, False,
         "Hand-minced chicken with green chilli and mint, skewered and charred over coal.",
         "food/kebab.svg", 20),
        ("Spice Route Biryani House", "Gulab Jamun (2 pcs)", 99, "desserts", True, False,
         "Warm khoya dumplings soaked in cardamom-scented sugar syrup.",
         "food/dessert-gulab.svg", 8),

        # Napoli Pizza Co.
        ("Napoli Pizza Co.", "Margherita Pizza", 249, "pizza", True, False,
         "San Marzano tomato sauce, fresh mozzarella and basil on a blistered sourdough base.",
         "food/pizza-margherita.svg", 18),
        ("Napoli Pizza Co.", "Farmhouse Veggie Pizza", 349, "pizza", True, True,
         "Capsicum, sweet corn, onion, olives and mushroom under a blanket of mozzarella.",
         "food/pizza-veggie.svg", 20),
        ("Napoli Pizza Co.", "Pepperoni Overload Pizza", 429, "pizza", False, True,
         "Double pepperoni, chilli flakes and oregano with extra cheese on a crisp base.",
         "food/pizza-pepperoni.svg", 20),
        ("Napoli Pizza Co.", "Paneer Tikka Pizza", 389, "pizza", True, False,
         "Smoky tandoori paneer, onion and mint mayo drizzle over a cheesy base.",
         "food/pizza-paneer.svg", 22),
        ("Napoli Pizza Co.", "Garlic Breadsticks", 149, "starters", True, False,
         "Six soft breadsticks with garlic butter, herbs and a cheesy dip.",
         "food/breadsticks.svg", 12),
        ("Napoli Pizza Co.", "Choco Lava Cake", 129, "desserts", True, False,
         "Molten dark chocolate centre inside a soft cocoa sponge. Serve warm.",
         "food/dessert-lava.svg", 10),
        ("Napoli Pizza Co.", "Cold Coffee", 129, "beverages", True, False,
         "Cold-brewed coffee blended with milk and a scoop of vanilla ice cream.",
         "food/drink-coldcoffee.svg", 6),

        # Burger Bunker
        ("Burger Bunker", "Classic Chicken Burger", 199, "burgers", False, True,
         "Crisp chicken fillet, lettuce, tomato and house mayo in a toasted brioche bun.",
         "food/burger-chicken.svg", 15),
        ("Burger Bunker", "Double Cheese Veg Burger", 179, "burgers", True, False,
         "Potato-corn patty with double cheddar, pickles and burger sauce.",
         "food/burger-veg.svg", 15),
        ("Burger Bunker", "Crispy Chicken Zinger", 229, "burgers", False, True,
         "Buttermilk-marinated chicken fried till shatteringly crisp, with jalapeño mayo.",
         "food/burger-zinger.svg", 18),
        ("Burger Bunker", "Peri Peri Fries", 129, "starters", True, False,
         "Hand-cut fries tossed in smoky peri peri seasoning. Served with garlic dip.",
         "food/fries.svg", 10),
        ("Burger Bunker", "Chicken Nuggets (6 pcs)", 159, "starters", False, False,
         "Golden nuggets with a crunchy crumb and juicy chicken inside.",
         "food/nuggets.svg", 12),
        ("Burger Bunker", "Chocolate Thick Shake", 169, "beverages", True, False,
         "Churned chocolate ice cream, cocoa and whipped cream. Spoon required.",
         "food/shake-choco.svg", 7),

        # Dosa Junction
        ("Dosa Junction", "Masala Dosa", 149, "south-indian", True, True,
         "Paper-thin crisp dosa with spiced potato masala, coconut chutney and sambar.",
         "food/dosa-masala.svg", 15),
        ("Dosa Junction", "Ghee Podi Dosa", 169, "south-indian", True, False,
         "Dosa smeared with gunpowder podi and nutty ghee, served with chutney.",
         "food/dosa-podi.svg", 15),
        ("Dosa Junction", "Idli Vada Combo", 129, "south-indian", True, False,
         "Three steamed idlis and a crisp medu vada with sambar and two chutneys.",
         "food/idli.svg", 12),
        ("Dosa Junction", "Rava Onion Dosa", 159, "south-indian", True, False,
         "Lacy semolina dosa studded with onion, green chilli and curry leaves.",
         "food/dosa-onion.svg", 16),
        ("Dosa Junction", "Filter Coffee", 59, "beverages", True, False,
         "Strong decoction frothed with hot milk, served in a steel tumbler.",
         "food/coffee-filter.svg", 5),
        ("Dosa Junction", "Kesari Bath", 99, "desserts", True, False,
         "Semolina pudding with ghee, saffron, cashews and raisins.",
         "food/dessert-kesari.svg", 10),

        # Wok & Roll
        ("Wok & Roll", "Veg Hakka Noodles", 219, "chinese", True, True,
         "Wok-tossed noodles with julienned vegetables, soy and a hit of white pepper.",
         "food/noodles-veg.svg", 16),
        ("Wok & Roll", "Chicken Schezwan Noodles", 269, "chinese", False, False,
         "Noodles tossed in fiery house schezwan sauce with shredded chicken.",
         "food/noodles-chicken.svg", 18),
        ("Wok & Roll", "Chilli Paneer Dry", 249, "chinese", True, False,
         "Crisp paneer cubes glazed with chilli, garlic and bell peppers.",
         "food/chilli-paneer.svg", 18),
        ("Wok & Roll", "Chicken Manchurian", 279, "chinese", False, False,
         "Fried chicken dumplings in a tangy ginger-garlic Manchurian gravy.",
         "food/manchurian.svg", 20),
        ("Wok & Roll", "Veg Spring Rolls (4 pcs)", 179, "starters", True, False,
         "Crisp rolls stuffed with cabbage, carrot and glass noodles.",
         "food/springroll.svg", 14),
        ("Wok & Roll", "Hot & Sour Soup", 149, "starters", True, False,
         "Peppery broth with mushroom, tofu, bamboo shoot and a swirl of egg-free corn.",
         "food/soup.svg", 12),

        # Momo Mahal
        ("Momo Mahal", "Steamed Veg Momos (8 pcs)", 149, "momos", True, True,
         "Hand-pleated dumplings packed with cabbage, carrot and spring onion.",
         "food/momo-veg.svg", 15),
        ("Momo Mahal", "Steamed Chicken Momos (8 pcs)", 179, "momos", False, True,
         "Juicy minced chicken dumplings with a splash of sesame oil, bamboo-steamed.",
         "food/momo-chicken.svg", 16),
        ("Momo Mahal", "Tandoori Paneer Momos", 199, "momos", True, False,
         "Momos charred in the tandoor and dusted with chaat masala.",
         "food/momo-tandoori.svg", 18),
        ("Momo Mahal", "Fried Chicken Momos", 199, "momos", False, False,
         "Crisp golden momos with a crunchy shell and molten chicken filling.",
         "food/momo-fried.svg", 18),
        ("Momo Mahal", "Chilli Garlic Momos", 189, "momos", True, False,
         "Steamed momos tossed in a punchy chilli-garlic sauce with spring onion.",
         "food/momo-chilli.svg", 17),
        ("Momo Mahal", "Sweet Corn Soup", 129, "starters", True, False,
         "Creamy sweet corn broth with finely diced vegetables and black pepper.",
         "food/soup-corn.svg", 12),

        # Green Bowl Kitchen
        ("Green Bowl Kitchen", "Mediterranean Chickpea Bowl", 279, "salads", True, True,
         "Quinoa, roasted chickpeas, cucumber, olives and tahini-yoghurt dressing.",
         "food/salad-bowl.svg", 12),
        ("Green Bowl Kitchen", "Grilled Chicken Caesar Salad", 329, "salads", False, False,
         "Char-grilled chicken, romaine, parmesan shavings and light Caesar dressing.",
         "food/salad-caesar.svg", 15),
        ("Green Bowl Kitchen", "Quinoa Avocado Bowl", 299, "salads", True, False,
         "Quinoa, avocado, cherry tomato, pumpkin seeds and lemon-herb vinaigrette.",
         "food/salad-avocado.svg", 12),
        ("Green Bowl Kitchen", "Paneer Tikka Wrap", 219, "rolls-wraps", True, False,
         "Whole-wheat wrap with tandoori paneer, onion, mint chutney and greens.",
         "food/wrap-paneer.svg", 14),
        ("Green Bowl Kitchen", "Chicken Shawarma Wrap", 249, "rolls-wraps", False, True,
         "Slow-roasted chicken, garlic toum, pickled cucumber and crisp lettuce.",
         "food/wrap-chicken.svg", 15),
        ("Green Bowl Kitchen", "Fresh Lime Soda", 89, "beverages", True, False,
         "Fresh lime, soda and a pinch of black salt. Sweet or salted, your call.",
         "food/drink-lime.svg", 5),

        # Sweet Cravings
        ("Sweet Cravings", "Death by Chocolate Cake Slice", 179, "desserts", True, True,
         "Four layers of dark chocolate sponge, ganache and chocolate shards.",
         "food/cake-choco.svg", 8),
        ("Sweet Cravings", "Tiramisu Cup", 199, "desserts", True, False,
         "Espresso-soaked ladyfingers layered with mascarpone cream and cocoa dust.",
         "food/tiramisu.svg", 8),
        ("Sweet Cravings", "New York Cheesecake", 219, "desserts", True, False,
         "Dense baked cheesecake on a buttery biscuit base with berry compote.",
         "food/cheesecake.svg", 8),
        ("Sweet Cravings", "Brownie with Ice Cream", 189, "desserts", True, True,
         "Fudgy walnut brownie served warm with vanilla ice cream.",
         "food/brownie.svg", 10),
        ("Sweet Cravings", "Belgian Chocolate Shake", 189, "beverages", True, False,
         "Belgian cocoa, milk and chocolate ice cream blended thick.",
         "food/shake-belgian.svg", 7),
        ("Sweet Cravings", "Mango Smoothie", 149, "beverages", True, False,
         "Alphonso mango pulp with yoghurt and honey. Seasonal favourite.",
         "food/drink-mango.svg", 6),
    ]

    food_objects = []
    for (rname, fname, price, cslug, veg, best, desc, image, prep) in foods:
        item = FoodItem(
            name=fname,
            description=desc,
            price=float(price),
            image=image,
            is_veg=veg,
            is_available=True,
            is_bestseller=best,
            prep_time=prep,
            restaurant_id=rest[rname].id,
            category_id=cat_by_slug[cslug].id,
        )
        db.session.add(item)
        food_objects.append(item)
    db.session.flush()

    # -------------------------------------------------------------------- users
    admin = User(
        name="Aarav Menon",
        email="admin@craveo.com",
        phone="9876543210",
        address="Craveo HQ, 4th Floor, Prestige Tech Park, Bengaluru",
        is_admin=True,
    )
    admin.set_password("Admin@123")
    db.session.add(admin)

    customer = User(
        name="Ishant Saraogi",
        email="customer@craveo.com",
        phone="9812345678",
        address="Flat 402, Sunrise Residency, 8th Cross, Indiranagar, Bengaluru 560038",
        is_admin=False,
    )
    customer.set_password("Customer@123")
    db.session.add(customer)

    second_customer = User(
        name="Neha Kulkarni",
        email="neha@example.com",
        phone="9822334455",
        address="B-12, Palm Meadows, Whitefield, Bengaluru 560066",
    )
    second_customer.set_password("Neha@123")
    db.session.add(second_customer)
    db.session.flush()

    # ------------------------------------------------------------------- orders
    by_name = {f.name: f for f in food_objects}

    def make_order(user, days_ago, hour, items, status, payment, payment_status):
        placed = datetime.utcnow() - timedelta(days=days_ago)
        placed = placed.replace(hour=hour, minute=15, second=0, microsecond=0)
        subtotal = 0.0
        lines = []
        for fname, qty in items:
            food = by_name[fname]
            subtotal += food.price * qty
            lines.append((food, qty))
        delivery_fee = 0.0 if subtotal >= 499 else 29.0
        tax = round(subtotal * 0.05, 2)
        order = Order(
            order_number="CRAV%s-%d" % (placed.strftime("%y%m%d"), 1000 + days_ago * 7 + hour),
            user_id=user.id,
            subtotal=round(subtotal, 2),
            delivery_fee=delivery_fee,
            tax=tax,
            total=round(subtotal + delivery_fee + tax, 2),
            status=status,
            payment_method=payment,
            payment_status=payment_status,
            delivery_name=user.name,
            delivery_phone=user.phone,
            delivery_address=user.address,
            placed_at=placed,
            updated_at=placed + timedelta(minutes=18),
            eta_minutes=35,
        )
        db.session.add(order)
        db.session.flush()
        for food, qty in lines:
            db.session.add(
                OrderItem(
                    order_id=order.id,
                    food_id=food.id,
                    food_name=food.name,
                    restaurant_name=food.restaurant.name,
                    unit_price=food.price,
                    quantity=qty,
                    image=food.image,
                )
            )
        return order

    make_order(
        customer, 9, 20,
        [("Hyderabadi Chicken Dum Biryani", 1), ("Gulab Jamun (2 pcs)", 1)],
        "Delivered", "UPI", "Paid",
    )
    make_order(
        customer, 4, 13,
        [("Margherita Pizza", 1), ("Garlic Breadsticks", 1), ("Cold Coffee", 1)],
        "Delivered", "Card", "Paid",
    )
    make_order(
        customer, 1, 21,
        [("Masala Dosa", 2), ("Filter Coffee", 2)],
        "Out for Delivery", "Cash on Delivery", "Pay on delivery",
    )
    make_order(
        second_customer, 2, 12,
        [("Steamed Veg Momos (8 pcs)", 2), ("Sweet Corn Soup", 1)],
        "Preparing", "UPI", "Paid",
    )
    make_order(
        second_customer, 6, 19,
        [("Death by Chocolate Cake Slice", 2), ("Belgian Chocolate Shake", 2)],
        "Delivered", "Card", "Paid",
    )

    db.session.commit()
    print(
        "Seeded %d restaurants, %d dishes, %d categories and 5 demo orders."
        % (len(restaurants_data), len(foods), len(categories))
    )
