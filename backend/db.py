import pymysql
from pymysql.cursors import DictCursor
from dbutils.pooled_db import PooledDB
from config import Config

_pool = None

def get_pool():
    global _pool
    if _pool is None:
        try:
            from dbutils.pooled_db import PooledDB
            _pool = PooledDB(
                creator=pymysql,
                maxconnections=20,
                mincached=2,
                maxcached=5,
                maxshared=3,
                blocking=True,
                host=Config.DB_HOST,
                port=Config.DB_PORT,
                user=Config.DB_USER,
                password=Config.DB_PASSWORD,
                database=Config.DB_NAME,
                charset='utf8mb4',
                cursorclass=DictCursor,
                autocommit=True
            )
        except ImportError:
            # Fallback if DBUtils not yet installed
            return None
    return _pool

def get_db_connection():
    pool = get_pool()
    if pool:
        return pool.connection()
    return pymysql.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=Config.DB_NAME,
        charset='utf8mb4',
        cursorclass=DictCursor,
        autocommit=True
    )

def execute_query(query_sql, parameters=None, fetch_one=False, fetch_all=True):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query_sql, parameters or ())
            if fetch_one:
                return cursor.fetchone()
            if fetch_all:
                return cursor.fetchall()
            return cursor.rowcount
    finally:
        connection.close()

def execute_insert(query_sql, parameters=None):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query_sql, parameters or ())
            return cursor.lastrowid
    finally:
        connection.close()

def execute_update(query_sql, parameters=None):
    connection = get_db_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query_sql, parameters or ())
            return cursor.rowcount
    finally:
        connection.close()
