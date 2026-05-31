from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timedelta
import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "otica_regina.sqlite3"
PASSWORD_HASH_ALGORITHM = "sha256"
PASSWORD_HASH_ITERATIONS = 120000
SESSION_TIMEOUT_SECONDS = 2 * 60 * 60
SESSION_COOKIE_NAME = "otica_regina_session"


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        PASSWORD_HASH_ALGORITHM,
        password.encode("utf-8"),
        salt,
        PASSWORD_HASH_ITERATIONS,
        dklen=32,
    )
    return "$".join(
        [
            PASSWORD_HASH_ALGORITHM,
            str(PASSWORD_HASH_ITERATIONS),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        ]
    )


def verify_password(password, stored_hash):
    try:
        algorithm, iterations, salt_b64, digest_b64 = stored_hash.split("$", 3)
    except ValueError:
        return False
    salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
    expected = base64.urlsafe_b64decode(digest_b64.encode("ascii"))
    computed = hashlib.pbkdf2_hmac(
        algorithm,
        password.encode("utf-8"),
        salt,
        int(iterations),
        dklen=len(expected),
    )
    return hmac.compare_digest(expected, computed)


def create_user(conn, username, password):
    password_hash = hash_password(password)
    conn.execute(
        "INSERT OR IGNORE INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
        (username, password_hash, datetime.now().isoformat(timespec="seconds")),
    )


def get_user(conn, username):
    return conn.execute(
        "SELECT username, password_hash FROM users WHERE username = ?",
        (username,),
    ).fetchone()


def create_session(conn, username):
    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now() + timedelta(seconds=SESSION_TIMEOUT_SECONDS)).isoformat(timespec="seconds")
    conn.execute(
        "INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)",
        (token, username, expires_at),
    )
    return token


def get_session(conn, token):
    row = conn.execute(
        "SELECT token, username, expires_at FROM sessions WHERE token = ?",
        (token,),
    ).fetchone()
    if not row:
        return None
    if datetime.fromisoformat(row["expires_at"]) < datetime.now():
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))
        return None
    return row


def delete_session(conn, token):
    conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def init_db():
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS clients (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              cpf TEXT,
              phone TEXT NOT NULL,
              email TEXT,
              birth TEXT,
              address TEXT
            );

            CREATE TABLE IF NOT EXISTS prescriptions (
              id TEXT PRIMARY KEY,
              client_id TEXT NOT NULL,
              date TEXT NOT NULL,
              doctor TEXT,
              crm TEXT,
              lens_type TEXT,
              lens_coloring TEXT,
              lens_material TEXT,
              lens_treatment TEXT,
              right_spherical TEXT,
              right_cylindrical TEXT,
              right_axis TEXT,
              left_spherical TEXT,
              left_cylindrical TEXT,
              left_axis TEXT,
              near_right_spherical TEXT,
              near_right_cylindrical TEXT,
              near_right_axis TEXT,
              near_left_spherical TEXT,
              near_left_cylindrical TEXT,
              near_left_axis TEXT,
              addition TEXT,
              dnp TEXT,
              co TEXT,
              film TEXT,
              dp TEXT,
              notes TEXT,
              FOREIGN KEY (client_id) REFERENCES clients(id)
            );

            CREATE TABLE IF NOT EXISTS stock (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              brand TEXT,
              code TEXT,
              category TEXT NOT NULL,
              material TEXT,
              color_reference TEXT,
              quantity INTEGER NOT NULL DEFAULT 0,
              minimum INTEGER NOT NULL DEFAULT 0,
              cost REAL NOT NULL DEFAULT 0,
              price REAL NOT NULL DEFAULT 0
            );

                        CREATE TABLE IF NOT EXISTS users (
                            username TEXT PRIMARY KEY,
                            password_hash TEXT NOT NULL,
                            created_at TEXT NOT NULL
                        );

                        CREATE TABLE IF NOT EXISTS sessions (
                            token TEXT PRIMARY KEY,
                            username TEXT NOT NULL,
                            expires_at TEXT NOT NULL,
                            FOREIGN KEY (username) REFERENCES users(username)
                        );

            CREATE TABLE IF NOT EXISTS lab_orders (
              id TEXT PRIMARY KEY,
              order_number TEXT NOT NULL UNIQUE,
              client_id TEXT NOT NULL,
              prescription_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              snapshot_json TEXT NOT NULL,
              FOREIGN KEY (client_id) REFERENCES clients(id),
              FOREIGN KEY (prescription_id) REFERENCES prescriptions(id)
            );
            """
        )
        ensure_columns(
            conn,
            "prescriptions",
            {
                "near_right_spherical": "TEXT",
                "near_right_cylindrical": "TEXT",
                "near_right_axis": "TEXT",
                "near_left_spherical": "TEXT",
                "near_left_cylindrical": "TEXT",
                "near_left_axis": "TEXT",
                "crm": "TEXT",
                "lens_type": "TEXT",
                "lens_coloring": "TEXT",
                "lens_material": "TEXT",
                "lens_treatment": "TEXT",
                "co": "TEXT",
                "film": "TEXT",
                "dp": "TEXT",
            },
        )

        if conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0] == 0:
            conn.executemany(
                """
                INSERT INTO clients (id, name, cpf, phone, email, birth, address)
                VALUES (:id, :name, :cpf, :phone, :email, :birth, :address)
                """,
                [
                    {
                        "id": "cli-1",
                        "name": "Mariana Souza",
                        "cpf": "123.456.789-00",
                        "phone": "(11) 98888-1122",
                        "email": "mariana@email.com",
                        "birth": "1987-04-12",
                        "address": "Rua das Flores, 120",
                    },
                    {
                        "id": "cli-2",
                        "name": "Carlos Henrique",
                        "cpf": "987.654.321-00",
                        "phone": "(11) 97777-3344",
                        "email": "carlos@email.com",
                        "birth": "1979-09-23",
                        "address": "Av. Central, 540",
                    },
                ],
            )

        if conn.execute("SELECT COUNT(*) FROM prescriptions").fetchone()[0] == 0:
            conn.executemany(
                """
                INSERT INTO prescriptions (
                  id, client_id, date, doctor, right_spherical, right_cylindrical,
                  right_axis, left_spherical, left_cylindrical, left_axis,
                  addition, dnp, notes
                )
                VALUES (
                  :id, :client_id, :date, :doctor, :right_spherical,
                  :right_cylindrical, :right_axis, :left_spherical,
                  :left_cylindrical, :left_axis, :addition, :dnp, :notes
                )
                """,
                [
                    {
                        "id": "rec-1",
                        "client_id": "cli-1",
                        "date": "2026-05-12",
                        "doctor": "Dra. Ana Ribeiro",
                        "right_spherical": "-1.25",
                        "right_cylindrical": "-0.50",
                        "right_axis": "80",
                        "left_spherical": "-1.00",
                        "left_cylindrical": "-0.75",
                        "left_axis": "95",
                        "addition": "",
                        "dnp": "31/32",
                        "notes": "Uso continuo para longe.",
                    }
                ],
            )

        if conn.execute("SELECT COUNT(*) FROM stock").fetchone()[0] == 0:
            conn.executemany(
                """
                INSERT INTO stock (
                  id, name, brand, code, category, material, color_reference,
                  quantity, minimum, cost, price
                )
                VALUES (
                  :id, :name, :brand, :code, :category, :material,
                  :color_reference, :quantity, :minimum, :cost, :price
                )
                """,
                [
                    {
                        "id": "stk-1",
                        "name": "Armacao acetato preta",
                        "brand": "Regina",
                        "code": "ARM-AC-001",
                        "category": "frames",
                        "material": "acetato",
                        "color_reference": "Preto",
                        "quantity": 8,
                        "minimum": 3,
                        "cost": 82,
                        "price": 189,
                    }
                ],
            )

        create_user(conn, "admin", "admin123")


def row_to_client(row):
    return dict(row)


def row_to_prescription(row):
    return {
        "id": row["id"],
        "clientId": row["client_id"],
        "date": row["date"],
        "doctor": row["doctor"],
        "crm": row["crm"],
        "lensType": row["lens_type"],
        "lensColoring": row["lens_coloring"],
        "lensMaterial": row["lens_material"],
        "lensTreatment": row["lens_treatment"],
        "rightSpherical": row["right_spherical"],
        "rightCylindrical": row["right_cylindrical"],
        "rightAxis": row["right_axis"],
        "leftSpherical": row["left_spherical"],
        "leftCylindrical": row["left_cylindrical"],
        "leftAxis": row["left_axis"],
        "nearRightSpherical": row["near_right_spherical"],
        "nearRightCylindrical": row["near_right_cylindrical"],
        "nearRightAxis": row["near_right_axis"],
        "nearLeftSpherical": row["near_left_spherical"],
        "nearLeftCylindrical": row["near_left_cylindrical"],
        "nearLeftAxis": row["near_left_axis"],
        "addition": row["addition"],
        "dnp": row["dnp"],
        "co": row["co"],
        "film": row["film"],
        "dp": row["dp"],
        "notes": row["notes"],
    }


def ensure_columns(conn, table, columns):
    existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
    for name, column_type in columns.items():
        if name not in existing:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {column_type}")


def row_to_stock(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "brand": row["brand"],
        "code": row["code"],
        "category": row["category"],
        "material": row["material"],
        "colorReference": row["color_reference"],
        "quantity": row["quantity"],
        "minimum": row["minimum"],
        "cost": row["cost"],
        "price": row["price"],
    }


def row_to_lab_order(row):
    return {
        "id": row["id"],
        "orderNumber": row["order_number"],
        "clientId": row["client_id"],
        "prescriptionId": row["prescription_id"],
        "createdAt": row["created_at"],
        "snapshot": json.loads(row["snapshot_json"]),
    }


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def parse_cookies(self):
        cookies = {}
        cookie_header = self.headers.get("Cookie", "")
        for part in cookie_header.split(";"):
            if "=" in part:
                name, value = part.strip().split("=", 1)
                cookies[name] = value
        return cookies

    def require_session(self):
        token = self.parse_cookies().get(SESSION_COOKIE_NAME)
        if not token:
            return False
        with connect() as conn:
            session = get_session(conn, token)
        return bool(session)

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            if not self.require_session():
                self.send_json({"error": "Unauthorized"}, status=401)
                return
            self.send_json(load_all_data())
            return
        super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_json()

        if path not in ("/api/login", "/api/logout") and not self.require_session():
            self.send_json({"error": "Unauthorized"}, status=401)
            return

        if path == "/api/login":
            username = body.get("user")
            password = body.get("password")
            with connect() as conn:
                user = get_user(conn, username)
            if user and verify_password(password, user["password_hash"]):
                with connect() as conn:
                    token = create_session(conn, username)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Set-Cookie", f"{SESSION_COOKIE_NAME}={token}; HttpOnly; Path=/; SameSite=Lax")
                self.end_headers()
                self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
                return
            self.send_json({"ok": False, "error": "Credenciais inválidas."}, status=401)
            return

        if path == "/api/logout":
            token = self.parse_cookies().get(SESSION_COOKIE_NAME)
            if token:
                with connect() as conn:
                    delete_session(conn, token)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Set-Cookie", f"{SESSION_COOKIE_NAME}=deleted; Path=/; Max-Age=0; HttpOnly; SameSite=Lax")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True}).encode("utf-8"))
            return

        if path == "/api/change-password":
            old = body.get("oldPassword") or body.get("old_password")
            new = body.get("newPassword") or body.get("new_password")
            if not old or not new:
                self.send_json({"ok": False, "error": "oldPassword e newPassword são obrigatórios."}, status=400)
                return
            if len(new) < 6:
                self.send_json({"ok": False, "error": "A nova senha deve ter pelo menos 6 caracteres."}, status=400)
                return
            token = self.parse_cookies().get(SESSION_COOKIE_NAME)
            if not token:
                self.send_json({"error": "Unauthorized"}, status=401)
                return
            with connect() as conn:
                session = get_session(conn, token)
                if not session:
                    self.send_json({"error": "Unauthorized"}, status=401)
                    return
                username = session["username"]
                user = get_user(conn, username)
                if not user or not verify_password(old, user["password_hash"]):
                    self.send_json({"ok": False, "error": "Senha atual inválida."}, status=401)
                    return
                new_hash = hash_password(new)
                conn.execute("UPDATE users SET password_hash = ? WHERE username = ?", (new_hash, username))
            self.send_json({"ok": True})
            return

        if path == "/api/clients":
            try:
                save_client(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            self.send_json({"ok": True})
            return

        if path == "/api/prescriptions":
            try:
                save_prescription(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            self.send_json({"ok": True})
            return

        if path == "/api/stock":
            try:
                save_stock(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            self.send_json({"ok": True})
            return

        if path == "/api/lab-orders":
            order = create_lab_order(body)
            self.send_json(order)
            return

        self.send_error(404, "API route not found")

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, data, status=200):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def load_all_data():
    with connect() as conn:
        clients = [row_to_client(row) for row in conn.execute("SELECT * FROM clients ORDER BY name")]
        prescriptions = [
            row_to_prescription(row)
            for row in conn.execute("SELECT * FROM prescriptions ORDER BY date DESC")
        ]
        stock = [row_to_stock(row) for row in conn.execute("SELECT * FROM stock ORDER BY name")]
        lab_orders = [
            row_to_lab_order(row)
            for row in conn.execute("SELECT * FROM lab_orders ORDER BY created_at DESC")
        ]
    return {"clients": clients, "prescriptions": prescriptions, "stock": stock, "labOrders": lab_orders}


def save_client(data):
    if not isinstance(data, dict):
        raise ValueError("Dados de cliente inválidos")
    if not data.get("id") or not data.get("name") or not data.get("phone"):
        raise ValueError("Cliente precisa de id, nome e telefone")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO clients (id, name, cpf, phone, email, birth, address)
            VALUES (:id, :name, :cpf, :phone, :email, :birth, :address)
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              cpf = excluded.cpf,
              phone = excluded.phone,
              email = excluded.email,
              birth = excluded.birth,
              address = excluded.address
            """,
            data,
        )


def save_prescription(data):
    if not isinstance(data, dict):
        raise ValueError("Dados de receita inválidos")
    if not data.get("id") or not data.get("clientId") or not data.get("date"):
        raise ValueError("Receita precisa de id, cliente e data")
    params = {
        "id": data["id"],
        "client_id": data["clientId"],
        "date": data["date"],
        "doctor": data.get("doctor", ""),
        "crm": data.get("crm", ""),
        "lens_type": data.get("lensType", ""),
        "lens_coloring": data.get("lensColoring", ""),
        "lens_material": data.get("lensMaterial", ""),
        "lens_treatment": data.get("lensTreatment", ""),
        "right_spherical": data.get("rightSpherical", ""),
        "right_cylindrical": data.get("rightCylindrical", ""),
        "right_axis": data.get("rightAxis", ""),
        "left_spherical": data.get("leftSpherical", ""),
        "left_cylindrical": data.get("leftCylindrical", ""),
        "left_axis": data.get("leftAxis", ""),
        "near_right_spherical": data.get("nearRightSpherical", ""),
        "near_right_cylindrical": data.get("nearRightCylindrical", ""),
        "near_right_axis": data.get("nearRightAxis", ""),
        "near_left_spherical": data.get("nearLeftSpherical", ""),
        "near_left_cylindrical": data.get("nearLeftCylindrical", ""),
        "near_left_axis": data.get("nearLeftAxis", ""),
        "addition": data.get("addition", ""),
        "dnp": data.get("dnp", ""),
        "co": data.get("co", ""),
        "film": data.get("film", ""),
        "dp": data.get("dp", ""),
        "notes": data.get("notes", ""),
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO prescriptions (
              id, client_id, date, doctor, crm, lens_type, lens_coloring,
              lens_material, lens_treatment, right_spherical, right_cylindrical,
              right_axis, left_spherical, left_cylindrical, left_axis,
              near_right_spherical, near_right_cylindrical, near_right_axis,
              near_left_spherical, near_left_cylindrical, near_left_axis,
              addition, dnp, co, film, dp, notes
            )
            VALUES (
              :id, :client_id, :date, :doctor, :crm, :lens_type,
              :lens_coloring, :lens_material, :lens_treatment, :right_spherical,
              :right_cylindrical, :right_axis, :left_spherical,
              :left_cylindrical, :left_axis, :near_right_spherical,
              :near_right_cylindrical, :near_right_axis, :near_left_spherical,
              :near_left_cylindrical, :near_left_axis, :addition, :dnp,
              :co, :film, :dp, :notes
            )
            """,
            params,
        )


def save_stock(data):
    if not isinstance(data, dict):
        raise ValueError("Dados de estoque inválidos")
    if not data.get("id") or not data.get("name") or not data.get("category"):
        raise ValueError("Item de estoque precisa de id, nome e categoria")
    params = {
        "id": data["id"],
        "name": data["name"],
        "brand": data.get("brand", ""),
        "code": data.get("code", ""),
        "category": data["category"],
        "material": data.get("material", ""),
        "color_reference": data.get("colorReference", ""),
        "quantity": int(data.get("quantity") or 0),
        "minimum": int(data.get("minimum") or 0),
        "cost": float(data.get("cost") or 0),
        "price": float(data.get("price") or 0),
    }
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO stock (
              id, name, brand, code, category, material, color_reference,
              quantity, minimum, cost, price
            )
            VALUES (
              :id, :name, :brand, :code, :category, :material,
              :color_reference, :quantity, :minimum, :cost, :price
            )
            ON CONFLICT(id) DO UPDATE SET
              name = excluded.name,
              brand = excluded.brand,
              code = excluded.code,
              category = excluded.category,
              material = excluded.material,
              color_reference = excluded.color_reference,
              quantity = excluded.quantity,
              minimum = excluded.minimum,
              cost = excluded.cost,
              price = excluded.price
            """,
            params,
        )


def create_lab_order(data):
    now = datetime.now()
    date_token = now.strftime("%Y%m%d")
    created_at = now.isoformat(timespec="seconds")
    prescription = data["prescription"]
    client = data["client"]
    snapshot = {
        "client": client,
        "prescription": prescription,
    }
    snapshot_json = json.dumps(snapshot, ensure_ascii=False, sort_keys=True)

    with connect() as conn:
        existing = conn.execute(
            """
            SELECT * FROM lab_orders
            WHERE prescription_id = ? AND snapshot_json = ?
            ORDER BY created_at DESC
            LIMIT 1
            """,
            (prescription["id"], snapshot_json),
        ).fetchone()
        if existing:
            return row_to_lab_order(existing)

        count = conn.execute(
            "SELECT COUNT(*) FROM lab_orders WHERE order_number LIKE ?",
            (f"OS-{date_token}-%",),
        ).fetchone()[0]
        order_number = f"OS-{date_token}-{count + 1:03d}"
        order_id = f"lab-{date_token}-{count + 1:03d}-{now.strftime('%H%M%S')}"
        conn.execute(
            """
            INSERT INTO lab_orders (
              id, order_number, client_id, prescription_id, created_at, snapshot_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                order_id,
                order_number,
                client["id"],
                prescription["id"],
                created_at,
                snapshot_json,
            ),
        )

    return {
        "id": order_id,
        "orderNumber": order_number,
        "clientId": client["id"],
        "prescriptionId": prescription["id"],
        "createdAt": created_at,
        "snapshot": snapshot,
    }


if __name__ == "__main__":
    init_db()
    server = ThreadingHTTPServer(("0.0.0.0", 8000), Handler)
    print("Serving Otica Regina on http://0.0.0.0:8000")
    server.serve_forever()
