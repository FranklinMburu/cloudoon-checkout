from django.contrib.auth import authenticate, get_user_model
from django.shortcuts import redirect, render
from django.urls import reverse
from django.views import View
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts import address_lookup, oauth
from accounts.serializers import LoginSerializer, RegisterSerializer, user_payload
from config.origins import is_allowed_origin

User = get_user_model()


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


class OAuthStartView(View):
    """Opened in a popup by the checkout: sends the customer to Google or GitHub."""

    def get(self, request, method: str):
        origin = request.GET.get("origin", "")
        if not is_allowed_origin(origin):
            return _popup_page(
                request, origin=None, error="This sign-in link isn’t valid. Close this window and try again."
            )
        if method not in oauth.enabled_methods():
            return _popup_page(request, origin, error="This sign-in option isn’t available right now.")
        try:
            return redirect(
                oauth.authorize_url(method, origin, _callback_url(request, method), request.GET.get("email", ""))
            )
        except oauth.OAuthError as exc:
            return _popup_page(request, origin, error=str(exc))


class OAuthCallbackView(View):
    """The provider sends the customer back here with a one-time code."""

    def get(self, request, provider: str):
        try:
            state = oauth.read_state(request.GET.get("state", ""))
        except oauth.OAuthError as exc:
            return _popup_page(request, origin=None, error=str(exc))
        if not is_allowed_origin(state["origin"]):
            return _popup_page(request, origin=None, error="This sign-in link isn’t valid.")
        if "error" in request.GET or "code" not in request.GET:
            return _popup_page(request, state["origin"], error="Sign-in was cancelled.")
        try:
            user = oauth.sign_in(state, request.GET["code"], _callback_url(request, state["method"]))
        except oauth.OAuthError as exc:
            return _popup_page(request, state["origin"], error=str(exc))
        return _popup_page(request, state["origin"], ticket=oauth.issue_ticket(user, state["method"]))


class OAuthTicketView(APIView):
    """The checkout trades the popup's single-use ticket for an API token."""

    throttle_scope = "auth"

    def post(self, request):
        try:
            user_id, method = oauth.redeem_ticket(str(request.data.get("ticket", "")))
        except oauth.OAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return session_response(User.objects.get(pk=user_id), method)


def _callback_url(request, method: str) -> str:
    provider = "google" if method == "sso" else method
    return request.build_absolute_uri(reverse("oauth-callback", args=[provider]))


def _popup_page(request, origin: str | None, *, error: str = "", ticket: str = ""):
    response = render(
        request,
        "accounts/oauth_popup.html",
        {"error": error, "result": {"origin": origin, "error": error, "ticket": ticket}},
        status=400 if error else 200,
    )
    # The popup must keep its link to the checkout window to hand back the result.
    response["Cross-Origin-Opener-Policy"] = "unsafe-none"
    return response


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
        return Response(
            {"detail": "If an account exists for that email, a reset link is on its way."},
            status=status.HTTP_202_ACCEPTED,
        )


class AddressLookupView(APIView):
    throttle_scope = "lookup"

    def get(self, request):
        try:
            results = address_lookup.search(request.query_params.get("q", ""), request.query_params.get("country", ""))
        except address_lookup.AddressLookupUnavailableError:
            return Response(
                {"detail": "Address search is unavailable right now. Type your address instead."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"results": results})
