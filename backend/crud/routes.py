from flask import Blueprint, request, jsonify
from auth.routes import require_auth
from db import execute_query, execute_insert, execute_update, get_db_connection

crud_bp = Blueprint('crud', __name__, url_prefix='/api/crud')

ALLOWED_TABLES = {
    'customers': {
        'table': 'customers',
        'pk': ['customer_id'],
        'search_cols': ['customer_id', 'customer_unique_id', 'customer_city', 'customer_state'],
        'display_name': 'Customers'
    },
    'geolocation': {
        'table': 'geolocation',
        'pk': ['geolocation_id'],
        'search_cols': ['geolocation_city', 'geolocation_state'],
        'display_name': 'Geolocation'
    },
    'orders': {
        'table': 'orders',
        'pk': ['order_id'],
        'search_cols': ['order_id', 'customer_id', 'order_status'],
        'display_name': 'Orders'
    },
    'order_items': {
        'table': 'order_items',
        'pk': ['order_id', 'order_item_id'],
        'search_cols': ['order_id', 'product_id', 'seller_id'],
        'display_name': 'Order Items'
    },
    'order_payments': {
        'table': 'order_payments',
        'pk': ['order_id', 'payment_sequential'],
        'search_cols': ['order_id', 'payment_type'],
        'display_name': 'Order Payments'
    },
    'order_reviews': {
        'table': 'order_reviews',
        'pk': ['review_id'],
        'search_cols': ['review_id', 'order_id'],
        'display_name': 'Order Reviews'
    },
    'products': {
        'table': 'products',
        'pk': ['product_id'],
        'search_cols': ['product_id', 'product_category_name'],
        'display_name': 'Products'
    },
    'sellers': {
        'table': 'sellers',
        'pk': ['seller_id'],
        'search_cols': ['seller_id', 'seller_city', 'seller_state'],
        'display_name': 'Sellers'
    },
    'product_category_translation': {
        'table': 'product_category_translation',
        'pk': ['product_category_name'],
        'search_cols': ['product_category_name', 'product_category_name_english'],
        'display_name': 'Category Translations'
    }
}

def get_table_columns(table_name):
    query = """
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
        ORDER BY ORDINAL_POSITION;
    """
    return execute_query(query, (table_name,))

def normalize_record_values(record):
    if not record:
        return record
    for field_name, field_value in record.items():
        if hasattr(field_value, 'isoformat'):
            record[field_name] = field_value.isoformat()
        elif hasattr(field_value, 'as_tuple') or isinstance(field_value, float):
            record[field_name] = float(field_value)
    return record

@crud_bp.route('/datasets', methods=['GET'])
@require_auth()
def list_datasets():
    datasets = []
    for slug, meta in ALLOWED_TABLES.items():
        count_row = execute_query(f"SELECT COUNT(*) as count FROM `{meta['table']}`;", fetch_one=True)
        datasets.append({
            'slug': slug,
            'table': meta['table'],
            'display_name': meta['display_name'],
            'total_records': count_row['count'] if count_row else 0,
            'primary_keys': meta['pk']
        })
    return jsonify({'success': True, 'data': datasets}), 200

@crud_bp.route('/schema/<dataset>', methods=['GET'])
@require_auth()
def get_schema(dataset):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': f'Unknown dataset: {dataset}'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    columns_info = get_table_columns(table_meta['table'])
    return jsonify({
        'success': True,
        'dataset': dataset,
        'display_name': table_meta['display_name'],
        'primary_keys': table_meta['pk'],
        'columns': [
            {
                'name': col['COLUMN_NAME'],
                'data_type': col['DATA_TYPE'],
                'is_nullable': col['IS_NULLABLE'] == 'YES',
                'is_primary_key': col['COLUMN_KEY'] == 'PRI',
                'extra': col['EXTRA'],
                'default': col['COLUMN_DEFAULT']
            }
            for col in columns_info
        ]
    }), 200

@crud_bp.route('/<dataset>', methods=['GET'])
@require_auth()
def list_records(dataset):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': f'Unknown dataset: {dataset}'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    table_name = table_meta['table']
    page_number = max(1, int(request.args.get('page', 1)))
    per_page_count = min(100, max(5, int(request.args.get('per_page', 25))))
    sort_by_column = request.args.get('sort_by')
    sort_direction = 'DESC' if request.args.get('sort_order', 'asc').lower() == 'desc' else 'ASC'
    search_keyword = request.args.get('search', '').strip()

    valid_column_names = [col['COLUMN_NAME'] for col in get_table_columns(table_name)]
    if not sort_by_column or sort_by_column not in valid_column_names:
        sort_by_column = table_meta['pk'][0]

    filter_clauses = []
    query_parameters = []

    if search_keyword:
        search_subclauses = []
        for search_column in table_meta['search_cols']:
            if search_column in valid_column_names:
                search_subclauses.append(f"`{search_column}` LIKE %s")
                query_parameters.append(f"%{search_keyword}%")
        if search_subclauses:
            filter_clauses.append(f"({' OR '.join(search_subclauses)})")

    where_condition = f"WHERE {' AND '.join(filter_clauses)}" if filter_clauses else ""

    count_query = f"SELECT COUNT(*) as total FROM `{table_name}` {where_condition};"
    total_result = execute_query(count_query, tuple(query_parameters), fetch_one=True)
    total_records = total_result['total'] if total_result else 0

    record_offset = (page_number - 1) * per_page_count
    data_query = f"""
        SELECT * FROM `{table_name}`
        {where_condition}
        ORDER BY `{sort_by_column}` {sort_direction}
        LIMIT %s OFFSET %s;
    """
    paginated_params = list(query_parameters) + [per_page_count, record_offset]
    raw_records = execute_query(data_query, tuple(paginated_params))
    records = [normalize_record_values(record) for record in raw_records]

    total_pages = (total_records + per_page_count - 1) // per_page_count

    return jsonify({
        'success': True,
        'dataset': dataset,
        'data': records,
        'pagination': {
            'page': page_number,
            'per_page': per_page_count,
            'total': total_records,
            'total_pages': total_pages
        }
    }), 200

@crud_bp.route('/<dataset>/<path:record_id>', methods=['GET'])
@require_auth()
def get_record(dataset, record_id):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': 'Unknown dataset'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    pk_columns = table_meta['pk']
    pk_values = record_id.split('/')

    if len(pk_columns) != len(pk_values):
        return jsonify({'success': False, 'error': {'code': 400, 'message': f'Expected {len(pk_columns)} primary key parameters'}}), 400

    where_condition = " AND ".join([f"`{col}` = %s" for col in pk_columns])
    query = f"SELECT * FROM `{table_meta['table']}` WHERE {where_condition} LIMIT 1;"
    record = execute_query(query, tuple(pk_values), fetch_one=True)

    if not record:
        return jsonify({'success': False, 'error': {'code': 404, 'message': 'Record not found'}}), 404

    return jsonify({'success': True, 'data': normalize_record_values(record)}), 200

@crud_bp.route('/<dataset>', methods=['POST'])
@require_auth(roles=['admin', 'manager'])
def create_record(dataset):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': 'Unknown dataset'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    request_payload = request.get_json() or {}
    columns_info = get_table_columns(table_meta['table'])
    valid_columns = {col['COLUMN_NAME']: col for col in columns_info}

    insert_columns = []
    insert_values = []
    for field_name, field_value in request_payload.items():
        if field_name in valid_columns and valid_columns[field_name]['EXTRA'] != 'auto_increment':
            insert_columns.append(f"`{field_name}`")
            insert_values.append(field_value)

    if not insert_columns:
        return jsonify({'success': False, 'error': {'code': 400, 'message': 'No valid columns provided for insertion'}}), 400

    placeholders = ", ".join(["%s"] * len(insert_values))
    insert_query = f"INSERT INTO `{table_meta['table']}` ({', '.join(insert_columns)}) VALUES ({placeholders});"

    try:
        last_id = execute_insert(insert_query, tuple(insert_values))
        return jsonify({
            'success': True,
            'message': 'Record created successfully',
            'inserted_id': last_id or (request_payload.get(table_meta['pk'][0]))
        }), 201
    except Exception as exc:
        return jsonify({'success': False, 'error': {'code': 400, 'message': str(exc)}}), 400

@crud_bp.route('/<dataset>/<path:record_id>', methods=['PUT'])
@require_auth(roles=['admin', 'manager'])
def update_record(dataset, record_id):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': 'Unknown dataset'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    pk_columns = table_meta['pk']
    pk_values = record_id.split('/')

    if len(pk_columns) != len(pk_values):
        return jsonify({'success': False, 'error': {'code': 400, 'message': 'Primary key mismatch'}}), 400

    request_payload = request.get_json() or {}
    columns_info = get_table_columns(table_meta['table'])
    valid_columns = {col['COLUMN_NAME']: col for col in columns_info}

    update_fragments = []
    parameter_values = []
    for field_name, field_value in request_payload.items():
        if field_name in valid_columns and field_name not in pk_columns:
            update_fragments.append(f"`{field_name}` = %s")
            parameter_values.append(field_value)

    if not update_fragments:
        return jsonify({'success': False, 'error': {'code': 400, 'message': 'No editable fields provided'}}), 400

    where_condition = " AND ".join([f"`{col}` = %s" for col in pk_columns])
    parameter_values.extend(pk_values)

    update_query = f"UPDATE `{table_meta['table']}` SET {', '.join(update_fragments)} WHERE {where_condition};"
    try:
        affected_rows = execute_update(update_query, tuple(parameter_values))
        return jsonify({
            'success': True,
            'message': 'Record updated successfully',
            'affected_rows': affected_rows
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': {'code': 400, 'message': str(exc)}}), 400

@crud_bp.route('/<dataset>/<path:record_id>', methods=['DELETE'])
@require_auth(roles=['admin'])
def delete_record(dataset, record_id):
    if dataset not in ALLOWED_TABLES:
        return jsonify({'success': False, 'error': {'code': 404, 'message': 'Unknown dataset'}}), 404

    table_meta = ALLOWED_TABLES[dataset]
    pk_columns = table_meta['pk']
    pk_values = record_id.split('/')

    if len(pk_columns) != len(pk_values):
        return jsonify({'success': False, 'error': {'code': 400, 'message': 'Primary key mismatch'}}), 400

    where_condition = " AND ".join([f"`{col}` = %s" for col in pk_columns])
    delete_query = f"DELETE FROM `{table_meta['table']}` WHERE {where_condition};"

    try:
        affected_rows = execute_update(delete_query, tuple(pk_values))
        return jsonify({
            'success': True,
            'message': f'Record deleted successfully ({affected_rows} row removed)'
        }), 200
    except Exception as exc:
        return jsonify({'success': False, 'error': {'code': 400, 'message': str(exc)}}), 400
