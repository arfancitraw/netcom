import sys
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import create_app

def run_tests():
    print("=" * 60)
    print("NETCOM E-COMMERCE ANALYTICS & CRUD API TEST SUITE")
    print("=" * 60)

    app = create_app()
    client = app.test_client()

    # 1. Health
    res = client.get('/api/health')
    assert res.status_code == 200, f"Health check failed: {res.status_code}"
    print("[PASS] 1. /api/health - Database connected")

    # 2. Login Tests for all 3 RBAC Roles
    roles = [
        ('admin', 'Admin@123', 'admin'),
        ('manager', 'Manager@123', 'manager'),
        ('viewer', 'Viewer@123', 'viewer')
    ]
    tokens = {}
    for user, pwd, expected_role in roles:
        res = client.post('/api/auth/login', json={'username': user, 'password': pwd})
        assert res.status_code == 200, f"Login failed for {user}: {res.get_json()}"
        data = res.get_json()
        auth_data = data.get('data', {})
        assert auth_data.get('user', {}).get('role') == expected_role, f"Role mismatch for {user}"
        tokens[expected_role] = auth_data['token']
        print(f"[PASS] 2. Login verification: {user} ({expected_role})")

    admin_headers = {'Authorization': f"Bearer {tokens['admin']}"}
    viewer_headers = {'Authorization': f"Bearer {tokens['viewer']}"}

    # 3. Auth Me
    res = client.get('/api/auth/me', headers=admin_headers)
    assert res.status_code == 200
    assert res.get_json()['user']['username'] == 'admin'
    print("[PASS] 3. /api/auth/me - Token validation passed")

    # 4. CRUD Datasets
    res = client.get('/api/crud/datasets', headers=admin_headers)
    assert res.status_code == 200
    datasets = res.get_json()['data']
    assert len(datasets) == 9
    print(f"[PASS] 4. /api/crud/datasets - All 9 datasets listed ({len(datasets)} tables)")

    # 5. CRUD Schema and Pagination (Customers)
    res = client.get('/api/crud/schema/customers', headers=admin_headers)
    assert res.status_code == 200
    res_list = client.get('/api/crud/customers?page=1&per_page=10', headers=admin_headers)
    assert res_list.status_code == 200
    assert len(res_list.get_json()['data']) == 10
    total_cust = res_list.get_json()['pagination']['total']
    assert total_cust == 99441
    print(f"[PASS] 5. /api/crud/customers - Schema inspected and paginated (Total: {total_cust})")

    # 6. Analytics Overview
    res = client.get('/api/analytics/overview', headers=admin_headers)
    assert res.status_code == 200
    kpis = res.get_json()['data']['kpis']
    assert kpis['total_orders'] == 99441
    assert kpis['total_revenue'] > 13000000
    print(f"[PASS] 6. /api/analytics/overview - KPIs verified (Orders: {kpis['total_orders']}, Rev: R$ {kpis['total_revenue']:,.2f})")

    # 7. Analytics Daily Revenue (November 2017)
    res = client.get('/api/analytics/daily-revenue?year=2017&month=11', headers=admin_headers)
    assert res.status_code == 200
    dr = res.get_json()
    assert dr['summary']['peak_day']['date'] == '2017-11-24'
    assert dr['summary']['peak_day']['revenue'] == 152653.74
    print(f"[PASS] 7. /api/analytics/daily-revenue - November 2017 Peak verified on {dr['summary']['peak_day']['date']} (R$ {dr['summary']['peak_day']['revenue']:,.2f})")

    # 8. Analytics Anomalies (Black Friday Detection)
    res = client.get('/api/analytics/anomalies?year=2017', headers=admin_headers)
    assert res.status_code == 200
    anom = res.get_json()
    top_anom = anom['anomalies'][0]
    assert top_anom['date'] == '2017-11-24'
    assert top_anom['z_score'] > 3.0
    print(f"[PASS] 8. /api/analytics/anomalies - Black Friday 2017 detected (Z-Score: {top_anom['z_score']}, Tag: {top_anom['event_tag']})")

    # 9. Operational Unshipped Orders
    res = client.get('/api/analytics/unshipped-orders?page=1&page_size=10', headers=admin_headers)
    assert res.status_code == 200
    unsh = res.get_json()
    assert unsh['summary']['total_unshipped'] > 1000
    print(f"[PASS] 9. /api/analytics/unshipped-orders - Operational queue verified ({unsh['summary']['total_unshipped']} unshipped orders)")

    # 10. Role-Based Access Control (RBAC) Enforcement
    res_forbidden = client.patch('/api/analytics/orders/non_existent/status', json={'order_status': 'shipped'}, headers=viewer_headers)
    assert res_forbidden.status_code == 403, f"Expected 403 for viewer, got {res_forbidden.status_code}"
    print("[PASS] 10. RBAC Protection - Viewer forbidden from PATCH status (HTTP 403 verified)")

    print("=" * 60)
    print("All 10 API test suites passed successfully.")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
