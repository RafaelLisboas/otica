from django.contrib.auth.mixins import LoginRequiredMixin
from django.db import models
from django.views.generic import TemplateView

from clients.models import Client
from finance.models import Installment
from lab_orders.models import LabOrder
from sales.models import Quote, Sale
from stock.models import StockItem


class StoreContextMixin:
    def get_active_store(self):
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return None
        return profile.active_store or profile.stores.first()

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["active_store"] = self.get_active_store()
        return context


class DashboardView(LoginRequiredMixin, StoreContextMixin, TemplateView):
    template_name = "dashboard.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        store = context["active_store"]
        if not store:
            context.update(
                {
                    "client_count": 0,
                    "quote_count": 0,
                    "sale_count": 0,
                    "open_installments": 0,
                    "low_stock_count": 0,
                    "lab_order_count": 0,
                    "recent_clients": [],
                }
            )
            return context

        context.update(
            {
                "client_count": Client.objects.filter(store=store, is_active=True).count(),
                "quote_count": Quote.objects.filter(store=store).count(),
                "sale_count": Sale.objects.filter(store=store).count(),
                "open_installments": Installment.objects.filter(store=store, paid=False).count(),
                "low_stock_count": StockItem.objects.filter(store=store, quantity__lte=models.F("minimum")).count(),
                "lab_order_count": LabOrder.objects.filter(store=store).count(),
                "recent_clients": Client.objects.filter(store=store, is_active=True).order_by("-created_at")[:5],
            }
        )
        return context


class ModulePlaceholderView(LoginRequiredMixin, StoreContextMixin, TemplateView):
    template_name = "module_placeholder.html"
    module_name = ""

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["module_name"] = self.module_name
        return context
