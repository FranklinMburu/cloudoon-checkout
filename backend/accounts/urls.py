from django.urls import path

from accounts import views

urlpatterns = [
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", views.LoginView.as_view(), name="login"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/password-reset/", views.PasswordResetView.as_view(), name="password-reset"),
    path("auth/oauth/ticket/", views.OAuthTicketView.as_view(), name="oauth-ticket"),
    path("auth/oauth/<str:method>/start/", views.OAuthStartView.as_view(), name="oauth-start"),
    path("auth/oauth/<str:provider>/callback/", views.OAuthCallbackView.as_view(), name="oauth-callback"),
    path("addresses/", views.AddressLookupView.as_view(), name="addresses"),
]
