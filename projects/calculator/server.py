import ast
import http.server
import json
import math
import operator
import os
import platform
import socketserver
import sys
from urllib.parse import urlparse

def resolve_port():
    if len(sys.argv) > 1:
        return int(sys.argv[1]), True
    env_port = os.environ.get("PYCALC_PORT")
    if env_port:
        return int(env_port), True
    return 5050, False


WEB_DIR = os.path.dirname(os.path.abspath(__file__))

CALC_HISTORY = []
MAX_HISTORY = 50

SAFE_BINARY_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}

SAFE_UNARY_OPS = {
    ast.UAdd: operator.pos,
    ast.USub: operator.neg,
}

SAFE_CONSTANTS = {
    "pi": math.pi,
    "e": math.e,
    "tau": math.tau,
}


def get_safe_functions(angle_mode: str):
    is_deg = str(angle_mode).upper() == "DEG"
    return {
        "sin": (lambda x: math.sin(math.radians(x))) if is_deg else math.sin,
        "cos": (lambda x: math.cos(math.radians(x))) if is_deg else math.cos,
        "tan": (lambda x: math.tan(math.radians(x))) if is_deg else math.tan,
        "asin": (lambda x: math.degrees(math.asin(x))) if is_deg else math.asin,
        "acos": (lambda x: math.degrees(math.acos(x))) if is_deg else math.acos,
        "atan": (lambda x: math.degrees(math.atan(x))) if is_deg else math.atan,
        "sqrt": math.sqrt,
        "log": math.log,
        "log10": math.log10,
        "exp": math.exp,
        "abs": abs,
        "round": round,
        "floor": math.floor,
        "ceil": math.ceil,
        "factorial": lambda x: math.factorial(int(x)),
        "radians": math.radians,
        "degrees": math.degrees,
    }


def eval_ast(node, funcs):
    if isinstance(node, ast.Expression):
        return eval_ast(node.body, funcs)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value
        raise ValueError("Only numeric constants are supported")
    if isinstance(node, ast.Name):
        if node.id in SAFE_CONSTANTS:
            return SAFE_CONSTANTS[node.id]
        raise ValueError(f"Unknown symbol: {node.id}")
    if isinstance(node, ast.BinOp):
        op_type = type(node.op)
        if op_type not in SAFE_BINARY_OPS:
            raise ValueError(f"Unsupported operator: {op_type.__name__}")
        left = eval_ast(node.left, funcs)
        right = eval_ast(node.right, funcs)
        if op_type in (ast.Div, ast.FloorDiv, ast.Mod) and right == 0:
            raise ZeroDivisionError("Cannot divide by zero")
        if op_type == ast.Pow and abs(right) > 1000:
            raise ValueError("Exponent too large")
        return SAFE_BINARY_OPS[op_type](left, right)
    if isinstance(node, ast.UnaryOp):
        op_type = type(node.op)
        if op_type not in SAFE_UNARY_OPS:
            raise ValueError(f"Unsupported unary operator: {op_type.__name__}")
        return SAFE_UNARY_OPS[op_type](eval_ast(node.operand, funcs))
    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name) or node.func.id not in funcs:
            raise ValueError("Unsupported function call")
        args = [eval_ast(arg, funcs) for arg in node.args]
        return funcs[node.func.id](*args)
    raise ValueError("Invalid mathematical expression")


def safe_calculate(expression: str, angle_mode: str = "DEG"):
    cleaned = expression.strip().replace("×", "*").replace("÷", "/").replace("−", "-").replace("^", "**")
    if not cleaned:
        raise ValueError("Empty expression")
    tree = ast.parse(cleaned, mode="eval")
    funcs = get_safe_functions(angle_mode)
    result = eval_ast(tree, funcs)
    if isinstance(result, float):
        if math.isnan(result) or math.isinf(result):
            raise ValueError("Result is undefined")
        rounded = round(result, 12)
        formatted = str(int(rounded)) if rounded.is_integer() else f"{rounded:g}"
    else:
        formatted = str(result)
    return result, formatted


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


class CalculatorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def send_json(self, status_code: int, payload: dict):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_HEAD(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/api/health", "/api/history"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return
        return super().do_HEAD()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_json(200, {
                "status": "ok",
                "port": self.server.server_address[1],
                "pythonVersion": platform.python_version(),
            })
            return
        if parsed.path == "/api/history":
            self.send_json(200, {"history": CALC_HISTORY})
            return
        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/calculate":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            try:
                data = json.loads(raw.decode("utf-8"))
                expr = str(data.get("expression", ""))
                angle_mode = str(data.get("angleMode", "DEG"))
                result, formatted = safe_calculate(expr, angle_mode)
                entry = {
                    "expression": expr,
                    "result": result,
                    "formatted": formatted,
                    "angleMode": angle_mode,
                }
                CALC_HISTORY.insert(0, entry)
                if len(CALC_HISTORY) > MAX_HISTORY:
                    CALC_HISTORY.pop()
                self.send_json(200, {
                    **entry,
                    "history": CALC_HISTORY,
                })
            except ZeroDivisionError as err:
                self.send_json(400, {"error": str(err)})
            except Exception as err:
                self.send_json(400, {"error": f"Invalid expression: {err}"})
            return
        self.send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/history":
            CALC_HISTORY.clear()
            self.send_json(200, {"history": []})
            return
        self.send_json(404, {"error": "Endpoint not found"})


if __name__ == "__main__":
    requested_port, is_explicit = resolve_port()
    httpd = None
    max_attempts = 1 if is_explicit else 10
    for offset in range(max_attempts):
        candidate_port = requested_port + offset
        try:
            httpd = ReusableTCPServer(("", candidate_port), CalculatorHandler)
            break
        except OSError:
            if offset == max_attempts - 1:
                raise

    bound_port = httpd.server_address[1]
    print("==================================================", flush=True)
    print(f"  PyCalc Python Server running on http://localhost:{bound_port}", flush=True)
    print(f"  Serving files from: {WEB_DIR}", flush=True)
    print("==================================================", flush=True)
    with httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nPyCalc server stopped.")
