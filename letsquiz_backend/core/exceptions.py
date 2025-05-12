from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    # Handle AuthenticationFailed exceptions
    if isinstance(exc, AuthenticationFailed):
        custom_response_data = {
            'detail': exc.detail,
            'code': exc.code
        }
        response = Response(custom_response_data, status=exc.status_code)
    
    # Handle ValidationErrors
    elif isinstance(exc, ValidationError) and response is not None:
        custom_response_data = {
            'error': {
                'status': status.HTTP_422_UNPROCESSABLE_ENTITY,
                'message': 'Validation failed',
                'details': response.data
            }
        }
        response.data = custom_response_data
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

    return response