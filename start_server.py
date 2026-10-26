import http.server
import socketserver
import webbrowser
import os
import sys

# Allow port override via environment variable; fallback list for auto-selection
PREFERRED_PORT = int(os.environ.get("RVCE_PORT", 8080))
DIRECTORY = os.path.join(os.path.dirname(__file__), "rvce-map")

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def log_message(self, format, *args):
        # Suppress noisy request logs; keep only errors
        if args and str(args[1]) not in ('200', '304'):
            super().log_message(format, *args)

class ReusableTCPServer(socketserver.TCPServer):
    # Allow immediate restart without "Address already in use" error
    allow_reuse_address = True

def find_free_port(start):
    import socket
    for port in range(start, start + 20):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("", port))
                return port
        except OSError:
            continue
    return None

def run():
    os.chdir(DIRECTORY)
    port = find_free_port(PREFERRED_PORT)
    if port is None:
        print("ERROR: No free port found in range 8080-8099. Close other servers and retry.")
        sys.exit(1)

    with ReusableTCPServer(("", port), Handler) as httpd:
        url = f"http://localhost:{port}/index.html"
        print(f"\n=======================================================")
        print(f"  RVCE Campus Map & Navigation System is running!")
        print(f"  Open in browser: {url}")
        print(f"=======================================================\n")
        try:
            webbrowser.open(url)
        except Exception:
            pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")

if __name__ == "__main__":
    run()

