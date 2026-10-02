"""Statischer Testserver: wie `python -m http.server`, aber mit großer Verbindungs-Warteschlange.
Unter Last (viele parallele Testläufe) weist der Standardserver (request_queue_size=5) Verbindungen mit RST ab."""
import http.server, socketserver, sys, os, functools


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass


if __name__ == '__main__':
    port, root = int(sys.argv[1]), (sys.argv[2] if len(sys.argv) > 2 else os.getcwd())
    Server(('127.0.0.1', port), functools.partial(Quiet, directory=root)).serve_forever()
