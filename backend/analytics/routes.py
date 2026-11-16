import datetime
from flask import Blueprint, request, jsonify
import numpy as np
from auth.routes import require_auth
from db import execute_query, execute_update

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

KNOWN_COMMERCE_EVENTS = {
    '2017-11-24': 'Black Friday 2017 (Record Spike: R$ 152k+, 1,166 orders)',
    '2017-11-25': 'Black Friday Weekend 2017 (High carry-over volume)',
    '2017-11-27': 'Cyber Monday 2017 (Post-holiday e-commerce surge)',
    '2018-05-16': 'E-Commerce promotional campaign / seasonal spike',
    '2016-10-04': 'Initial system onboarding & pilot merchant wave'
}

def serialize_scalar(value):
    if value is None:
        return None
    if isinstance(value, (datetime.date, datetime.datetime)):
        return value.isoformat()
    try:
        return float(value)
    except (ValueError, TypeError):
        return str(value)

def serialize_record(record_dict):
    return {column_name: serialize_scalar(column_val) for column_name, column_val in record_dict.items()}

def determine_sla_status(purchase_timestamp, estimated_delivery_timestamp):
    if not estimated_delivery_timestamp or not purchase_timestamp:
        return 'Within SLA'
    
    lead_time_days = (estimated_delivery_timestamp.date() - purchase_timestamp.date()).days
    if lead_time_days < 5:
        return 'Urgent'
    if lead_time_days < 10:
        return 'Normal'
    return 'Standard SLA'

def compute_distribution_metrics(revenues, method='zscore', threshold=2.5):
    mean_revenue = float(np.mean(revenues))
    std_revenue = float(np.std(revenues))
    median_revenue = float(np.median(revenues))
    percentile_25 = float(np.percentile(revenues, 25))
    percentile_75 = float(np.percentile(revenues, 75))
    interquartile_range = float(percentile_75 - percentile_25)

    if method == 'iqr':
        multiplier = threshold
        upper_cutoff = percentile_75 + (multiplier * interquartile_range)
        lower_cutoff = max(0.0, percentile_25 - (multiplier * interquartile_range))
    else:
        upper_cutoff = mean_revenue + (threshold * std_revenue)
        lower_cutoff = max(0.0, mean_revenue - (threshold * std_revenue))

    return {
        'mean': mean_revenue,
        'std': std_revenue,
        'median': median_revenue,
        'q25': percentile_25,
        'q75': percentile_75,
        'iqr': interquartile_range,
        'upper_bound': upper_cutoff,
        'lower_bound': lower_cutoff
    }

@analytics_bp.route('/overview', methods=['GET'])
@require_auth()
def get_overview():
    try:
        kpi_query = """
        SELECT 
            (SELECT COUNT(*) FROM orders) as total_orders,
            (SELECT COUNT(*) FROM customers) as total_customers,
            (SELECT COUNT(*) FROM products) as total_products,
            (SELECT COUNT(*) FROM sellers) as total_sellers,
            (SELECT ROUND(SUM(price), 2) FROM order_items) as total_merchandise_revenue,
            (SELECT ROUND(SUM(freight_value), 2) FROM order_items) as total_freight_revenue,
            (SELECT ROUND(SUM(price + freight_value), 2) FROM order_items) as total_gross_revenue,
            (SELECT ROUND(AVG(review_score), 2) FROM order_reviews) as avg_review_score
        """
        kpi_summary = execute_query(kpi_query, fetch_one=True)

        status_query = """
        SELECT order_status, COUNT(*) as count 
        FROM orders 
        GROUP BY order_status 
        ORDER BY count DESC
        """
        order_status_rows = execute_query(status_query)

        categories_query = """
        SELECT 
            COALESCE(t.product_category_name_english, p.product_category_name, 'Unknown') as category,
            COUNT(oi.order_item_id) as items_sold,
            ROUND(SUM(oi.price), 2) as total_revenue
        FROM order_items oi
        JOIN products p ON oi.product_id = p.product_id
        LEFT JOIN product_category_translation t ON p.product_category_name = t.product_category_name
        GROUP BY category
        ORDER BY total_revenue DESC
        LIMIT 7
        """
        top_category_rows = execute_query(categories_query)

        payments_query = """
        SELECT 
            payment_type,
            COUNT(order_id) as transaction_count,
            ROUND(SUM(payment_value), 2) as total_value
        FROM order_payments
        GROUP BY payment_type
        ORDER BY total_value DESC
        """
        payment_rows = execute_query(payments_query)

        trend_query = """
        SELECT 
            SUBSTRING(o.order_purchase_timestamp, 1, 7) as month_year,
            ROUND(SUM(oi.price), 2) as revenue,
            COUNT(DISTINCT o.order_id) as orders
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.order_status != 'canceled'
        GROUP BY SUBSTRING(o.order_purchase_timestamp, 1, 7)
        ORDER BY month_year ASC
        """
        monthly_trend_rows = execute_query(trend_query)

        total_orders_count = int(kpi_summary['total_orders'] or 0)
        total_revenue_amount = float(kpi_summary['total_merchandise_revenue'] or 0)
        average_order_value = (
            round(total_revenue_amount / total_orders_count, 2)
            if total_orders_count > 0
            else 0
        )

        return jsonify({
            'success': True,
            'data': {
                'kpis': {
                    'total_orders': total_orders_count,
                    'total_customers': int(kpi_summary['total_customers'] or 0),
                    'total_products': int(kpi_summary['total_products'] or 0),
                    'total_sellers': int(kpi_summary['total_sellers'] or 0),
                    'total_revenue': total_revenue_amount,
                    'total_freight': float(kpi_summary['total_freight_revenue'] or 0),
                    'total_gross': float(kpi_summary['total_gross_revenue'] or 0),
                    'avg_order_value': average_order_value,
                    'avg_review_score': float(kpi_summary['avg_review_score'] or 0)
                },
                'order_statuses': [serialize_record(row) for row in order_status_rows],
                'top_categories': [serialize_record(row) for row in top_category_rows],
                'payment_methods': [serialize_record(row) for row in payment_rows],
                'monthly_trend': [serialize_record(row) for row in monthly_trend_rows]
            }
        })
    except Exception as exc:
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': f'Failed to retrieve overview: {str(exc)}'}
        }), 500

@analytics_bp.route('/daily-revenue', methods=['GET'])
@require_auth()
def get_daily_revenue():
    try:
        year_param = request.args.get('year')
        month_param = request.args.get('month')

        years_query = """
        SELECT DISTINCT YEAR(order_purchase_timestamp) as calendar_year
        FROM orders
        ORDER BY calendar_year ASC
        """
        year_rows = execute_query(years_query)
        available_years = [int(row['calendar_year']) for row in year_rows if row['calendar_year'] is not None]

        if year_param == 'all':
            selected_year = None
        elif year_param and year_param.isdigit():
            selected_year = int(year_param)
        else:
            selected_year = 2017

        selected_month = int(month_param) if month_param and month_param.isdigit() else None

        if selected_year:
            months_query = """
            SELECT DISTINCT MONTH(order_purchase_timestamp) as calendar_month
            FROM orders
            WHERE YEAR(order_purchase_timestamp) = %s
            ORDER BY calendar_month ASC
            """
            month_rows = execute_query(months_query, (selected_year,))
            available_months = [int(row['calendar_month']) for row in month_rows if row['calendar_month'] is not None]
        else:
            available_months = list(range(1, 13))

        filter_clauses = ["o.order_status != 'canceled'"]
        query_parameters = []

        if selected_year:
            filter_clauses.append("YEAR(o.order_purchase_timestamp) = %s")
            query_parameters.append(selected_year)
        if selected_month:
            filter_clauses.append("MONTH(o.order_purchase_timestamp) = %s")
            query_parameters.append(selected_month)

        where_condition = " AND ".join(filter_clauses)

        daily_revenue_query = f"""
        SELECT 
            DATE(o.order_purchase_timestamp) as date_str,
            DAY(o.order_purchase_timestamp) as day_num,
            MONTH(o.order_purchase_timestamp) as month_num,
            YEAR(o.order_purchase_timestamp) as year_num,
            COUNT(DISTINCT o.order_id) as order_count,
            COUNT(oi.order_item_id) as item_count,
            ROUND(SUM(oi.price), 2) as revenue,
            ROUND(SUM(oi.freight_value), 2) as freight,
            ROUND(SUM(oi.price + oi.freight_value), 2) as gross_revenue
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE {where_condition}
        GROUP BY DATE(o.order_purchase_timestamp), day_num, month_num, year_num
        ORDER BY date_str ASC
        """
        records = execute_query(daily_revenue_query, query_parameters)

        daily_series = []
        cumulative_revenue = 0.0
        cumulative_freight = 0.0
        cumulative_orders = 0
        cumulative_items = 0
        peak_revenue_day = None
        lowest_revenue_day = None

        for row in records:
            day_revenue = float(row['revenue'] or 0)
            day_freight = float(row['freight'] or 0)
            day_orders = int(row['order_count'] or 0)
            day_items = int(row['item_count'] or 0)
            day_gross = float(row['gross_revenue'] or 0)
            day_aov = round(day_revenue / day_orders, 2) if day_orders > 0 else 0

            date_formatted = (
                row['date_str'].isoformat()
                if hasattr(row['date_str'], 'isoformat')
                else str(row['date_str'])
            )

            daily_entry = {
                'date': date_formatted,
                'day': int(row['day_num']),
                'month': int(row['month_num']),
                'year': int(row['year_num']),
                'revenue': day_revenue,
                'freight': day_freight,
                'gross_revenue': day_gross,
                'order_count': day_orders,
                'item_count': day_items,
                'average_order_value': day_aov
            }
            daily_series.append(daily_entry)

            cumulative_revenue += day_revenue
            cumulative_freight += day_freight
            cumulative_orders += day_orders
            cumulative_items += day_items

            if peak_revenue_day is None or day_revenue > peak_revenue_day['revenue']:
                peak_revenue_day = {'date': date_formatted, 'revenue': day_revenue, 'orders': day_orders}
            if lowest_revenue_day is None or day_revenue < lowest_revenue_day['revenue']:
                lowest_revenue_day = {'date': date_formatted, 'revenue': day_revenue, 'orders': day_orders}

        total_days = len(daily_series)
        average_daily_revenue = round(cumulative_revenue / total_days, 2) if total_days > 0 else 0
        overall_average_order_value = (
            round(cumulative_revenue / cumulative_orders, 2)
            if cumulative_orders > 0
            else 0
        )

        return jsonify({
            'success': True,
            'filters': {
                'year': selected_year,
                'month': selected_month,
                'available_years': available_years,
                'available_months': available_months
            },
            'summary': {
                'days_count': total_days,
                'total_revenue': round(cumulative_revenue, 2),
                'total_freight': round(cumulative_freight, 2),
                'total_gross': round(cumulative_revenue + cumulative_freight, 2),
                'total_orders': cumulative_orders,
                'total_items': cumulative_items,
                'avg_daily_revenue': average_daily_revenue,
                'avg_order_value': overall_average_order_value,
                'peak_day': peak_revenue_day,
                'lowest_day': lowest_revenue_day
            },
            'data': daily_series,
            'daily_revenue': daily_series
        })
    except Exception as exc:
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': f'Failed to query daily revenue: {str(exc)}'}
        }), 500

@analytics_bp.route('/anomalies', methods=['GET'])
@require_auth()
def get_anomalies():
    try:
        year_param = request.args.get('year')
        detection_method = request.args.get('method', 'zscore').lower()
        threshold_param = request.args.get('threshold')

        default_threshold = 1.5 if detection_method == 'iqr' else 2.5
        effective_threshold = float(threshold_param) if threshold_param else default_threshold

        filter_clauses = ["o.order_status != 'canceled'"]
        query_params = []
        if year_param and year_param.isdigit():
            filter_clauses.append("YEAR(o.order_purchase_timestamp) = %s")
            query_params.append(int(year_param))

        where_condition = " AND ".join(filter_clauses)

        timeline_query = f"""
        SELECT 
            DATE(o.order_purchase_timestamp) as date_str,
            COUNT(DISTINCT o.order_id) as order_count,
            ROUND(SUM(oi.price), 2) as revenue,
            ROUND(SUM(oi.freight_value), 2) as freight
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE {where_condition}
        GROUP BY DATE(o.order_purchase_timestamp)
        ORDER BY date_str ASC
        """
        timeline_rows = execute_query(timeline_query, query_params)

        if not timeline_rows:
            return jsonify({
                'success': True,
                'method': detection_method,
                'anomalies': [],
                'time_series': [],
                'stats': {}
            })

        revenues = np.array([float(row['revenue'] or 0) for row in timeline_rows], dtype=np.float64)
        stats = compute_distribution_metrics(revenues, detection_method, effective_threshold)

        anomalies_list = []
        time_series_points = []

        for row, daily_revenue in zip(timeline_rows, revenues):
            date_iso_string = (
                row['date_str'].isoformat()
                if hasattr(row['date_str'], 'isoformat')
                else str(row['date_str'])
            )
            order_volume = int(row['order_count'] or 0)

            standard_deviation = stats['std']
            mean_revenue = stats['mean']
            z_score = float((daily_revenue - mean_revenue) / standard_deviation) if standard_deviation > 0 else 0.0

            is_anomaly = False
            direction = 'normal'
            if detection_method == 'iqr':
                if daily_revenue > stats['upper_bound']:
                    is_anomaly = True
                    direction = 'surge'
                elif daily_revenue < stats['lower_bound'] and stats['lower_bound'] > 0:
                    is_anomaly = True
                    direction = 'dip'
            else:
                if abs(z_score) >= effective_threshold:
                    is_anomaly = True
                    direction = 'surge' if z_score > 0 else 'dip'

            severity = 'normal'
            if is_anomaly:
                absolute_z_score = abs(z_score)
                if absolute_z_score >= 4.0:
                    severity = 'critical'
                elif absolute_z_score >= 3.0:
                    severity = 'high'
                else:
                    severity = 'medium'

            event_tag = KNOWN_COMMERCE_EVENTS.get(date_iso_string, None)
            if not event_tag and is_anomaly:
                if direction == 'surge':
                    surge_ratio = round(daily_revenue / mean_revenue, 1)
                    event_tag = f'Unusual Revenue Surge ({surge_ratio}x historical mean)'
                else:
                    percentage_drop = round((1 - daily_revenue / mean_revenue) * 100)
                    event_tag = f'Unusual Drop ({percentage_drop}% below mean)'

            point_record = {
                'date': date_iso_string,
                'revenue': round(daily_revenue, 2),
                'order_count': order_volume,
                'z_score': round(z_score, 2),
                'is_anomaly': is_anomaly,
                'severity': severity,
                'direction': direction,
                'event_tag': event_tag
            }
            time_series_points.append(point_record)

            if is_anomaly:
                anomaly_item = {
                    **point_record,
                    'baseline_mean': round(mean_revenue, 2),
                    'deviation_from_mean': round(daily_revenue - mean_revenue, 2),
                    'upper_threshold': round(stats['upper_bound'], 2),
                    'lower_threshold': round(stats['lower_bound'], 2)
                }
                anomalies_list.append(anomaly_item)

        anomalies_list.sort(key=lambda item: abs(item['z_score']), reverse=True)

        return jsonify({
            'success': True,
            'method': detection_method,
            'threshold_used': effective_threshold,
            'stats': {
                'mean_daily_revenue': round(stats['mean'], 2),
                'std_daily_revenue': round(stats['std'], 2),
                'median_revenue': round(stats['median'], 2),
                'q25': round(stats['q25'], 2),
                'q75': round(stats['q75'], 2),
                'iqr': round(stats['iqr'], 2),
                'upper_bound': round(stats['upper_bound'], 2),
                'lower_bound': round(stats['lower_bound'], 2),
                'total_days_evaluated': len(timeline_rows),
                'anomaly_count': len(anomalies_list)
            },
            'anomalies': anomalies_list,
            'time_series': time_series_points
        })
    except Exception as exc:
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': f'Failed to run anomaly detection: {str(exc)}'}
        }), 500

@analytics_bp.route('/unshipped-orders', methods=['GET'])
@require_auth()
def get_unshipped_orders():
    try:
        page_number = max(1, int(request.args.get('page', 1)))
        page_size = min(100, max(5, int(request.args.get('page_size', 20))))
        status_filter = request.args.get('status')
        search_query = request.args.get('search', '').strip()
        sort_by = request.args.get('sort_by', 'order_purchase_timestamp')
        sort_order = request.args.get('sort_order', 'asc').lower()

        sort_column_mapping = {
            'order_purchase_timestamp': 'o.order_purchase_timestamp',
            'order_estimated_delivery_date': 'o.order_estimated_delivery_date',
            'order_status': 'o.order_status',
            'total_value': 'total_value',
            'item_count': 'item_count'
        }
        order_by_column = sort_column_mapping.get(sort_by, 'o.order_purchase_timestamp')
        order_direction = 'DESC' if sort_order == 'desc' else 'ASC'

        summary_query = """
        SELECT order_status, COUNT(*) as count
        FROM orders
        WHERE order_status IN ('processing', 'invoiced', 'approved', 'created', 'unavailable')
           OR (order_delivered_carrier_date IS NULL AND order_status != 'canceled')
        GROUP BY order_status
        """
        summary_rows = execute_query(summary_query)
        status_counts = {row['order_status']: int(row['count']) for row in summary_rows}
        total_unshipped_count = sum(status_counts.values())

        filter_clauses = [
            "(o.order_status IN ('processing', 'invoiced', 'approved', 'created', 'unavailable') "
            "OR (o.order_delivered_carrier_date IS NULL AND o.order_status != 'canceled'))"
        ]
        query_params = []

        if status_filter and status_filter.lower() != 'all':
            filter_clauses.append("o.order_status = %s")
            query_params.append(status_filter.lower())

        if search_query:
            filter_clauses.append(
                "(o.order_id LIKE %s OR o.customer_id LIKE %s OR c.customer_city LIKE %s OR c.customer_state LIKE %s)"
            )
            wildcard_pattern = f"%{search_query}%"
            query_params.extend([wildcard_pattern] * 4)

        where_condition = " AND ".join(filter_clauses)

        count_query = f"""
        SELECT COUNT(DISTINCT o.order_id) as total
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        WHERE {where_condition}
        """
        count_result = execute_query(count_query, query_params, fetch_one=True)
        total_matching_records = int(count_result['total'] or 0)
        total_pages = (
            (total_matching_records + page_size - 1) // page_size
            if total_matching_records > 0
            else 1
        )

        offset = (page_number - 1) * page_size

        unshipped_data_query = f"""
        SELECT 
            o.order_id,
            o.customer_id,
            o.order_status,
            o.order_purchase_timestamp,
            o.order_approved_at,
            o.order_delivered_carrier_date,
            o.order_estimated_delivery_date,
            c.customer_city,
            c.customer_state,
            COUNT(oi.order_item_id) as item_count,
            COALESCE(ROUND(SUM(oi.price), 2), 0.0) as total_value,
            COALESCE(ROUND(SUM(oi.freight_value), 2), 0.0) as freight_value
        FROM orders o
        JOIN customers c ON o.customer_id = c.customer_id
        LEFT JOIN order_items oi ON o.order_id = oi.order_id
        WHERE {where_condition}
        GROUP BY 
            o.order_id, o.customer_id, o.order_status, o.order_purchase_timestamp,
            o.order_approved_at, o.order_delivered_carrier_date, o.order_estimated_delivery_date,
            c.customer_city, c.customer_state
        ORDER BY {order_by_column} {order_direction}
        LIMIT %s OFFSET %s
        """
        paginated_params = list(query_params) + [page_size, offset]
        order_rows = execute_query(unshipped_data_query, paginated_params)

        orders_response_list = []
        for order_row in order_rows:
            purchase_timestamp = order_row['order_purchase_timestamp']
            estimated_delivery = order_row['order_estimated_delivery_date']

            sla_indicator = determine_sla_status(purchase_timestamp, estimated_delivery)

            orders_response_list.append({
                'order_id': order_row['order_id'],
                'customer_id': order_row['customer_id'],
                'order_status': order_row['order_status'],
                'purchase_timestamp': purchase_timestamp.isoformat() if purchase_timestamp else None,
                'approved_at': order_row['order_approved_at'].isoformat() if order_row['order_approved_at'] else None,
                'estimated_delivery': estimated_delivery.isoformat() if estimated_delivery else None,
                'customer_city': order_row['customer_city'],
                'customer_state': order_row['customer_state'],
                'item_count': int(order_row['item_count'] or 0),
                'total_value': float(order_row['total_value'] or 0),
                'freight_value': float(order_row['freight_value'] or 0),
                'sla_status': sla_indicator
            })

        return jsonify({
            'success': True,
            'summary': {
                'total_unshipped': total_unshipped_count,
                'status_breakdown': status_counts,
                'active_in_queue': (
                    status_counts.get('processing', 0)
                    + status_counts.get('invoiced', 0)
                    + status_counts.get('created', 0)
                    + status_counts.get('approved', 0)
                ),
                'unavailable_count': status_counts.get('unavailable', 0)
            },
            'pagination': {
                'page': page_number,
                'page_size': page_size,
                'total_records': total_matching_records,
                'total_pages': total_pages
            },
            'orders': orders_response_list
        })
    except Exception as exc:
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': f'Failed to query unshipped orders: {str(exc)}'}
        }), 500

@analytics_bp.route('/orders/<order_id>/status', methods=['PATCH'])
@require_auth(roles=['admin', 'manager'])
def update_order_status(order_id):
    try:
        request_body = request.get_json() or {}
        new_status = request_body.get('order_status')
        valid_statuses = {'created', 'approved', 'invoiced', 'processing', 'shipped', 'delivered', 'canceled', 'unavailable'}

        if not new_status or new_status not in valid_statuses:
            return jsonify({
                'success': False,
                'error': {'code': 400, 'message': f'Invalid status. Allowed: {sorted(valid_statuses)}'}
            }), 400

        check_query = "SELECT order_id, order_status FROM orders WHERE order_id = %s"
        existing_order = execute_query(check_query, (order_id,), fetch_one=True)
        if not existing_order:
            return jsonify({
                'success': False,
                'error': {'code': 404, 'message': f'Order {order_id} not found'}
            }), 404

        if new_status == 'shipped':
            update_query = """
            UPDATE orders 
            SET order_status = %s, order_delivered_carrier_date = NOW() 
            WHERE order_id = %s
            """
            execute_update(update_query, (new_status, order_id))
        else:
            update_query = "UPDATE orders SET order_status = %s WHERE order_id = %s"
            execute_update(update_query, (new_status, order_id))

        updated_order = execute_query("SELECT * FROM orders WHERE order_id = %s", (order_id,), fetch_one=True)
        return jsonify({
            'success': True,
            'message': f'Order {order_id} status updated to {new_status}',
            'order': serialize_record(updated_order)
        })
    except Exception as exc:
        return jsonify({
            'success': False,
            'error': {'code': 500, 'message': f'Failed to update order status: {str(exc)}'}
        }), 500
