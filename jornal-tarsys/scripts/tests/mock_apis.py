#!/usr/bin/env python3
"""Mock local das APIs usadas pelo coleta.py (RSS + SGS + Focus/Olinda).

Usado por test_coleta.py; pode ser rodado avulso: python mock_apis.py [porta].
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import parse_qs, urlparse

RSS = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>Feed de Teste</title><link>http://mock.local/</link>
<item><title>Interpretable machine learning for credit scoring with survival analysis</title>
<link>http://example.org/paper-scoring-ml?utm_source=rss</link>
<description>We propose a deep learning model for probability of default estimation.</description>
<pubDate>Tue, 14 Jul 2026 09:00:00 GMT</pubDate></item>
<item><title>Copom eleva a Selic e sinaliza cautela</title>
<link>http://example.org/copom-selic</link>
<description>Banco Central do Brasil ajusta juros; impacto no IPCA e no crédito.</description>
<pubDate>Wed, 15 Jul 2026 12:00:00 GMT</pubDate></item>
<item><title>Nova resolução do CMN sobre consignado</title>
<link>http://example.org/cmn-consignado</link>
<description>Resolução muda regras do empréstimo consignado e do rotativo do cartão.</description>
<pubDate>Thu, 16 Jul 2026 08:00:00 GMT</pubDate></item>
<item><title>Um assunto qualquer sem tema</title>
<link>http://example.org/aleatorio</link>
<description>Nada relacionado aos temas do jornal.</description>
<pubDate>Thu, 16 Jul 2026 10:00:00 GMT</pubDate></item>
</channel></rss>"""

SGS = {
    "432": [{"data": "16/07/2026", "valor": "15.00"}],
    "21082": [{"data": "31/05/2026", "valor": "3.6"}],
    "21084": [{"data": "31/05/2026", "valor": "4.1"}],
}
SGS_GENERICO = [{"data": "31/05/2026", "valor": "1.0"}]

FOCUS_MEDIANAS = {"IPCA": 4.3, "Selic": 14.5, "PIB Total": 1.9, "Câmbio": 5.6}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/rss/test.xml":
            self._send(RSS.encode(), "application/rss+xml")
        elif u.path.startswith("/dados/serie/bcdata.sgs."):
            cod = u.path.split("bcdata.sgs.")[1].split("/")[0]
            corpo = SGS.get(cod, SGS_GENERICO)
            self._send(json.dumps(corpo).encode(), "application/json")
        elif u.path.endswith("/ExpectativasMercadoAnuais"):
            filtro = parse_qs(u.query).get("$filter", [""])[0]
            partes = filtro.split("'")
            ind = partes[1] if len(partes) > 1 else "?"
            ref = partes[3] if len(partes) > 3 else "?"
            row = {"Indicador": ind, "Data": "2026-07-10", "DataReferencia": ref,
                   "Mediana": FOCUS_MEDIANAS.get(ind, 0)}
            self._send(json.dumps({"value": [row]}).encode(), "application/json")
        else:
            self.send_response(404)
            self.end_headers()

    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def criar_servidor(porta: int = 0) -> HTTPServer:
    """Cria o servidor em 127.0.0.1 (porta 0 = escolhe uma livre)."""
    return HTTPServer(("127.0.0.1", porta), Handler)


if __name__ == "__main__":
    srv = criar_servidor(int(sys.argv[1]) if len(sys.argv) > 1 else 8765)
    print(f"mock em http://127.0.0.1:{srv.server_address[1]}")
    srv.serve_forever()
