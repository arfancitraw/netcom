import os
import sys
import time
import pandas as pd
import pymysql
from argon2 import PasswordHasher
from config import Config

ph = PasswordHasher()

def safe_int(val):
    return int(val) if pd.notna(val) else None

def safe_float(val):
    return float(val) if pd.notna(val) else None

def safe_str(val, max_len=None):
    if pd.isna(val) or val is None:
        return None
    s = str(val)
    return s[:max_len] if max_len else s

def run_schema(cursor):
    print("Executing schema.sql to ensure database and tables exist...")
    schema_path = os.path.join(os.path.dirname(__file__), '..', 'schema.sql')
    with open(schema_path, 'r', encoding='utf-8') as f:
        sql_content = f.read()

    # Split by semicolon, filtering out empty statements
    statements = sql_content.split(';')
    for stmt in statements:
        stmt = stmt.strip()
        if stmt:
            cursor.execute(stmt)
    print("Schema applied successfully.")

def seed_users(cursor):
    print("Seeding initial dashboard users...")
    users = [
        ('admin', 'admin@netcom.internal', ph.hash('Admin@123'), 'System Administrator', 'admin'),
        ('manager', 'manager@netcom.internal', ph.hash('Manager@123'), 'Operations Manager', 'manager'),
        ('viewer', 'viewer@netcom.internal', ph.hash('Viewer@123'), 'Business Analyst', 'viewer')
    ]
    cursor.executemany("""
        INSERT INTO users (username, email, password_hash, full_name, role)
        VALUES (%s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE full_name=VALUES(full_name), role=VALUES(role)
    """, users)
    print("Users seeded (admin, manager, viewer).")

def ingest_data(conn, data_dir):
    print(f"Starting dataset ingestion from {data_dir}...")
    cursor = conn.cursor()
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.execute("SET UNIQUE_CHECKS = 0;")

    # 1. Product Category Translation
    print("Loading product_category_translation...")
    fpath = os.path.join(data_dir, 'product_category_name_translation.csv')
    df = pd.read_csv(fpath)
    # Add missing Brazilian categories to ensure 100% referential integrity
    extra_cats = pd.DataFrame([
        {'product_category_name': 'pc_gamer', 'product_category_name_english': 'pc_gamer'},
        {'product_category_name': 'portateis_cozinha_e_preparadores_de_alimentos', 'product_category_name_english': 'portable_kitchen_food_preparers'}
    ])
    df = pd.concat([df, extra_cats]).drop_duplicates(subset=['product_category_name'])
    data = [(r['product_category_name'], r['product_category_name_english']) for _, r in df.iterrows()]
    cursor.executemany("""
        INSERT INTO product_category_translation (product_category_name, product_category_name_english)
        VALUES (%s, %s) ON DUPLICATE KEY UPDATE product_category_name_english=VALUES(product_category_name_english)
    """, data)
    print(f"-> Loaded {len(data)} category translations.")

    # 2. Customers
    print("Loading customers...")
    fpath = os.path.join(data_dir, 'olist_customers_dataset.csv')
    df = pd.read_csv(fpath)
    data = [(r['customer_id'], r['customer_unique_id'], int(r['customer_zip_code_prefix']), r['customer_city'], r['customer_state']) for _, r in df.iterrows()]
    cursor.executemany("""
        INSERT IGNORE INTO customers (customer_id, customer_unique_id, customer_zip_code_prefix, customer_city, customer_state)
        VALUES (%s, %s, %s, %s, %s)
    """, data)
    print(f"-> Loaded {len(data)} customers.")

    # 3. Sellers
    print("Loading sellers...")
    fpath = os.path.join(data_dir, 'olist_sellers_dataset.csv')
    df = pd.read_csv(fpath)
    data = [(r['seller_id'], int(r['seller_zip_code_prefix']), r['seller_city'], r['seller_state']) for _, r in df.iterrows()]
    cursor.executemany("""
        INSERT IGNORE INTO sellers (seller_id, seller_zip_code_prefix, seller_city, seller_state)
        VALUES (%s, %s, %s, %s)
    """, data)
    print(f"-> Loaded {len(data)} sellers.")

    # 4. Products
    print("Loading products...")
    fpath = os.path.join(data_dir, 'olist_products_dataset.csv')
    df = pd.read_csv(fpath)
    data = [
        (
            r['product_id'],
            safe_str(r['product_category_name']),
            safe_int(r['product_name_lenght']),
            safe_int(r['product_description_lenght']),
            safe_int(r['product_photos_qty']),
            safe_int(r['product_weight_g']),
            safe_int(r['product_length_cm']),
            safe_int(r['product_height_cm']),
            safe_int(r['product_width_cm']),
        )
        for _, r in df.iterrows()
    ]
    cursor.executemany("""
        INSERT IGNORE INTO products (
            product_id, product_category_name, product_name_lenght, product_description_lenght,
            product_photos_qty, product_weight_g, product_length_cm, product_height_cm, product_width_cm
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
    """, data)
    print(f"-> Loaded {len(data)} products.")

    # 5. Orders
    print("Loading orders...")
    fpath = os.path.join(data_dir, 'olist_orders_dataset.csv')
    df = pd.read_csv(fpath)
    data = [
        (
            r['order_id'], r['customer_id'], r['order_status'],
            safe_str(r['order_purchase_timestamp']), safe_str(r['order_approved_at']),
            safe_str(r['order_delivered_carrier_date']), safe_str(r['order_delivered_customer_date']),
            safe_str(r['order_estimated_delivery_date'])
        )
        for _, r in df.iterrows()
    ]
    cursor.executemany("""
        INSERT IGNORE INTO orders (
            order_id, customer_id, order_status, order_purchase_timestamp,
            order_approved_at, order_delivered_carrier_date, order_delivered_customer_date,
            order_estimated_delivery_date
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, data)
    print(f"-> Loaded {len(data)} orders.")

    # 6. Order Items (batched 10k)
    print("Loading order_items...")
    fpath = os.path.join(data_dir, 'olist_order_items_dataset.csv')
    df = pd.read_csv(fpath)
    batch_size = 10000
    total = len(df)
    for start in range(0, total, batch_size):
        chunk = df.iloc[start:start+batch_size]
        data = [
            (r['order_id'], safe_int(r['order_item_id']), r['product_id'], r['seller_id'],
             safe_str(r['shipping_limit_date']), safe_float(r['price']), safe_float(r['freight_value']))
            for _, r in chunk.iterrows()
        ]
        cursor.executemany("""
            INSERT IGNORE INTO order_items (
                order_id, order_item_id, product_id, seller_id,
                shipping_limit_date, price, freight_value
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, data)
    print(f"-> Loaded {total} order_items.")

    # 7. Order Payments (batched 10k)
    print("Loading order_payments...")
    fpath = os.path.join(data_dir, 'olist_order_payments_dataset.csv')
    df = pd.read_csv(fpath)
    total = len(df)
    for start in range(0, total, batch_size):
        chunk = df.iloc[start:start+batch_size]
        data = [
            (r['order_id'], safe_int(r['payment_sequential']), r['payment_type'],
             safe_int(r['payment_installments']), safe_float(r['payment_value']))
            for _, r in chunk.iterrows()
        ]
        cursor.executemany("""
            INSERT IGNORE INTO order_payments (
                order_id, payment_sequential, payment_type, payment_installments, payment_value
            ) VALUES (%s, %s, %s, %s, %s)
        """, data)
    print(f"-> Loaded {total} order_payments.")

    # 8. Order Reviews (batched 10k)
    print("Loading order_reviews...")
    fpath = os.path.join(data_dir, 'olist_order_reviews_dataset.csv')
    df = pd.read_csv(fpath)
    df = df.drop_duplicates(subset=['review_id', 'order_id'])
    total = len(df)
    for start in range(0, total, batch_size):
        chunk = df.iloc[start:start+batch_size]
        data = [
            (
                r['review_id'], r['order_id'], safe_int(r['review_score']),
                safe_str(r['review_comment_title'], 255),
                safe_str(r['review_comment_message']),
                safe_str(r['review_creation_date']),
                safe_str(r['review_answer_timestamp'])
            )
            for _, r in chunk.iterrows()
        ]
        cursor.executemany("""
            INSERT IGNORE INTO order_reviews (
                review_id, order_id, review_score, review_comment_title,
                review_comment_message, review_creation_date, review_answer_timestamp
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, data)
    print(f"-> Loaded {total} order_reviews.")

    # 9. Geolocation (batched 20k)
    print("Loading geolocation (1,000,163 records)...")
    fpath = os.path.join(data_dir, 'olist_geolocation_dataset.csv')
    df = pd.read_csv(fpath)
    total = len(df)
    geo_batch = 20000
    for start in range(0, total, geo_batch):
        chunk = df.iloc[start:start+geo_batch]
        data = [
            (safe_int(r['geolocation_zip_code_prefix']), safe_float(r['geolocation_lat']),
             safe_float(r['geolocation_lng']), safe_str(r['geolocation_city'], 100), safe_str(r['geolocation_state'], 2))
            for _, r in chunk.iterrows()
        ]
        cursor.executemany("""
            INSERT INTO geolocation (
                geolocation_zip_code_prefix, geolocation_lat, geolocation_lng,
                geolocation_city, geolocation_state
            ) VALUES (%s, %s, %s, %s, %s)
        """, data)
    print(f"-> Loaded {total} geolocation records.")

    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")
    cursor.execute("SET UNIQUE_CHECKS = 1;")
    conn.commit()
    print("All datasets committed successfully.")

def verify_counts(conn):
    print("\n--- Verifying Table Counts in Database ---")
    tables = [
        'users', 'product_category_translation', 'customers', 'sellers',
        'products', 'orders', 'order_items', 'order_payments',
        'order_reviews', 'geolocation'
    ]
    cursor = conn.cursor()
    for t in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {t};")
        count = cursor.fetchone()[0]
        print(f"  {t:30s}: {count:,} records")

def main():
    start_time = time.time()
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'dataset_technical_test_netcom')
    if not os.path.exists(data_dir):
        print(f"Error: dataset folder not found at {data_dir}")
        sys.exit(1)

    print(f"Connecting to MySQL at {Config.DB_HOST}:{Config.DB_PORT} as {Config.DB_USER}...")
    conn = pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        charset='utf8mb4',
        autocommit=False
    )

    try:
        with conn.cursor() as cur:
            run_schema(cur)
            seed_users(cur)
        conn.commit()

        conn.select_db(Config.DB_NAME)
        ingest_data(conn, data_dir)
        verify_counts(conn)

        elapsed = time.time() - start_time
        print(f"\nDatabase setup and ingestion completed in {elapsed:.2f} seconds!")
    except Exception as e:
        conn.rollback()
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        conn.close()

if __name__ == '__main__':
    main()
