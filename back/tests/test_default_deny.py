"""Правило A (Этап 0, коммит 6): ни один эндпоинт не должен молча стать
публичным при снятии блокетной защиты из main.py.

Проверка — интроспекция дерева зависимостей FastAPI, а не HTTP-запросы:
идём по route.dependant.dependencies рекурсивно и ищем app.deps.get_current_user.
Он вызывается и напрямую (auth.get_auth_user), и транзитивно через
get_current_employee/require_roles — так что "не найден" однозначно значит
«маршрут не защищён», а не false positive из-за формы запроса/тела.
"""
from fastapi.routing import APIRoute

from app.deps import get_current_user
from app.main import app

# Единственные сознательно публичные маршруты Этапа 0.
PUBLIC_WHITELIST = {
    ("POST", "/api/auth/login"),
}


def _route_uses_auth(route: APIRoute) -> bool:
    def walk(dependant) -> bool:
        if dependant.call is get_current_user:
            return True
        return any(walk(sub) for sub in dependant.dependencies)

    return walk(route.dependant)


def _api_routes() -> list[APIRoute]:
    return [
        route
        for route in app.routes
        if isinstance(route, APIRoute) and route.path.startswith("/api/")
    ]


def test_every_api_route_is_protected_or_whitelisted():
    unprotected = []
    for route in _api_routes():
        for method in route.methods - {"HEAD", "OPTIONS"}:
            if (method, route.path) in PUBLIC_WHITELIST:
                continue
            if not _route_uses_auth(route):
                unprotected.append(f"{method} {route.path}")

    assert not unprotected, (
        "Найдены /api-маршруты без auth-зависимости и вне PUBLIC_WHITELIST "
        f"(правило A нарушено): {unprotected}"
    )


def test_whitelist_entries_still_exist_and_are_intentionally_public():
    """Обратная проверка: если /login когда-нибудь обзаведётся auth-зависимостью
    или будет переименован, это тоже должно быть замечено, а не тихо пройти."""
    routes_by_key = {
        (method, route.path): route
        for route in _api_routes()
        for method in route.methods - {"HEAD", "OPTIONS"}
    }
    for key in PUBLIC_WHITELIST:
        assert key in routes_by_key, f"Публичный маршрут {key} из whitelist не найден в приложении"
        assert not _route_uses_auth(routes_by_key[key]), (
            f"{key} в PUBLIC_WHITELIST, но фактически защищён — whitelist устарел"
        )
