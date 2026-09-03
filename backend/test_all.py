import httpx
endpoints = [
    '/api/v1/system/health',
    '/api/v1/system/alerts',
    '/api/v1/system/activity',
    '/api/v1/analytics/road-segments',
    '/api/v1/analytics/roads/summary',
    '/api/v1/detections',
    '/api/v1/issues',
    '/api/v1/issues/summary',
    '/api/v1/fleet/buses',
    '/api/v1/fleet/routes',
    '/api/v1/tickets',
    '/api/v1/tickets/summary',
    '/api/v1/verifications',
    '/api/v1/verifications/summary',
    '/api/v1/departments'
]
for ep in endpoints:
    try:
        r = httpx.get('http://localhost:8000' + ep, timeout=2.0)
        print(f'{r.status_code} {ep}')
    except Exception as e:
        print(f'ERROR {ep} {e}')
