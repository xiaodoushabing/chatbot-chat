#!/usr/bin/env python3
"""Simple SPA server that serves dist/ and falls back to index.html for client-side routing."""

import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 3000
DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")


class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST, **kwargs)

    def do_GET(self):
        # Serve the actual file if it exists, otherwise fall back to index.html (SPA routing)
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path) and not os.path.exists(os.path.join(path, "index.html")):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    with http.server.HTTPServer(("0.0.0.0", PORT), SPAHandler) as server:
        print(f"Serving dist/ at http://localhost:{PORT}")
        server.serve_forever()
