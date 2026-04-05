from flask import request, session, current_app
from .extensions import socketio
from .models import db, User, ChatMessage
from .services import llm_service

@socketio.on('connect')
def test_connect():
    if 'user_id' not in session:
        return False # Reject connection

@socketio.on('chat_message')
def handle_message(data):
    if not db.available:
        socketio.emit('chat_error', {'error': 'Database connect is unavailable.'}, to=request.sid)
        return

    user_id = session.get('user_id')
    if not user_id:
        return
        
    user = User.get_by_id(user_id)
    if not user:
        return

    user_message = data.get('message', '').strip()
    if not user_message:
        return
    
    # Get chat history
    chat_history = [
        {'role': msg.role, 'content': msg.content}
        for msg in ChatMessage.list_for_user(user.id, limit=15, ascending=False)
    ]
    chat_history.append({'role': 'user', 'content': user_message})

    # Save user message
    ChatMessage.create(user_id=user.id, role='user', content=user_message)

    socketio.emit('chat_status', {'status': 'typing'}, to=request.sid)

    profile_summary = user.get_profile_summary()
    
    for msg in llm_service.chat_stream(user_message, profile_summary, chat_history):
        if not msg.get('success'):
            socketio.emit('chat_error', {'error': msg.get('error')}, to=request.sid)
            break
        
        if msg.get('is_final'):
            ChatMessage.create(user_id=user.id, role='assistant', content=msg.get('response'))
            socketio.emit('chat_status', {'status': 'done'}, to=request.sid)
        else:
            socketio.emit('chat_token', {'token': msg.get('chunk')}, to=request.sid)
            socketio.sleep(0)
