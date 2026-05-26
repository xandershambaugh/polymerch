import os, sys
os.chdir('/Users/xandershambaugh/Desktop/polymerch')
import http.server, socketserver
PORT = 3456
Handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(('', PORT), Handler) as httpd:
    print(f'Serving on http://localhost:{PORT}')
    httpd.serve_forever()
