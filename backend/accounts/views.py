from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts import address_lookup
from accounts.serializers import LoginSerializer, OAuthSerializer, RegisterSerializer, user_payload

User = get_user_model()
PROVIDERS = {"google", "github", "sso"}


def session_response(user, provider: str, code=status.HTTP_200_OK, **extra) -> Response:
    token, _ = Token.objects.get_or_create(user=user)
    return Response({"token": token.key, "user": user_payload(user, provider), **extra}, status=code)


class RegisterView(APIView):
    throttle_scope = "auth"

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return session_response(serializer.save(), "signup", status.HTTP_201_CREATED)


class LoginView(APIView):
    throttle_scope = "auth"

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = authenticate(request, username=email, password=serializer.validated_data["password"])
        if user is None:
            # Same message whether the email exists or not: no account enumeration.
            return Response(
                {"detail": "That email and password don’t match. Check them and try again, or reset your password."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return session_response(user, "password")


class OAuthView(APIView):
    """SIMULATED OAuth callback.

    Real flow: the browser is redirected to the provider, which redirects back with a
    one-time `code`; this endpoint exchanges it server-side (client secret never leaves
    the server), reads the verified email, then signs the user in exactly as below.
    """

    throttle_scope = "auth"

    def post(self, request, provider: str):
        if provider not in PROVIDERS:
            return Response({"detail": "Unknown sign-in provider."}, status=status.HTTP_404_NOT_FOUND)
        serializer = OAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data.get("email")
        if provider == "sso" and not email:
            return Response({"detail": "Enter your work email.", "field": "email"}, status=status.HTTP_400_BAD_REQUEST)
        email = (email or settings.DEMO_USER_EMAIL).lower()
        user, created = User.objects.get_or_create(username=email, defaults={"email": email})
        if created:
            user.set_unusable_password()
            user.save()
        return session_response(user, provider, simulated=True)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"user": user_payload(request.user, "password")})


class PasswordResetView(APIView):
    """Always 202, whether or not the email exists, so it can't be used to discover accounts."""

    throttle_scope = "auth"

    def post(self, request):
        return Response({"detail": "If an account exists for that email, a reset link is on its way."}, status=status.HTTP_202_ACCEPTED)


class AddressLookupView(APIView):
    throttle_scope = "lookup"

    def get(self, request):
        return Response({"results": address_lookup.search(request.query_params.get("q", "")), "simulated": True})
