from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for, flash, current_app
from .models import db, User, ChatMessage
from .services import llm_service
from datetime import datetime
from functools import wraps
import math
from pymongo.errors import PyMongoError

main_bp = Blueprint('main', __name__)


def get_current_user():
    """Return the currently logged in user, if any."""
    return User.get_by_id(session.get('user_id'))


def calculate_daily_targets(user):
    """Generate lightweight daily guidance from the user's profile."""
    if not user or not user.age or not user.height_cm or not user.weight_kg or not user.gender:
        return None

    if user.gender == 'male':
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age + 5
    else:
        bmr = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age - 161

    activity_multiplier = {
        'sedentary': 1.2,
        'light': 1.375,
        'moderate': 1.55,
        'active': 1.725,
        'very_active': 1.9,
    }.get(user.activity_level, 1.2)

    maintenance_calories = round(bmr * activity_multiplier)
    calorie_target = maintenance_calories
    if user.goal_type == 'weight_loss':
        calorie_target -= 400
    elif user.goal_type == 'muscle_gain':
        calorie_target += 250

    protein_multiplier = {
        'weight_loss': 1.8,
        'muscle_gain': 2.0,
        'maintain': 1.6,
        'improve_health': 1.5,
    }.get(user.goal_type, 1.6)

    return {
        'maintenance_calories': maintenance_calories,
        'calorie_target': max(calorie_target, 1200),
        'protein_grams': round(user.weight_kg * protein_multiplier),
        'water_liters': round(max(2.0, user.weight_kg * 0.033), 1),
        'steps_goal': 10000 if user.goal_type == 'weight_loss' else 8000,
    }


def database_unavailable_response():
    """Return a user-friendly response when the database is offline."""
    message = 'Database connection is unavailable. Please try again after MongoDB is running.'
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'error': message}), 503
    flash(message, 'error')
    return redirect(url_for('main.index'))


# ===== Authentication Decorator =====
def login_required(f):
    """Decorator to require login for routes."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('main.login'))
        db.ensure_connection()
        if not db.available:
            return database_unavailable_response()
        user = get_current_user()
        if not user:
            session.clear()
            flash('Your session has expired. Please log in again.', 'warning')
            return redirect(url_for('main.login'))
        return f(*args, **kwargs)
    return decorated_function


# ===== Auth Routes =====
@main_bp.route('/register', methods=['GET', 'POST'])
def register():
    """User registration."""
    if 'user_id' in session:
        return redirect(url_for('main.chat_interface'))
    
    if request.method == 'POST':
        if not db.available:
            return database_unavailable_response()
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        errors = []
        if not name or len(name) < 2:
            errors.append('Name must be at least 2 characters.')
        if not email or '@' not in email:
            errors.append('Please enter a valid email address.')
        if not password or len(password) < 6:
            errors.append('Password must be at least 6 characters.')
        if password != confirm_password:
            errors.append('Passwords do not match.')
        
        # Check if email exists
        existing_user = User.find_by_email(email)
        if existing_user:
            errors.append('This email is already registered. Please login instead.')
        
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('register.html', name=name, email=email)
        
        # Create new user
        try:
            User.create(name=name, email=email, password=password)
        except ValueError as exc:
            flash(str(exc), 'error')
            return render_template('register.html', name=name, email=email)
        
        flash('Account created successfully! Please log in.', 'success')
        return redirect(url_for('main.login'))
    
    return render_template('register.html')


@main_bp.route('/login', methods=['GET', 'POST'])
def login():
    """User login."""
    if 'user_id' in session:
        return redirect(url_for('main.chat_interface'))
    
    if request.method == 'POST':
        if not db.available:
            return database_unavailable_response()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        
        # Find user
        user = User.find_by_email(email)
        
        if user and user.check_password(password):
            # Login successful
            session['user_id'] = user.id
            session['user_name'] = user.name
            session.permanent = bool(request.form.get('remember'))
            user.last_login = datetime.utcnow()
            user.save()
            
            flash(f'Welcome back, {user.name.split()[0]}! 👋', 'success')
            
            # Redirect to profile setup if incomplete, else chat
            if not user.age or not user.goal_type:
                return redirect(url_for('main.profile_setup'))
            return redirect(url_for('main.chat_interface'))
        else:
            flash('Invalid email or password. Please try again.', 'error')
        
        return render_template('login.html', email=email)
    
    return render_template('login.html')


@main_bp.route('/logout')
def logout():
    """User logout."""
    session.clear()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('main.index'))


# ===== Main Routes =====
@main_bp.route('/')
def index():
    """Landing page."""
    return render_template('index.html')


@main_bp.route('/api/health')
def health_check():
    """Health and dependency status for local/devops checks."""
    status_code = 200 if db.available else 503
    return jsonify({
        'success': db.available,
        'app': 'ok',
        'database': 'ok' if db.available else 'unavailable',
        'database_error': None if db.available else db.last_error,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
    }), status_code


@main_bp.route('/profile-setup', methods=['GET', 'POST'])
@login_required
def profile_setup():
    """Complete health profile setup."""
    user = get_current_user()
    
    if request.method == 'POST':
        errors = validate_profile_form(request.form)
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('profile_setup.html', user=user)

        user.age = request.form.get('age', type=int)
        user.gender = request.form.get('gender')
        user.height_cm = request.form.get('height', type=float)
        user.weight_kg = request.form.get('weight', type=float)
        user.goal_type = request.form.get('goal_type')
        user.target_weight = request.form.get('target_weight', type=float)
        user.activity_level = request.form.get('activity_level')
        user.dietary_preferences = request.form.get('dietary_preferences')
        user.allergies = request.form.get('allergies')
        user.medical_conditions = request.form.get('medical_conditions')
        
        user.save()
        
        flash('Profile completed! Let\'s start your journey. 🎉', 'success')
        return redirect(url_for('main.chat_interface'))
    
    return render_template('profile_setup.html', user=user)


@main_bp.route('/chat')
@login_required
def chat_interface():
    """Chat interface page."""
    user = get_current_user()
    
    # Check if profile is complete
    if not user.age or not user.goal_type:
        return redirect(url_for('main.profile_setup'))
    
    # Get chat history (last 50 messages)
    messages = ChatMessage.list_for_user(user.id, limit=50, ascending=True)
    
    return render_template('chat.html', user=user, messages=messages, targets=calculate_daily_targets(user))


@main_bp.route('/api/chat', methods=['POST'])
@login_required
def api_chat():
    """API endpoint for chat messages."""
    try:
        if not db.available:
            return jsonify({
                'success': False,
                'error': 'Database connection is unavailable. Please try again after MongoDB is running.'
            }), 503

        data = request.get_json(silent=True) or {}
        user_message = data.get('message', '').strip()

        if not user_message:
            return jsonify({'success': False, 'error': 'Empty message'}), 400

        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404

        # Save user message
        ChatMessage.create(
            user_id=user.id,
            role='user',
            content=user_message
        )

        # Get chat history for context
        chat_history = [
            {'role': msg.role, 'content': msg.content}
            for msg in ChatMessage.list_for_user(user.id, limit=15, ascending=True)
        ]

        # Get AI response
        profile_summary = user.get_profile_summary()
        result = llm_service.chat(user_message, profile_summary, chat_history)

        if result['success']:
            # Save AI response
            ChatMessage.create(
                user_id=user.id,
                role='assistant',
                content=result['response']
            )

            return jsonify({
                'success': True,
                'response': result['response']
            })

        return jsonify({
            'success': False,
            'error': result['error'] or 'AI service unavailable'
        }), 502
    except PyMongoError:
        current_app.logger.exception('MongoDB error while processing chat request')
        return jsonify({
            'success': False,
            'error': 'Database connection is unavailable. Please try again after MongoDB is running.'
        }), 503
    except Exception:
        current_app.logger.exception('Unexpected error while processing chat request')
        return jsonify({
            'success': False,
            'error': 'Something went wrong while processing your message. Please try again.'
        }), 500


@main_bp.route('/api/user', methods=['GET'])
@login_required
def get_user():
    """Get current user data."""
    user = get_current_user()
    return jsonify({
        'success': True,
        'data': {
            **user.to_dict(),
            'daily_targets': calculate_daily_targets(user),
        }
    })


@main_bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """View and edit user profile."""
    user = get_current_user()
    
    if request.method == 'POST':
        errors = validate_profile_form(request.form, require_name=True)
        if errors:
            for error in errors:
                flash(error, 'error')
            return render_template('profile.html', user=user)

        user.name = request.form.get('name', '').strip()
        user.age = request.form.get('age', type=int)
        user.gender = request.form.get('gender')
        user.height_cm = request.form.get('height', type=float)
        user.weight_kg = request.form.get('weight', type=float)
        user.goal_type = request.form.get('goal_type')
        user.target_weight = request.form.get('target_weight', type=float)
        user.activity_level = request.form.get('activity_level')
        user.dietary_preferences = request.form.get('dietary_preferences')
        user.allergies = request.form.get('allergies')
        user.medical_conditions = request.form.get('medical_conditions')
        
        user.save()
        
        flash('Profile updated successfully! ✓', 'success')
        return redirect(url_for('main.profile'))
    
    return render_template('profile.html', user=user, targets=calculate_daily_targets(user))


@main_bp.route('/api/chat-history', methods=['DELETE'])
@login_required
def clear_chat_history():
    """Clear user's chat history."""
    try:
        if not db.available:
            return jsonify({
                'success': False,
                'error': 'Database connection is unavailable. Please try again after MongoDB is running.'
            }), 503
        ChatMessage.delete_for_user(session['user_id'])
        return jsonify({'success': True, 'message': 'Chat history cleared'})
    except PyMongoError:
        current_app.logger.exception('MongoDB error while clearing chat history')
        return jsonify({
            'success': False,
            'error': 'Database connection is unavailable. Please try again after MongoDB is running.'
        }), 503
    except Exception:
        current_app.logger.exception('Unexpected error while clearing chat history')
        return jsonify({
            'success': False,
            'error': 'Failed to clear chat history. Please try again.'
        }), 500


def validate_profile_form(form, require_name=False):
    """Basic server-side validation for profile data."""
    errors = []
    name = form.get('name', '').strip()
    age = form.get('age', type=int)
    height = form.get('height', type=float)
    weight = form.get('weight', type=float)
    gender = form.get('gender', '')
    goal_type = form.get('goal_type', '')
    activity_level = form.get('activity_level', '')
    target_weight = form.get('target_weight', type=float)

    if require_name and len(name) < 2:
        errors.append('Name must be at least 2 characters.')
    if age is None or not (1 <= age <= 120):
        errors.append('Age must be between 1 and 120.')
    if height is None or not (50 <= height <= 250):
        errors.append('Height must be between 50 and 250 cm.')
    if weight is None or not (20 <= weight <= 300):
        errors.append('Weight must be between 20 and 300 kg.')
    if gender not in {'male', 'female', 'other'}:
        errors.append('Please select a valid gender.')
    if goal_type not in {'weight_loss', 'muscle_gain', 'maintain', 'improve_health'}:
        errors.append('Please select a valid goal.')
    if activity_level not in {'sedentary', 'light', 'moderate', 'active', 'very_active'}:
        errors.append('Please select a valid activity level.')
    if target_weight is not None and not (20 <= target_weight <= 300):
        errors.append('Target weight must be between 20 and 300 kg.')

    return errors
