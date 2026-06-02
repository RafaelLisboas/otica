#!/usr/bin/env python
import argparse
import json
import os
import sqlite3
import sys
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BASE_DIR.parent
DEFAULT_SQLITE_PATH = PROJECT_ROOT / "otica_regina.sqlite3"

sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django  # noqa: E402
from django.contrib.auth import get_user_model  # noqa: E402
from django.db import transaction  # noqa: E402
from django.utils import timezone  # noqa: E402


django.setup()

from accounts.models import UserProfile  # noqa: E402
from audit.models import AuditLog  # noqa: E402
from clients.models import Client  # noqa: E402
from finance.models import Installment  # noqa: E402
from lab_orders.models import LabOrder  # noqa: E402
from prescriptions.models import Prescription  # noqa: E402
from sales.models import Quote, Sale, SaleItem  # noqa: E402
from stock.models import StockItem  # noqa: E402
from stores.models import Company, Store  # noqa: E402


ROLE_MAP = {
    "admin": UserProfile.Role.OWNER,
    "operator": UserProfile.Role.OPERATOR,
    "finance": UserProfile.Role.FINANCE,
}


class MigrationReport:
    def __init__(self):
        self.counts = {
            "clientes_migrados": 0,
            "receitas_migradas": 0,
            "estoque_migrado": 0,
            "vendas_orcamentos_migrados": 0,
            "parcelas_migradas": 0,
            "usuarios_migrados": 0,
            "ordens_laboratorio_migradas": 0,
            "auditorias_migradas": 0,
        }
        self.errors = []
        self.before = {}
        self.after = {}

    def inc(self, key):
        self.counts[key] += 1

    def error(self, entity, legacy_id, message):
        self.errors.append({"entity": entity, "legacy_id": legacy_id, "message": str(message)})

    def print(self):
        payload = {
            "contagem_sqlite_antes": self.before,
            "contagem_postgres_depois": self.after,
            "resultado": self.counts,
            "erros_encontrados": self.errors,
        }
        print(json.dumps(payload, ensure_ascii=False, indent=2, default=str))


def connect_sqlite(path):
    uri = f"{path.resolve().as_uri()}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.execute("PRAGMA query_only = ON")
    conn.row_factory = sqlite3.Row
    return conn


def rows(conn, table):
    return [dict(row) for row in conn.execute(f"SELECT * FROM {table}")]


def count_sqlite(conn, tables):
    result = {}
    for table in tables:
        result[table] = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
    return result


def parse_date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def parse_datetime(value):
    if not value:
        return timezone.now()
    try:
        parsed = datetime.fromisoformat(str(value))
    except ValueError:
        return timezone.now()
    if timezone.is_naive(parsed):
        return timezone.make_aware(parsed, timezone.get_current_timezone())
    return parsed


def money(value):
    try:
        return Decimal(str(value or "0")).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return Decimal("0.00")


def legacy_note(row, extra=None):
    payload = {"legacy_data_json": dict(row)}
    if extra:
        payload["migration_notes"] = extra
    return json.dumps(payload, ensure_ascii=False, sort_keys=True)


def get_default_store(company_name, store_name):
    company, _ = Company.objects.get_or_create(
        name=company_name,
        defaults={"document": "", "phone": "", "email": "", "is_active": True},
    )
    store, _ = Store.objects.get_or_create(
        company=company,
        name=store_name,
        defaults={"document": "", "phone": "", "email": "", "address": "", "is_active": True},
    )
    return company, store


def migrate_users(sqlite_rows, store, report):
    User = get_user_model()
    for row in sqlite_rows:
        try:
            username = row["username"]
            user, created = User.objects.get_or_create(username=username)
            if created:
                user.set_unusable_password()
            user.is_active = True
            user.save()
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = ROLE_MAP.get(row.get("role") or "operator", UserProfile.Role.OPERATOR)
            profile.active_store = store
            profile.is_active = True
            profile.save()
            profile.stores.add(store)
            report.inc("usuarios_migrados")
        except Exception as exc:
            report.error("users", row.get("username"), exc)


def migrate_clients(sqlite_rows, store, report):
    mapping = {}
    for row in sqlite_rows:
        try:
            client, _ = Client.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "name": row["name"],
                    "cpf": row.get("cpf") or "",
                    "phone": row.get("phone") or "",
                    "email": row.get("email") or "",
                    "birth": parse_date(row.get("birth")),
                    "address": row.get("address") or "",
                    "notes": legacy_note(row),
                    "is_active": True,
                },
            )
            mapping[row["id"]] = client
            report.inc("clientes_migrados")
        except Exception as exc:
            report.error("clients", row.get("id"), exc)
    return mapping


def migrate_prescriptions(sqlite_rows, store, clients, report):
    mapping = {}
    for row in sqlite_rows:
        try:
            client = clients.get(row["client_id"])
            if not client:
                raise ValueError("cliente legado não encontrado")
            prescription, _ = Prescription.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "client": client,
                    "date": parse_date(row.get("date")) or timezone.now().date(),
                    "doctor": row.get("doctor") or "",
                    "crm": row.get("crm") or "",
                    "lens_type": row.get("lens_type") or "",
                    "lens_coloring": row.get("lens_coloring") or "",
                    "lens_material": row.get("lens_material") or "",
                    "lens_treatment": row.get("lens_treatment") or "",
                    "right_spherical": row.get("right_spherical") or "",
                    "right_cylindrical": row.get("right_cylindrical") or "",
                    "right_axis": row.get("right_axis") or "",
                    "left_spherical": row.get("left_spherical") or "",
                    "left_cylindrical": row.get("left_cylindrical") or "",
                    "left_axis": row.get("left_axis") or "",
                    "near_right_spherical": row.get("near_right_spherical") or "",
                    "near_right_cylindrical": row.get("near_right_cylindrical") or "",
                    "near_right_axis": row.get("near_right_axis") or "",
                    "near_left_spherical": row.get("near_left_spherical") or "",
                    "near_left_cylindrical": row.get("near_left_cylindrical") or "",
                    "near_left_axis": row.get("near_left_axis") or "",
                    "addition": row.get("addition") or "",
                    "dnp": row.get("dnp") or "",
                    "co": row.get("co") or "",
                    "film": row.get("film") or "",
                    "dp": row.get("dp") or "",
                    "notes": row.get("notes") or legacy_note(row),
                },
            )
            mapping[row["id"]] = prescription
            report.inc("receitas_migradas")
        except Exception as exc:
            report.error("prescriptions", row.get("id"), exc)
    return mapping


def migrate_stock(sqlite_rows, store, report):
    mapping = {}
    valid_categories = {choice[0] for choice in StockItem.Category.choices}
    for row in sqlite_rows:
        try:
            category = row.get("category") or StockItem.Category.OTHER
            if category not in valid_categories:
                category = StockItem.Category.OTHER
            item, _ = StockItem.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "name": row["name"],
                    "brand": row.get("brand") or "",
                    "code": row.get("code") or "",
                    "category": category,
                    "material": row.get("material") or "",
                    "color_reference": row.get("color_reference") or "",
                    "quantity": int(row.get("quantity") or 0),
                    "minimum": int(row.get("minimum") or 0),
                    "cost": money(row.get("cost")),
                    "price": money(row.get("price")),
                    "is_active": True,
                },
            )
            mapping[row["id"]] = item
            report.inc("estoque_migrado")
        except Exception as exc:
            report.error("stock", row.get("id"), exc)
    return mapping


def migrate_lab_orders(sqlite_rows, store, clients, prescriptions, report):
    mapping = {}
    for row in sqlite_rows:
        try:
            client = clients.get(row["client_id"])
            prescription = prescriptions.get(row["prescription_id"])
            if not client or not prescription:
                raise ValueError("cliente ou receita legada não encontrada")
            snapshot = json.loads(row.get("snapshot_json") or "{}")
            order, _ = LabOrder.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "order_number": row["order_number"],
                    "client": client,
                    "prescription": prescription,
                    "status": row.get("status") or LabOrder.Status.SENT,
                    "laboratory": row.get("laboratory") or "",
                    "expected_at": parse_date(row.get("expected_at")),
                    "returned_at": parse_date(row.get("returned_at")),
                    "notes": row.get("notes") or legacy_note(row),
                    "snapshot": snapshot,
                },
            )
            mapping[row["id"]] = order
            report.inc("ordens_laboratorio_migradas")
        except Exception as exc:
            report.error("lab_orders", row.get("id"), exc)
    return mapping


def migrate_quotes_and_sales(sqlite_rows, store, clients, prescriptions, lab_orders, stock_items, report):
    quote_mapping = {}
    sale_mapping = {}
    stock_by_code = {item.code.lower(): item for item in stock_items.values() if item.code}
    for row in sqlite_rows:
        try:
            client = clients.get(row["client_id"])
            if not client:
                raise ValueError("cliente legado não encontrado")
            prescription = prescriptions.get(row.get("prescription_id") or "")
            lab_order = lab_orders.get(row.get("lab_order_id") or "")
            common = {
                "client": client,
                "prescription": prescription,
                "lab_order": lab_order,
                "service_description": row.get("service_description") or "",
                "total_amount": money(row.get("total_amount")),
                "payment_method": row.get("payment_method") or "",
                "secondary_payment_method": row.get("secondary_payment_method") or "",
                "primary_payment_amount": money(row.get("primary_payment_amount")),
                "secondary_payment_amount": money(row.get("secondary_payment_amount")),
                "down_payment": money(row.get("down_payment")),
                "installments_count": int(row.get("installments") or 1),
                "notes": row.get("notes") or legacy_note(row),
            }
            if row.get("status") == "sale":
                sale, _ = Sale.objects.update_or_create(
                    store=store,
                    legacy_id=row["id"],
                    defaults={
                        **common,
                        "sale_number": row.get("sale_number") or "",
                        "workflow_status": row.get("workflow_status") or Sale.WorkflowStatus.SOLD,
                        "delivered_at": parse_date(row.get("delivered_at")),
                        "delivery_notes": row.get("delivery_notes") or "",
                    },
                )
                frame_code = (row.get("frame_code") or "").lower()
                stock_item = stock_by_code.get(frame_code)
                SaleItem.objects.update_or_create(
                    store=store,
                    sale=sale,
                    description=row.get("service_description") or "Venda migrada",
                    defaults={
                        "stock_item": stock_item,
                        "quantity": 1,
                        "unit_price": money(row.get("total_amount")),
                        "total_price": money(row.get("total_amount")),
                    },
                )
                sale_mapping[row["id"]] = sale
            else:
                quote, _ = Quote.objects.update_or_create(
                    store=store,
                    legacy_id=row["id"],
                    defaults={
                        **common,
                        "status": Quote.Status.OPEN,
                        "frame_code": row.get("frame_code") or "",
                        "lens_amount": money(row.get("lens_amount")),
                        "consultation_amount": money(row.get("consultation_amount")),
                    },
                )
                quote_mapping[row["id"]] = quote
            report.inc("vendas_orcamentos_migrados")
        except Exception as exc:
            report.error("quotes", row.get("id"), exc)
    return quote_mapping, sale_mapping


def migrate_installments(sqlite_rows, store, sales, quotes, report):
    for row in sqlite_rows:
        try:
            sale = sales.get(row["quote_id"])
            quote = quotes.get(row["quote_id"])
            if not sale and not quote:
                raise ValueError("venda ou orçamento legado não encontrado para parcela")
            Installment.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "sale": sale,
                    "quote": quote,
                    "installment_number": int(row.get("installment_number") or 1),
                    "due_date": parse_date(row.get("due_date")) or timezone.now().date(),
                    "amount": money(row.get("amount")),
                    "paid": bool(row.get("paid")),
                    "paid_at": parse_date(row.get("paid_at")),
                    "payment_method": row.get("payment_method") or "",
                    "paid_amount": money(row.get("paid_amount")),
                    "notes": legacy_note(row),
                },
            )
            report.inc("parcelas_migradas")
        except Exception as exc:
            report.error("installments", row.get("id"), exc)


def migrate_audit_logs(sqlite_rows, store, report):
    User = get_user_model()
    for row in sqlite_rows:
        try:
            user = User.objects.filter(username=row.get("username")).first()
            details = json.loads(row.get("details_json") or "{}")
            AuditLog.objects.update_or_create(
                store=store,
                legacy_id=row["id"],
                defaults={
                    "created_at": parse_datetime(row.get("created_at")),
                    "user": user,
                    "username": row.get("username") or "",
                    "action": row.get("action") or "",
                    "entity_type": row.get("entity_type") or "",
                    "entity_id": row.get("entity_id") or "",
                    "summary": row.get("summary") or "",
                    "details": details,
                },
            )
            report.inc("auditorias_migradas")
        except Exception as exc:
            report.error("audit_logs", row.get("id"), exc)


def count_postgres(store):
    return {
        "clients": Client.objects.filter(store=store).count(),
        "prescriptions": Prescription.objects.filter(store=store).count(),
        "stock": StockItem.objects.filter(store=store).count(),
        "quotes": Quote.objects.filter(store=store).count(),
        "sales": Sale.objects.filter(store=store).count(),
        "installments": Installment.objects.filter(store=store).count(),
        "users": UserProfile.objects.filter(stores=store).count(),
        "lab_orders": LabOrder.objects.filter(store=store).count(),
        "audit_logs": AuditLog.objects.filter(store=store).count(),
    }


def run(sqlite_path, company_name, store_name):
    report = MigrationReport()
    tables = [
        "clients",
        "prescriptions",
        "stock",
        "quotes",
        "installments",
        "users",
        "lab_orders",
        "audit_logs",
    ]
    with connect_sqlite(sqlite_path) as conn:
        report.before = count_sqlite(conn, tables)
        payload = {table: rows(conn, table) for table in tables}

    with transaction.atomic():
        _, store = get_default_store(company_name, store_name)
        migrate_users(payload["users"], store, report)
        clients = migrate_clients(payload["clients"], store, report)
        prescriptions = migrate_prescriptions(payload["prescriptions"], store, clients, report)
        stock_items = migrate_stock(payload["stock"], store, report)
        lab_orders = migrate_lab_orders(payload["lab_orders"], store, clients, prescriptions, report)
        quotes, sales = migrate_quotes_and_sales(
            payload["quotes"],
            store,
            clients,
            prescriptions,
            lab_orders,
            stock_items,
            report,
        )
        migrate_installments(payload["installments"], store, sales, quotes, report)
        migrate_audit_logs(payload["audit_logs"], store, report)
        report.after = count_postgres(store)

    report.print()
    return 1 if report.errors else 0


def main():
    parser = argparse.ArgumentParser(description="Migra dados do SQLite antigo para o PostgreSQL/Django.")
    parser.add_argument("--sqlite-path", default=str(DEFAULT_SQLITE_PATH), help="Caminho do banco SQLite antigo.")
    parser.add_argument("--company-name", default="Ótica Regina", help="Empresa padrão para os dados legados.")
    parser.add_argument("--store-name", default="Loja Matriz", help="Loja padrão para os dados legados.")
    args = parser.parse_args()

    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        print(f"Banco SQLite não encontrado: {sqlite_path}", file=sys.stderr)
        return 2

    return run(sqlite_path, args.company_name, args.store_name)


if __name__ == "__main__":
    raise SystemExit(main())
