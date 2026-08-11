from unittest.mock import patch

from django.test import Client, TestCase
from django.test.utils import override_settings
from django.contrib.auth.models import User


class ForgotPasswordTests(TestCase):
    def test_forgot_password_accepts_post_without_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post('/forgot-password/', {'email': 'someone@example.com'})

        self.assertEqual(response.status_code, 302)

    @override_settings(SITE_URL='https://portal.example.com')
    @patch('django.core.mail.send_mail')
    def test_forgot_password_uses_frontend_site_url_for_reset_link(self, mock_send_mail):
        User.objects.create_user(
            username='developer-user',
            email='ethansevenster5@gmail.com',
            password='test-password-123',
        )

        response = self.client.post('/forgot-password/', {'email': 'ethansevenster5@gmail.com'})

        self.assertEqual(response.status_code, 302)
        self.assertTrue(mock_send_mail.called)

        html_message = mock_send_mail.call_args.kwargs['html_message']
        self.assertIn('https://portal.example.com/reset-password/', html_message)
        self.assertNotIn('http://testserver/reset-password/', html_message)
