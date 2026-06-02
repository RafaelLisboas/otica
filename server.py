from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from datetime import datetime, timedelta
import base64
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import shutil
import sqlite3
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "otica_regina.sqlite3"
BACKUP_DIR = ROOT / "backups"
PUBLIC_FILES = {"index.html", "styles.css", "api.js", "app.js", "favicon.ico"}
PUBLIC_ASSETS_DIR = ROOT / "assets"
PASSWORD_HASH_ALGORITHM = "sha256"
PASSWORD_HASH_ITERATIONS = 120000
SESSION_TIMEOUT_SECONDS = 2 * 60 * 60
SESSION_COOKIE_NAME = "otica_regina_session"
SERVER_HOST = os.environ.get("OTICA_HOST", "0.0.0.0")
SERVER_PORT = int(os.environ.get("OTICA_PORT", "8000"))
COOKIE_SECURE = os.environ.get("OTICA_COOKIE_SECURE", "").lower() in {"1", "true", "yes"}
AUTO_BACKUP = os.environ.get("OTICA_AUTO_BACKUP", "1").lower() not in {"0", "false", "no"}


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
        "INSERT OR IGNORE INTO users (username, password_hash, role, created_at) VALUES (?, ?, ?, ?)",
        (username, password_hash, "admin", datetime.now().isoformat(timespec="seconds")),
    )


def get_user(conn, username):
    return conn.execute(
        "SELECT username, password_hash, role FROM users WHERE username = ?",
        (username,),
    ).fetchone()


def row_to_user(row):
    return {
        "username": row["username"],
        "role": row["role"],
        "createdAt": row["created_at"],
    }


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

            CREATE TABLE IF NOT EXISTS quotes (
              id TEXT PRIMARY KEY,
              client_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              status TEXT NOT NULL,
              sale_number TEXT,
              workflow_status TEXT NOT NULL DEFAULT 'sold',
              delivered_at TEXT,
              delivery_notes TEXT,
              prescription_id TEXT,
              lab_order_id TEXT,
              service_description TEXT,
              frame_code TEXT,
              lens_amount REAL NOT NULL DEFAULT 0,
              consultation_amount REAL NOT NULL DEFAULT 0,
              consultation_status TEXT NOT NULL DEFAULT 'exempt',
              total_amount REAL NOT NULL DEFAULT 0,
              payment_method TEXT NOT NULL,
              secondary_payment_method TEXT,
              primary_payment_amount REAL NOT NULL DEFAULT 0,
              secondary_payment_amount REAL NOT NULL DEFAULT 0,
              down_payment REAL NOT NULL DEFAULT 0,
              installments INTEGER NOT NULL DEFAULT 1,
              stock_deducted INTEGER NOT NULL DEFAULT 0,
              notes TEXT,
              FOREIGN KEY (client_id) REFERENCES clients(id),
              FOREIGN KEY (prescription_id) REFERENCES prescriptions(id),
              FOREIGN KEY (lab_order_id) REFERENCES lab_orders(id)
            );

            CREATE TABLE IF NOT EXISTS installments (
              id TEXT PRIMARY KEY,
              quote_id TEXT NOT NULL,
              installment_number INTEGER NOT NULL,
              due_date TEXT NOT NULL,
              amount REAL NOT NULL,
              paid INTEGER NOT NULL DEFAULT 0,
              paid_at TEXT,
              payment_method TEXT,
              paid_amount REAL NOT NULL DEFAULT 0,
              FOREIGN KEY (quote_id) REFERENCES quotes(id)
            );

                        CREATE TABLE IF NOT EXISTS users (
                            username TEXT PRIMARY KEY,
                            password_hash TEXT NOT NULL,
                            role TEXT NOT NULL DEFAULT 'admin',
                            created_at TEXT NOT NULL
                        );

            CREATE TABLE IF NOT EXISTS sessions (
                token TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (username) REFERENCES users(username)
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
              id TEXT PRIMARY KEY,
              created_at TEXT NOT NULL,
              username TEXT,
              action TEXT NOT NULL,
              entity_type TEXT NOT NULL,
              entity_id TEXT,
              summary TEXT NOT NULL,
              details_json TEXT
            );

            CREATE TABLE IF NOT EXISTS lab_orders (
              id TEXT PRIMARY KEY,
              order_number TEXT NOT NULL UNIQUE,
              client_id TEXT NOT NULL,
              prescription_id TEXT NOT NULL,
              created_at TEXT NOT NULL,
              status TEXT NOT NULL DEFAULT 'sent',
              laboratory TEXT,
              expected_at TEXT,
              returned_at TEXT,
              notes TEXT,
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
        ensure_columns(
            conn,
            "quotes",
            {
                "frame_code": "TEXT",
                "lens_amount": "REAL NOT NULL DEFAULT 0",
                "consultation_amount": "REAL NOT NULL DEFAULT 0",
                "consultation_status": "TEXT NOT NULL DEFAULT 'exempt'",
                "prescription_id": "TEXT",
                "lab_order_id": "TEXT",
                "secondary_payment_method": "TEXT",
                "primary_payment_amount": "REAL NOT NULL DEFAULT 0",
                "secondary_payment_amount": "REAL NOT NULL DEFAULT 0",
                "stock_deducted": "INTEGER NOT NULL DEFAULT 0",
                "sale_number": "TEXT",
                "workflow_status": "TEXT NOT NULL DEFAULT 'sold'",
                "delivered_at": "TEXT",
                "delivery_notes": "TEXT",
            },
        )
        ensure_columns(
            conn,
            "users",
            {
                "role": "TEXT NOT NULL DEFAULT 'admin'",
            },
        )
        ensure_columns(
            conn,
            "lab_orders",
            {
                "status": "TEXT NOT NULL DEFAULT 'sent'",
                "laboratory": "TEXT",
                "expected_at": "TEXT",
                "returned_at": "TEXT",
                "notes": "TEXT",
            },
        )
        ensure_columns(
            conn,
            "installments",
            {
                "paid_at": "TEXT",
                "payment_method": "TEXT",
                "paid_amount": "REAL NOT NULL DEFAULT 0",
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
        "status": row["status"],
        "laboratory": row["laboratory"],
        "expectedAt": row["expected_at"],
        "returnedAt": row["returned_at"],
        "notes": row["notes"],
        "snapshot": json.loads(row["snapshot_json"]),
    }


def row_to_quote(row):
    return {
        "id": row["id"],
        "clientId": row["client_id"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "status": row["status"],
        "saleNumber": row["sale_number"],
        "workflowStatus": row["workflow_status"],
        "deliveredAt": row["delivered_at"],
        "deliveryNotes": row["delivery_notes"],
        "prescriptionId": row["prescription_id"],
        "labOrderId": row["lab_order_id"],
        "serviceDescription": row["service_description"],
        "frameCode": row["frame_code"],
        "lensAmount": row["lens_amount"],
        "consultationAmount": row["consultation_amount"],
        "consultationStatus": row["consultation_status"],
        "totalAmount": row["total_amount"],
        "paymentMethod": row["payment_method"],
        "secondaryPaymentMethod": row["secondary_payment_method"],
        "primaryPaymentAmount": row["primary_payment_amount"],
        "secondaryPaymentAmount": row["secondary_payment_amount"],
        "downPayment": row["down_payment"],
        "installments": row["installments"],
        "stockDeducted": bool(row["stock_deducted"]),
        "notes": row["notes"],
    }


def row_to_installment(row):
    return {
        "id": row["id"],
        "quoteId": row["quote_id"],
        "installmentNumber": row["installment_number"],
        "dueDate": row["due_date"],
        "amount": row["amount"],
        "paid": bool(row["paid"]),
        "paidAt": row["paid_at"],
        "paymentMethod": row["payment_method"],
        "paidAmount": row["paid_amount"],
    }


def row_to_audit_log(row):
    details = {}
    if row["details_json"]:
        try:
            details = json.loads(row["details_json"])
        except json.JSONDecodeError:
            details = {}
    return {
        "id": row["id"],
        "createdAt": row["created_at"],
        "username": row["username"],
        "action": row["action"],
        "entityType": row["entity_type"],
        "entityId": row["entity_id"],
        "summary": row["summary"],
        "details": details,
    }


def write_audit(username, action, entity_type, entity_id, summary, details=None):
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO audit_logs (
              id, created_at, username, action, entity_type, entity_id, summary, details_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                f"aud-{datetime.now().strftime('%Y%m%d%H%M%S%f')}",
                datetime.now().isoformat(timespec="seconds"),
                username or "sistema",
                action,
                entity_type,
                entity_id,
                summary,
                json.dumps(details or {}, ensure_ascii=False),
            ),
        )


def next_sale_number(conn):
    year = datetime.now().year
    prefix = f"VEN-{year}-"
    row = conn.execute(
        "SELECT sale_number FROM quotes WHERE sale_number LIKE ? ORDER BY sale_number DESC LIMIT 1",
        (f"{prefix}%",),
    ).fetchone()
    next_number = 1
    if row and row["sale_number"]:
        try:
            next_number = int(row["sale_number"].split("-")[-1]) + 1
        except (ValueError, IndexError):
            next_number = 1
    return f"{prefix}{next_number:04d}"


def save_quote(data):
    if not isinstance(data, dict):
        raise ValueError("Dados de orçamento inválidos")
    if not data.get("id") or not data.get("clientId"):
        raise ValueError("Orçamento precisa de id e cliente")
    total_amount = float(data.get("totalAmount") or 0)
    if total_amount <= 0:
        raise ValueError("Valor total deve ser maior que zero")
    payment_method = data.get("paymentMethod") or "dinheiro"
    secondary_payment_method = data.get("secondaryPaymentMethod") or ""
    primary_payment_amount = float(data.get("primaryPaymentAmount") or 0)
    secondary_payment_amount = float(data.get("secondaryPaymentAmount") or 0)
    installments = int(data.get("installments") or 1)
    down_payment = float(data.get("downPayment") or 0)
    lens_amount = float(data.get("lensAmount") or 0)
    consultation_amount = float(data.get("consultationAmount") or 0)
    consultation_status = data.get("consultationStatus") or "exempt"
    frame_code = data.get("frameCode", "").strip()
    prescription_id = (data.get("prescriptionId") or "").strip()
    lab_order_id = (data.get("labOrderId") or "").strip()
    if consultation_status not in ("with_purchase", "without_purchase", "exempt"):
        raise ValueError("Regra de consulta inválida")
    if down_payment < 0 or down_payment > total_amount:
        raise ValueError("Entrada inválida")
    if primary_payment_amount < 0 or secondary_payment_amount < 0:
        raise ValueError("Valores de pagamento inválidos")
    if secondary_payment_method and round(primary_payment_amount + secondary_payment_amount, 2) != round(total_amount, 2):
        raise ValueError("A soma das formas de pagamento precisa bater com o total")
    if (payment_method == "carne" or secondary_payment_method == "carne") and installments < 1:
        raise ValueError("Número de parcelas inválido")

    now = datetime.now().isoformat(timespec="seconds")
    with connect() as conn:
        client = conn.execute("SELECT id FROM clients WHERE id = ?", (data["clientId"],)).fetchone()
        if not client:
            raise ValueError("Cliente não encontrado")
        if prescription_id:
            prescription = conn.execute(
                "SELECT id, client_id FROM prescriptions WHERE id = ?",
                (prescription_id,),
            ).fetchone()
            if not prescription:
                raise ValueError("Receita vinculada não encontrada")
            if prescription["client_id"] != data["clientId"]:
                raise ValueError("Receita vinculada não pertence ao cliente selecionado")
        if lab_order_id:
            lab_order = conn.execute(
                "SELECT id, client_id, prescription_id FROM lab_orders WHERE id = ?",
                (lab_order_id,),
            ).fetchone()
            if not lab_order:
                raise ValueError("O.S. vinculada não encontrada")
            if lab_order["client_id"] != data["clientId"]:
                raise ValueError("O.S. vinculada não pertence ao cliente selecionado")
            if prescription_id and lab_order["prescription_id"] != prescription_id:
                raise ValueError("O.S. vinculada não pertence à receita selecionada")
            if not prescription_id:
                prescription_id = lab_order["prescription_id"]
        existing = conn.execute("SELECT created_at, stock_deducted, sale_number FROM quotes WHERE id = ?", (data["id"],)).fetchone()
        if frame_code:
            stock_item = conn.execute("SELECT id, quantity FROM stock WHERE code = ? COLLATE NOCASE", (frame_code,)).fetchone()
            if not stock_item:
                raise ValueError("Código da armação não encontrado no estoque")
            if (not existing or not existing["stock_deducted"]) and int(stock_item["quantity"] or 0) <= 0:
                raise ValueError("Armação sem quantidade disponível no estoque")
        created_at = existing["created_at"] if existing else now
        status = data.get("status", "quote")
        sale_number = existing["sale_number"] if existing else ""
        if status == "sale" and not sale_number:
            sale_number = next_sale_number(conn)
        workflow_status = data.get("workflowStatus") or ("sold" if status == "sale" else "")
        conn.execute(
            """
            INSERT INTO quotes (
              id, client_id, created_at, updated_at, status, sale_number,
              workflow_status, delivered_at, delivery_notes,
              prescription_id, lab_order_id, service_description,
              frame_code, lens_amount, consultation_amount,
              consultation_status, total_amount, payment_method,
              secondary_payment_method, primary_payment_amount,
              secondary_payment_amount, down_payment, installments, notes
            ) VALUES (
              :id, :client_id, :created_at, :updated_at, :status, :sale_number,
              :workflow_status, :delivered_at, :delivery_notes,
              :prescription_id, :lab_order_id, :service_description,
              :frame_code, :lens_amount,
              :consultation_amount, :consultation_status, :total_amount,
              :payment_method, :secondary_payment_method,
              :primary_payment_amount, :secondary_payment_amount,
              :down_payment, :installments, :notes
            )
            ON CONFLICT(id) DO UPDATE SET
              client_id = excluded.client_id,
              updated_at = excluded.updated_at,
              status = excluded.status,
              sale_number = excluded.sale_number,
              workflow_status = excluded.workflow_status,
              delivered_at = excluded.delivered_at,
              delivery_notes = excluded.delivery_notes,
              prescription_id = excluded.prescription_id,
              lab_order_id = excluded.lab_order_id,
              service_description = excluded.service_description,
              frame_code = excluded.frame_code,
              lens_amount = excluded.lens_amount,
              consultation_amount = excluded.consultation_amount,
              consultation_status = excluded.consultation_status,
              total_amount = excluded.total_amount,
              payment_method = excluded.payment_method,
              secondary_payment_method = excluded.secondary_payment_method,
              primary_payment_amount = excluded.primary_payment_amount,
              secondary_payment_amount = excluded.secondary_payment_amount,
              down_payment = excluded.down_payment,
              installments = excluded.installments,
              notes = excluded.notes
            """,
            {
                "id": data["id"],
                "client_id": data["clientId"],
                "created_at": created_at,
                "updated_at": now,
                "status": status,
                "sale_number": sale_number,
                "workflow_status": workflow_status,
                "delivered_at": data.get("deliveredAt") or "",
                "delivery_notes": data.get("deliveryNotes") or "",
                "prescription_id": prescription_id,
                "lab_order_id": lab_order_id,
                "service_description": data.get("serviceDescription", ""),
                "frame_code": frame_code,
                "lens_amount": lens_amount,
                "consultation_amount": consultation_amount,
                "consultation_status": consultation_status,
                "total_amount": total_amount,
                "payment_method": payment_method,
                "secondary_payment_method": secondary_payment_method,
                "primary_payment_amount": primary_payment_amount,
                "secondary_payment_amount": secondary_payment_amount,
                "down_payment": down_payment,
                "installments": installments,
                "notes": data.get("notes", ""),
            },
        )
        if payment_method == "carne" or secondary_payment_method == "carne":
            carne_total = secondary_payment_amount if secondary_payment_method == "carne" else primary_payment_amount
            if carne_total <= 0:
                carne_total = total_amount
            generate_installments(conn, data["id"], carne_total, down_payment, installments)
        else:
            conn.execute("DELETE FROM installments WHERE quote_id = ?", (data["id"],))
        if status == "sale":
            quote = conn.execute("SELECT * FROM quotes WHERE id = ?", (data["id"],)).fetchone()
            deduct_stock_for_quote(conn, quote)


def generate_installments(conn, quote_id, total_amount, down_payment, installments):
    conn.execute("DELETE FROM installments WHERE quote_id = ?", (quote_id,))
    remaining = round(max(total_amount - down_payment, 0), 2)
    count = max(int(installments), 1)
    if count == 0:
        return
    installment_amount = round(remaining / count, 2)
    values = [installment_amount] * count
    difference = round(remaining - sum(values), 2)
    values[-1] += difference

    for number, amount in enumerate(values, start=1):
        due_date = (datetime.now().date() + timedelta(days=30 * (number - 1))).isoformat()
        conn.execute(
            "INSERT INTO installments (id, quote_id, installment_number, due_date, amount, paid) VALUES (?, ?, ?, ?, ?, ?)",
            (f"ins-{quote_id}-{number}", quote_id, number, due_date, amount, 0),
        )


def convert_quote(data):
    if not isinstance(data, dict):
        raise ValueError("Dados inválidos para conversão")
    quote_id = data.get("id") or data.get("quoteId")
    if not quote_id:
        raise ValueError("ID do orçamento é obrigatório")

    now = datetime.now().isoformat(timespec="seconds")
    with connect() as conn:
        quote = conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()
        if not quote:
            raise ValueError("Orçamento não encontrado")
        if quote["status"] != "quote":
            raise ValueError("Orçamento já convertido")
        deduct_stock_for_quote(conn, quote)

        conn.execute(
            "UPDATE quotes SET status = ?, workflow_status = COALESCE(NULLIF(workflow_status, ''), 'sold'), sale_number = COALESCE(NULLIF(sale_number, ''), ?), updated_at = ? WHERE id = ?",
            ("sale", next_sale_number(conn), now, quote_id),
        )
        if quote["payment_method"] == "carne" or quote["secondary_payment_method"] == "carne":
            carne_total = float(quote["secondary_payment_amount"] or 0) if quote["secondary_payment_method"] == "carne" else float(quote["primary_payment_amount"] or 0)
            if carne_total <= 0:
                carne_total = float(quote["total_amount"] or 0)
            generate_installments(
                conn,
                quote_id,
                carne_total,
                float(quote["down_payment"] or 0),
                int(quote["installments"] or 1),
            )

    return row_to_quote(conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone())


def update_quote_workflow(data):
    quote_id = data.get("id") or data.get("quoteId")
    workflow_status = data.get("workflowStatus") or data.get("status")
    allowed = {"sold", "lab", "ready", "delivered"}
    if not quote_id or workflow_status not in allowed:
        raise ValueError("Status de venda inválido")
    now = datetime.now().isoformat(timespec="seconds")
    delivered_at = data.get("deliveredAt") or (datetime.now().date().isoformat() if workflow_status == "delivered" else "")
    with connect() as conn:
        quote = conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone()
        if not quote:
            raise ValueError("Venda não encontrada")
        conn.execute(
            """
            UPDATE quotes
            SET workflow_status = ?, delivered_at = COALESCE(NULLIF(?, ''), delivered_at),
                delivery_notes = COALESCE(?, delivery_notes), updated_at = ?
            WHERE id = ?
            """,
            (workflow_status, delivered_at, data.get("deliveryNotes"), now, quote_id),
        )
        return row_to_quote(conn.execute("SELECT * FROM quotes WHERE id = ?", (quote_id,)).fetchone())


def update_lab_order_status(data):
    order_id = data.get("id") or data.get("labOrderId")
    status = data.get("status")
    allowed = {"sent", "lab", "ready", "returned", "delivered"}
    if not order_id or status not in allowed:
        raise ValueError("Status de O.S. inválido")
    returned_at = data.get("returnedAt") or (datetime.now().date().isoformat() if status in {"ready", "returned", "delivered"} else "")
    with connect() as conn:
        order = conn.execute("SELECT * FROM lab_orders WHERE id = ?", (order_id,)).fetchone()
        if not order:
            raise ValueError("O.S. não encontrada")
        conn.execute(
            """
            UPDATE lab_orders
            SET status = ?, laboratory = COALESCE(?, laboratory),
                expected_at = COALESCE(?, expected_at),
                returned_at = COALESCE(NULLIF(?, ''), returned_at),
                notes = COALESCE(?, notes)
            WHERE id = ?
            """,
            (status, data.get("laboratory"), data.get("expectedAt"), returned_at, data.get("notes"), order_id),
        )
        return row_to_lab_order(conn.execute("SELECT * FROM lab_orders WHERE id = ?", (order_id,)).fetchone())


def deduct_stock_for_quote(conn, quote):
    if quote["stock_deducted"] or not quote["frame_code"]:
        return
    stock_item = conn.execute(
        "SELECT id, quantity FROM stock WHERE code = ? COLLATE NOCASE",
        (quote["frame_code"],),
    ).fetchone()
    if not stock_item:
        raise ValueError("Código da armação não encontrado no estoque")
    if int(stock_item["quantity"] or 0) <= 0:
        raise ValueError("Armação sem quantidade disponível no estoque")
    conn.execute(
        "UPDATE stock SET quantity = quantity - 1 WHERE id = ?",
        (stock_item["id"],),
    )
    conn.execute("UPDATE quotes SET stock_deducted = 1 WHERE id = ?", (quote["id"],))


def pay_installment(data):
    if not isinstance(data, dict):
        raise ValueError("Dados de pagamento inválidos")
    installment_id = data.get("id") or data.get("installmentId")
    if not installment_id:
        raise ValueError("Parcela obrigatória")
    payment_method = data.get("paymentMethod") or "dinheiro"
    paid_at = data.get("paidAt") or datetime.now().date().isoformat()
    with connect() as conn:
        installment = conn.execute("SELECT * FROM installments WHERE id = ?", (installment_id,)).fetchone()
        if not installment:
            raise ValueError("Parcela não encontrada")
        paid_amount = float(data.get("paidAmount") or installment["amount"] or 0)
        if paid_amount <= 0:
            raise ValueError("Valor pago inválido")
        conn.execute(
            """
            UPDATE installments
            SET paid = 1, paid_at = ?, payment_method = ?, paid_amount = ?
            WHERE id = ?
            """,
            (paid_at, payment_method, paid_amount, installment_id),
        )


def reopen_installment(data):
    installment_id = data.get("id") or data.get("installmentId")
    if not installment_id:
        raise ValueError("Parcela obrigatória")
    with connect() as conn:
        conn.execute(
            "UPDATE installments SET paid = 0, paid_at = NULL, payment_method = NULL, paid_amount = 0 WHERE id = ?",
            (installment_id,),
        )


def create_backup():
    BACKUP_DIR.mkdir(exist_ok=True)
    filename = f"otica_regina_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sqlite3"
    destination = BACKUP_DIR / filename
    shutil.copy2(DB_PATH, destination)
    return {"ok": True, "file": str(destination)}


def save_user(data):
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    role = data.get("role") or "operator"
    if not username or len(password) < 6:
        raise ValueError("Usuário e senha com pelo menos 6 caracteres são obrigatórios")
    if role not in ("admin", "operator", "finance"):
        raise ValueError("Permissão inválida")
    with connect() as conn:
        conn.execute(
            """
            INSERT INTO users (username, password_hash, role, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(username) DO UPDATE SET
              password_hash = excluded.password_hash,
              role = excluded.role
            """,
            (username, hash_password(password), role, datetime.now().isoformat(timespec="seconds")),
        )


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        super().end_headers()

    def log_message(self, format, *args):
        safe_args = tuple(
            arg.replace("\n", "\\n").replace("\r", "\\r") if isinstance(arg, str) else arg
            for arg in args
        )
        super().log_message(format, *safe_args)

    def parse_cookies(self):
        cookies = {}
        cookie_header = self.headers.get("Cookie", "")
        for part in cookie_header.split(";"):
            if "=" in part:
                name, value = part.strip().split("=", 1)
                cookies[name] = value
        return cookies

    def require_session(self):
        return bool(self.current_username())

    def current_username(self):
        token = self.parse_cookies().get(SESSION_COOKIE_NAME)
        if not token:
            return ""
        with connect() as conn:
            session = get_session(conn, token)
        return session["username"] if session else ""

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/data":
            if not self.require_session():
                self.send_json({"error": "Unauthorized"}, status=401)
                return
            self.send_json(load_all_data())
            return
        self.serve_static(path)

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            body = self.read_json()
        except ValueError as error:
            self.send_json({"ok": False, "error": str(error)}, status=400)
            return

        if path not in ("/api/login", "/api/logout") and not self.require_session():
            self.send_json({"error": "Unauthorized"}, status=401)
            return
        username = self.current_username()

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
                self.send_header("Set-Cookie", self.session_cookie(token))
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
            self.send_header("Set-Cookie", self.session_cookie("deleted", max_age=0))
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
            write_audit(username, "update", "user", username, "Senha alterada")
            self.send_json({"ok": True})
            return

        if path == "/api/clients":
            try:
                save_client(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "save", "client", body.get("id"), f"Cliente salvo: {body.get('name', '')}")
            self.send_json({"ok": True})
            return

        if path == "/api/prescriptions":
            try:
                save_prescription(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "save", "prescription", body.get("id"), "Receita salva", {"clientId": body.get("clientId")})
            self.send_json({"ok": True})
            return

        if path == "/api/quotes":
            try:
                save_quote(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            status = body.get("status", "quote")
            write_audit(
                username,
                "close_sale" if status == "sale" else "save_quote",
                "quote",
                body.get("id"),
                "Venda fechada" if status == "sale" else "Orçamento salvo",
                {"clientId": body.get("clientId"), "totalAmount": body.get("totalAmount")},
            )
            self.send_json({"ok": True})
            return

        if path == "/api/quotes/convert":
            try:
                quote = convert_quote(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "convert_quote", "quote", body.get("id") or body.get("quoteId"), "Orçamento convertido em venda")
            self.send_json({"ok": True, "quote": quote})
            return

        if path == "/api/quotes/status":
            try:
                quote = update_quote_workflow(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "update_status", "quote", quote.get("id"), f"Status da venda alterado: {quote.get('workflowStatus')}")
            self.send_json({"ok": True, "quote": quote})
            return

        if path == "/api/lab-orders/status":
            try:
                order = update_lab_order_status(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "update_status", "lab_order", order.get("id"), f"Status da O.S. alterado: {order.get('orderNumber')}")
            self.send_json({"ok": True, "order": order})
            return

        if path == "/api/installments/pay":
            try:
                pay_installment(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "pay_installment", "installment", body.get("id") or body.get("installmentId"), "Parcela baixada")
            self.send_json({"ok": True})
            return

        if path == "/api/installments/reopen":
            try:
                reopen_installment(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "reopen_installment", "installment", body.get("id") or body.get("installmentId"), "Parcela reaberta")
            self.send_json({"ok": True})
            return

        if path == "/api/backup":
            result = create_backup()
            write_audit(username, "backup", "system", "", "Backup criado", result)
            self.send_json(result)
            return

        if path == "/api/users":
            try:
                save_user(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "save", "user", body.get("username"), f"Usuário salvo: {body.get('username')}")
            self.send_json({"ok": True})
            return

        if path == "/api/stock":
            try:
                save_stock(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "save", "stock", body.get("id"), f"Item de estoque salvo: {body.get('name', '')}")
            self.send_json({"ok": True})
            return

        if path == "/api/lab-orders":
            try:
                order = create_lab_order(body)
            except ValueError as error:
                self.send_json({"ok": False, "error": str(error)}, status=400)
                return
            write_audit(username, "create", "lab_order", order.get("id"), f"O.S. criada: {order.get('orderNumber', '')}")
            self.send_json(order)
            return

        self.send_error(404, "API route not found")

    def serve_static(self, path):
        if any(part.startswith(".") for part in Path(path).parts):
            self.send_error(404, "File not found")
            return

        if path in ("", "/"):
            file_path = ROOT / "index.html"
        elif path.startswith("/assets/"):
            file_path = (ROOT / path.lstrip("/")).resolve()
            try:
                file_path.relative_to(PUBLIC_ASSETS_DIR)
            except ValueError:
                self.send_error(404, "File not found")
                return
        else:
            requested_name = path.lstrip("/")
            if requested_name not in PUBLIC_FILES:
                self.send_error(404, "File not found")
                return
            file_path = (ROOT / requested_name).resolve()

        if not file_path.is_file():
            self.send_error(404, "File not found")
            return

        content_type = mimetypes.guess_type(file_path.name)[0] or "application/octet-stream"
        payload = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def read_json(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode("utf-8"))
        except json.JSONDecodeError as error:
            raise ValueError("JSON inválido.") from error

    def send_json(self, data, status=200):
        payload = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def session_cookie(self, value, max_age=None):
        parts = [
            f"{SESSION_COOKIE_NAME}={value}",
            "HttpOnly",
            "Path=/",
            "SameSite=Lax",
        ]
        if COOKIE_SECURE:
            parts.append("Secure")
        if max_age is not None:
            parts.append(f"Max-Age={max_age}")
        return "; ".join(parts)


def load_all_data():
    with connect() as conn:
        users = [row_to_user(row) for row in conn.execute("SELECT username, role, created_at FROM users ORDER BY username")]
        clients = [row_to_client(row) for row in conn.execute("SELECT * FROM clients ORDER BY name")]
        prescriptions = [
            row_to_prescription(row)
            for row in conn.execute("SELECT * FROM prescriptions ORDER BY date DESC")
        ]
        stock = [row_to_stock(row) for row in conn.execute("SELECT * FROM stock ORDER BY name")]
        quotes = [
            row_to_quote(row)
            for row in conn.execute("SELECT * FROM quotes ORDER BY created_at DESC")
        ]
        installments = [
            row_to_installment(row)
            for row in conn.execute("SELECT * FROM installments ORDER BY quote_id, installment_number")
        ]
        audit_logs = [
            row_to_audit_log(row)
            for row in conn.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 120")
        ]
        lab_orders = [
            row_to_lab_order(row)
            for row in conn.execute("SELECT * FROM lab_orders ORDER BY created_at DESC")
        ]
    return {
        "clients": clients,
        "users": users,
        "prescriptions": prescriptions,
        "stock": stock,
        "quotes": quotes,
        "installments": installments,
        "auditLogs": audit_logs,
        "labOrders": lab_orders,
    }


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
    if not isinstance(data, dict):
        raise ValueError("Dados inválidos para ordem de serviço")
    prescription = data.get("prescription")
    client = data.get("client")
    if not isinstance(prescription, dict) or not isinstance(client, dict):
        raise ValueError("Cliente e receita são obrigatórios")
    if not prescription.get("id") or not client.get("id"):
        raise ValueError("Cliente e receita precisam de id")

    now = datetime.now()
    date_token = now.strftime("%Y%m%d")
    created_at = now.isoformat(timespec="seconds")
    snapshot = {
        "client": client,
        "prescription": prescription,
    }
    snapshot_json = json.dumps(snapshot, ensure_ascii=False, sort_keys=True)
    laboratory = prescription.get("laboratory") or data.get("laboratory", "")
    expected_at = data.get("expectedAt", "")
    notes = data.get("notes", "")

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
              id, order_number, client_id, prescription_id, created_at,
              status, laboratory, expected_at, returned_at, notes, snapshot_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                order_id,
                order_number,
                client["id"],
                prescription["id"],
                created_at,
                "sent",
                laboratory,
                expected_at,
                "",
                notes,
                snapshot_json,
            ),
        )

    return {
        "id": order_id,
        "orderNumber": order_number,
        "clientId": client["id"],
        "prescriptionId": prescription["id"],
        "createdAt": created_at,
        "status": "sent",
        "laboratory": laboratory,
        "expectedAt": expected_at,
        "returnedAt": "",
        "notes": notes,
        "snapshot": snapshot,
    }


def create_auto_backup():
    if not AUTO_BACKUP or not DB_PATH.exists():
        return None
    BACKUP_DIR.mkdir(exist_ok=True)
    filename = f"auto_{datetime.now().strftime('%Y%m%d')}.sqlite3"
    destination = BACKUP_DIR / filename
    if not destination.exists():
        shutil.copy2(DB_PATH, destination)
    return destination


if __name__ == "__main__":
    init_db()
    create_auto_backup()
    server = ThreadingHTTPServer((SERVER_HOST, SERVER_PORT), Handler)
    print(f"Serving Otica Regina on http://{SERVER_HOST}:{SERVER_PORT}")
    server.serve_forever()
