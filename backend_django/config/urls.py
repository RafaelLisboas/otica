from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

from clients.views import ClientListView
from reports.views import DashboardView, ModulePlaceholderView


urlpatterns = [
    path("", DashboardView.as_view(), name="dashboard"),
    path("login/", LoginView.as_view(template_name="registration/login.html"), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("clientes/", ClientListView.as_view(), name="clients"),
    path("receitas/", ModulePlaceholderView.as_view(module_name="Receitas"), name="prescriptions"),
    path("estoque/", ModulePlaceholderView.as_view(module_name="Estoque"), name="stock"),
    path("vendas/", ModulePlaceholderView.as_view(module_name="Vendas"), name="sales"),
    path("financeiro/", ModulePlaceholderView.as_view(module_name="Financeiro"), name="finance"),
    path("laboratorio/", ModulePlaceholderView.as_view(module_name="Ordens de laboratório"), name="lab_orders"),
    path("configuracoes/", ModulePlaceholderView.as_view(module_name="Configurações"), name="settings"),
    path("admin/", admin.site.urls),
]
