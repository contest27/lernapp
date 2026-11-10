"""Dev server: python http.server with caching disabled, so edits always show."""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "app")


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, *args):
        pass


class Server(http.server.ThreadingHTTPServer):
    # socketserver's default listen backlog is 5. The test page imports some
    # sixty modules at once over several connections; when the backlog is full
    # Windows refuses the connection and the page reports "Failed to fetch
    # dynamically imported module". The gate failed 2 runs in 8 at 7f67cf5 and
    # 5 in 10 once Unit 7 added two modules (2026-11-10).
    request_queue_size = 128
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", PORT), NoCacheHandler) as srv:
        print(f"serving {ROOT} on http://127.0.0.1:{PORT}")
        srv.serve_forever()
