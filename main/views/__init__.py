# Core views
from .core_views import (
    # Authentication views
    user_login,
    register,
    user_logout,
    
    # Home view
    home,
    
    # Client management views
    client_list,
    add_client,
    edit_client,
    delete_client,
    
    # Inspection management views
    inspection_list,
    add_inspection,
    edit_inspection,
    delete_inspection,
    
    # Shipment management views
    shipment_list,
    edit_shipment,
    delete_shipment,
    delete_inspection,
    upload_document,
    delete_inspection_file,
    list_uploaded_files,
    list_client_folder_files,
    update_test_result,
    update_needs_retest,
    update_km_traveled,
    update_group_km_traveled,
    update_hours,
    update_group_hours,
    update_group_additional_email,
    update_group_comment,
    update_lab,
    update_product_name,
    update_product_class,
    analytics_dashboard,
    export_analytics,
    
    # Google Sheets integration views
    client_allocation,
    client_allocation_sheet,
    sync_client_allocations,
    refresh_clients,
    refresh_inspections,
    google_oauth_callback,
    
    # User management views
    user_management,
    
    # System logs views
    system_logs,
    
    # Inspector mapping views
    inspector_mapping_list,
    add_inspector_mapping,
    edit_inspector_mapping,
    delete_inspector_mapping,
    
    # Dashboard views
    dashboard,
    inspector_dashboard,
    analytics_dashboard,
    
    # Home view
    home,
    
    # Helper functions
    clear_messages,
    apply_filters,
)

# Data views
from .data_views import (
    export_shipments,
    remote_sqlserver_data_view,
)

# All available views
__all__ = [
    # Authentication views
    'user_login',
    'register',
    'user_logout',
    
    # Client management views
    'client_list',
    'add_client',
    'edit_client',
    'delete_client',
    
    # Inspection management views
    'inspection_list',
    'add_inspection',
    'edit_inspection',
    'delete_inspection',
    
    # Shipment management views
    'shipment_list',
    'edit_shipment',
    'delete_shipment',
    'delete_inspection',
    'upload_document',
    'delete_inspection_file',
    'list_uploaded_files',
    'list_client_folder_files',
    'update_test_result',
    'update_needs_retest',
    'update_km_traveled',
    'update_group_km_traveled',
    'update_hours',
    'update_group_hours',
    'update_group_additional_email',
    'update_group_comment',
    'update_lab',
    'update_product_name',
    'update_product_class',
    'analytics_dashboard',
    'export_analytics',
    
    # Google Sheets integration views
    'client_allocation',
    'client_allocation_sheet',
    'sync_client_allocations',
    'refresh_clients',
    'refresh_inspections',
    'google_oauth_callback',
    
    # User management views
    'user_management',
    
    # System logs views
    'system_logs',
    
    # Inspector mapping views
    'inspector_mapping_list',
    'add_inspector_mapping',
    'edit_inspector_mapping',
    'delete_inspector_mapping',
    
    # Dashboard views
    'dashboard',
    'inspector_dashboard',
    'analytics_dashboard',
    
    # Home view
    'home',
    
    # Helper functions
    'clear_messages',
    'apply_filters',
    
    # Data views
    'export_shipments',
    'remote_sqlserver_data_view',
]