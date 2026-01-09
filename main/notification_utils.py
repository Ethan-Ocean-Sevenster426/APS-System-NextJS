"""
Utility functions for creating and managing notifications
"""
from .models import Notification
from django.contrib.auth.models import User


def notify_super_admins(title, message, notification_type='info', priority='medium', action_url=None):
    """
    Send notification to all super admins

    Args:
        title (str): Notification title
        message (str): Notification message
        notification_type (str): Type of notification (error, warning, info, success, sync, system)
        priority (str): Priority level (low, medium, high, critical)
        action_url (str, optional): URL to navigate when notification is clicked

    Returns:
        list: Created notification objects
    """
    return Notification.notify_super_admins(
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        action_url=action_url
    )


def notify_user(user, title, message, notification_type='info', priority='medium', action_url=None):
    """
    Send notification to a specific user

    Args:
        user: User object or user ID
        title (str): Notification title
        message (str): Notification message
        notification_type (str): Type of notification (error, warning, info, success, sync, system)
        priority (str): Priority level (low, medium, high, critical)
        action_url (str, optional): URL to navigate when notification is clicked

    Returns:
        Notification: Created notification object
    """
    if isinstance(user, int):
        user = User.objects.get(id=user)

    return Notification.create_notification(
        title=title,
        message=message,
        notification_type=notification_type,
        priority=priority,
        user=user,
        action_url=action_url
    )


def notify_sync_error(error_message, sync_type='general'):
    """
    Create notification for sync errors

    Args:
        error_message (str): Error message
        sync_type (str): Type of sync (e.g., 'SQL Server', 'OneDrive', 'Google Sheets')

    Returns:
        list: Created notification objects
    """
    return notify_super_admins(
        title=f"{sync_type} Sync Error",
        message=f"An error occurred during {sync_type} synchronization: {error_message}",
        notification_type='error',
        priority='high'
    )


def notify_sync_success(sync_type='general', records_synced=0):
    """
    Create notification for successful sync

    Args:
        sync_type (str): Type of sync
        records_synced (int): Number of records synced

    Returns:
        list: Created notification objects
    """
    return notify_super_admins(
        title=f"{sync_type} Sync Complete",
        message=f"Successfully synced {records_synced} records from {sync_type}.",
        notification_type='success',
        priority='low'
    )


def notify_system_issue(issue_title, issue_description, priority='medium'):
    """
    Create notification for system issues

    Args:
        issue_title (str): Issue title
        issue_description (str): Issue description
        priority (str): Priority level

    Returns:
        list: Created notification objects
    """
    return notify_super_admins(
        title=issue_title,
        message=issue_description,
        notification_type='system',
        priority=priority
    )


def notify_database_error(error_message):
    """
    Create notification for database errors

    Args:
        error_message (str): Error message

    Returns:
        list: Created notification objects
    """
    return notify_super_admins(
        title="Database Error",
        message=f"A database error occurred: {error_message}",
        notification_type='error',
        priority='critical'
    )


def notify_service_status(service_name, status, message=None):
    """
    Create notification for service status changes

    Args:
        service_name (str): Name of the service
        status (str): Status (e.g., 'started', 'stopped', 'error')
        message (str, optional): Additional message

    Returns:
        list: Created notification objects
    """
    notification_types = {
        'started': 'success',
        'stopped': 'warning',
        'error': 'error',
        'running': 'info'
    }

    priorities = {
        'started': 'low',
        'stopped': 'medium',
        'error': 'high',
        'running': 'low'
    }

    notification_type = notification_types.get(status.lower(), 'info')
    priority = priorities.get(status.lower(), 'medium')

    title = f"{service_name} {status.capitalize()}"
    full_message = message if message else f"The {service_name} service is now {status}."

    return notify_super_admins(
        title=title,
        message=full_message,
        notification_type=notification_type,
        priority=priority
    )


# ============================================================================
# BUSINESS-CRITICAL NOTIFICATIONS FOR CEO/ADMINISTRATORS
# ============================================================================

def notify_data_sync_failure(sync_source, hours_since_last_sync, affected_records=None):
    """
    Notify when critical data sync fails - affects business operations

    Args:
        sync_source (str): Source system (e.g., 'Google Sheets', 'SQL Server', 'OneDrive')
        hours_since_last_sync (int): Hours since last successful sync
        affected_records (str, optional): What data is affected (e.g., 'Client Data', 'Inspection Records')

    Returns:
        list: Created notification objects

    Example:
        notify_data_sync_failure('Google Sheets', 6, 'Client Allocation Data')
    """
    affected = f" {affected_records}" if affected_records else ""

    return notify_super_admins(
        title=f"🔄 {sync_source} Sync Stopped",
        message=f"Data sync from {sync_source} has failed.{affected} not updated for {hours_since_last_sync} hours. Business operations may be affected.",
        notification_type='warning',
        priority='critical',
        action_url='/settings/'
    )


def notify_fee_rate_changed(changed_by, old_rate, new_rate, fee_type='Inspection Hour Rate', effective_date=None):
    """
    Notify when fee rates are changed on export sheet - affects invoicing

    Args:
        changed_by (str): Username who made the change
        old_rate (float): Previous rate
        new_rate (float): New rate
        fee_type (str): Type of fee (e.g., 'Inspection Hour Rate', 'Testing Fee Rate')
        effective_date (str, optional): When the new rate takes effect

    Returns:
        list: Created notification objects

    Example:
        notify_fee_rate_changed('john_doe', 750.00, 850.00, 'Inspection Hour Rate', '2026-01-01')
    """
    effective_msg = f" Effective from {effective_date}." if effective_date else " Effective immediately."
    percentage_change = ((new_rate - old_rate) / old_rate * 100)
    direction = "increased" if new_rate > old_rate else "decreased"

    return notify_super_admins(
        title=f"💵 Fee Rate Updated",
        message=f"{fee_type} {direction} from R{old_rate:.2f} to R{new_rate:.2f} ({abs(percentage_change):.1f}% change).{effective_msg} Changed by {changed_by}.",
        notification_type='info',
        priority='medium',
        action_url='/export_sheet/'
    )


def notify_new_user_added(username, role, added_by):
    """
    Notify when new user is added to the system

    Args:
        username (str): New user's username
        role (str): User role (e.g., 'inspector', 'admin')
        added_by (str): Username who added the user

    Returns:
        list: Created notification objects

    Example:
        notify_new_user_added('jane_smith', 'inspector', 'admin_user')
    """
    return notify_super_admins(
        title=f"👤 New User Added",
        message=f"New user '{username}' added with role '{role}' by {added_by}.",
        notification_type='info',
        priority='low',
        action_url='/user_management/'
    )


def notify_new_client_added(client_name, account_code, commodity_type, added_by):
    """
    Notify when new client is added to the system

    Args:
        client_name (str): Client name
        account_code (str): Internal account code
        commodity_type (str): Type of commodity (e.g., 'RAW', 'EGGS', 'PMP')
        added_by (str): Username who added the client

    Returns:
        list: Created notification objects

    Example:
        notify_new_client_added('ABC Butchery', 'ABC001', 'RAW', 'admin_user')
    """
    return notify_super_admins(
        title=f"🏢 New Client Added",
        message=f"New client '{client_name}' (Code: {account_code}) added for {commodity_type} inspections by {added_by}.",
        notification_type='info',
        priority='low',
        action_url='/client_allocation/'
    )


def notify_monthly_inspection_summary(current_month, current_count, previous_month, previous_count, percentage_change):
    """
    Notify monthly inspection volume comparison - business performance metric

    Args:
        current_month (str): Current month name (e.g., 'December 2025')
        current_count (int): Number of inspections this month
        previous_month (str): Previous month name (e.g., 'November 2025')
        previous_count (int): Number of inspections last month
        percentage_change (float): Percentage increase/decrease

    Returns:
        list: Created notification objects

    Example:
        notify_monthly_inspection_summary('December 2025', 892, 'November 2025', 756, 18.0)
    """
    direction = "more" if percentage_change > 0 else "fewer"
    emoji = "📈" if percentage_change > 0 else "📉"

    notification_type = 'success' if percentage_change > 0 else 'warning'
    priority = 'low' if abs(percentage_change) < 20 else 'medium'

    return notify_super_admins(
        title=f"{emoji} Monthly Inspection Summary",
        message=f"{current_month}: {current_count} inspections completed - {abs(percentage_change):.1f}% {direction} than {previous_month} ({previous_count} inspections). {'Strong performance! 🎯' if percentage_change > 10 else 'Monitor trends closely.' if percentage_change < -10 else ''}",
        notification_type=notification_type,
        priority=priority,
        action_url='/analytics_dashboard/'
    )


# ============================================================================
# EXAMPLE USAGE - THE 4 NOTIFICATIONS FOR CEO/ADMINISTRATORS
# ============================================================================
"""
# 1. Data sync failure affecting operations
from main.notification_utils import notify_data_sync_failure
notify_data_sync_failure('Google Sheets', 6, 'Client Allocation Data')

# 2. Fee rate changed on export sheet
from main.notification_utils import notify_fee_rate_changed
notify_fee_rate_changed('admin_user', 750.00, 850.00, 'Inspection Hour Rate', '2026-01-01')

# 3. New user added
from main.notification_utils import notify_new_user_added
notify_new_user_added('jane_smith', 'inspector', 'admin_user')

# 4. New client added
from main.notification_utils import notify_new_client_added
notify_new_client_added('ABC Butchery', 'ABC001', 'RAW', 'admin_user')

# 5. Monthly inspection volume comparison
from main.notification_utils import notify_monthly_inspection_summary
notify_monthly_inspection_summary('December 2025', 892, 'November 2025', 756, 18.0)
# Shows: "📈 Monthly Inspection Summary - December 2025: 892 inspections
#         completed - 18.0% more than November 2025 (756 inspections).
#         Strong performance! 🎯"
"""
