from django.contrib.auth.mixins import LoginRequiredMixin
from django.views.generic import ListView

from .models import Client


class ClientListView(LoginRequiredMixin, ListView):
    model = Client
    template_name = "clients/list.html"
    context_object_name = "clients"
    paginate_by = 30

    def get_active_store(self):
        profile = getattr(self.request.user, "profile", None)
        if not profile:
            return None
        return profile.active_store or profile.stores.first()

    def get_queryset(self):
        store = self.get_active_store()
        if not store:
            return Client.objects.none()
        queryset = Client.objects.filter(store=store, is_active=True).order_by("name")
        search = self.request.GET.get("q", "").strip()
        if search:
            queryset = queryset.filter(name__icontains=search)
        return queryset

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        context["active_store"] = self.get_active_store()
        context["search"] = self.request.GET.get("q", "").strip()
        return context
