class GuestSessionMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Get guest session ID from header
        guest_session_id = request.headers.get('X-Guest-Session-ID')
        
        # Add guest_session_id to request object if present
        if guest_session_id:
            request.guest_session_id = guest_session_id
        else:
            request.guest_session_id = None

        response = self.get_response(request)
        return response