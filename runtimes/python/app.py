"""Minimal WSGI app. Gunicorn imports the `app` callable."""


def app(environ, start_response):
    body = b"ok\n"
    start_response(
        "200 OK",
        [
            ("Content-Type", "text/plain; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("X-Content-Type-Options", "nosniff"),
        ],
    )
    return [body]
