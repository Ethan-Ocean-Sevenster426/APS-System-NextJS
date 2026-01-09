"""
Microsoft Graph API Email Backend for Django
Sends emails using Microsoft Graph API instead of SMTP
"""
import logging
import json
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
import requests

logger = logging.getLogger(__name__)


class GraphEmailBackend(BaseEmailBackend):
    """
    Email backend that uses Microsoft Graph API to send emails.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.client_id = getattr(settings, 'GRAPH_CLIENT_ID', None)
        self.client_secret = getattr(settings, 'GRAPH_CLIENT_SECRET', None)
        self.tenant_id = getattr(settings, 'GRAPH_TENANT_ID', None)
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'info@eclick.co.za')
        self.access_token = None

    def get_access_token(self):
        """
        Obtain an access token from Microsoft Identity Platform using client credentials flow.
        """
        if not all([self.client_id, self.client_secret, self.tenant_id]):
            logger.error("Microsoft Graph API credentials are not properly configured.")
            return None

        token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"

        token_data = {
            'grant_type': 'client_credentials',
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'scope': 'https://graph.microsoft.com/.default'
        }

        try:
            response = requests.post(token_url, data=token_data, timeout=30)
            response.raise_for_status()
            token_response = response.json()
            self.access_token = token_response.get('access_token')
            logger.info("Successfully obtained Microsoft Graph API access token")
            return self.access_token
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to obtain access token: {str(e)}")
            if not self.fail_silently:
                raise
            return None

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of sent messages.
        """
        if not email_messages:
            return 0

        # Get access token
        if not self.access_token:
            self.get_access_token()

        if not self.access_token:
            logger.error("Cannot send emails without access token")
            return 0

        num_sent = 0
        for message in email_messages:
            try:
                if self._send_message(message):
                    num_sent += 1
            except Exception as e:
                logger.error(f"Failed to send email: {str(e)}")
                if not self.fail_silently:
                    raise

        return num_sent

    def _send_message(self, message):
        """
        Send a single EmailMessage using Microsoft Graph API.
        """
        # Check if there's an HTML alternative (for emails with both text and HTML versions)
        content_type = "Text"
        content = message.body

        if hasattr(message, 'alternatives') and message.alternatives:
            # Use HTML version if available
            for alternative_content, alternative_type in message.alternatives:
                if alternative_type == 'text/html':
                    content_type = "HTML"
                    content = alternative_content
                    break
        elif message.content_subtype == 'html':
            content_type = "HTML"

        # Build the email payload
        email_data = {
            "message": {
                "subject": message.subject,
                "body": {
                    "contentType": content_type,
                    "content": content
                },
                "toRecipients": [
                    {"emailAddress": {"address": recipient}} for recipient in message.to
                ],
                "from": {
                    "emailAddress": {
                        "address": self.from_email
                    }
                }
            },
            "saveToSentItems": "true"
        }

        # Add CC recipients if any
        if message.cc:
            email_data["message"]["ccRecipients"] = [
                {"emailAddress": {"address": recipient}} for recipient in message.cc
            ]

        # Add BCC recipients if any
        if message.bcc:
            email_data["message"]["bccRecipients"] = [
                {"emailAddress": {"address": recipient}} for recipient in message.bcc
            ]

        # Send email using Graph API
        graph_url = f"https://graph.microsoft.com/v1.0/users/{self.from_email}/sendMail"

        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }

        try:
            response = requests.post(graph_url, headers=headers, json=email_data, timeout=30)
            response.raise_for_status()

            logger.info(f"Successfully sent email to {', '.join(message.to)}")
            logger.info(f"Subject: {message.subject}")
            return True

        except requests.exceptions.HTTPError as e:
            logger.error(f"HTTP Error sending email: {e.response.status_code} - {e.response.text}")
            if not self.fail_silently:
                raise
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"Request Error sending email: {str(e)}")
            if not self.fail_silently:
                raise
            return False
