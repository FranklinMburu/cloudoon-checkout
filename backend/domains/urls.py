from django.urls import path

from domains.views import DomainCheckView

urlpatterns = [path("domains/check/", DomainCheckView.as_view(), name="domain-check")]
