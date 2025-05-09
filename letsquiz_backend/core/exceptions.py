from rest_framework.views import exception_handler
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Check if the exception is a ValidationError and the response exists
    if isinstance(exc, ValidationError) and response is not None:
        custom_response_data = {
            'error': {
                'status': status.HTTP_422_UNPROCESSABLE_ENTITY,
                'message': 'Validation failed',
                'details': response.data # DRF's default validation errors
            }
        }
        response.data = custom_response_data
        response.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY

    return response