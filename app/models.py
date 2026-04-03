from datetime import datetime

from bson import ObjectId
from flask import current_app
from pymongo.errors import DuplicateKeyError, PyMongoError
from pymongo import ASCENDING, DESCENDING, MongoClient
from werkzeug.security import check_password_hash, generate_password_hash


class MongoDB:
    """Small helper around the Mongo client used by the app."""

    def __init__(self):
        self.client = None
        self.database = None
        self.available = False
        self.last_error = None

    def init_app(self, app):
        """Initialize MongoDB connection and collections."""
        timeout_ms = app.config.get("MONGO_TIMEOUT_MS", 3000)
        self.client = MongoClient(
            app.config["MONGO_URI"],
            serverSelectionTimeoutMS=timeout_ms,
            connectTimeoutMS=timeout_ms,
        )
        self.database = self.client[app.config["MONGO_DB_NAME"]]

        try:
            self.client.admin.command("ping")
            self._ensure_indexes()
            self.available = True
            self.last_error = None
        except PyMongoError as exc:
            self.available = False
            self.last_error = str(exc)
            app.logger.warning("MongoDB unavailable during startup: %s", exc)

    def _ensure_indexes(self):
        """Create the indexes the app relies on."""
        self.users.create_index([("email", ASCENDING)], unique=True)
        self.chat_messages.create_index([("user_id", ASCENDING), ("created_at", ASCENDING)])

    def ensure_connection(self):
        """Refresh connection status and indexes if MongoDB becomes available later."""
        if self.client is None:
            raise RuntimeError("MongoDB has not been initialized.")
        try:
            self.client.admin.command("ping")
            if not self.available:
                self._ensure_indexes()
            self.available = True
            self.last_error = None
            return True
        except PyMongoError as exc:
            self.available = False
            self.last_error = str(exc)
            try:
                current_app.logger.warning("MongoDB connection check failed: %s", exc)
            except RuntimeError:
                pass
            return False

    @property
    def users(self):
        if self.database is None:
            raise RuntimeError("MongoDB has not been initialized.")
        self.ensure_connection()
        return self.database["users"]

    @property
    def chat_messages(self):
        if self.database is None:
            raise RuntimeError("MongoDB has not been initialized.")
        self.ensure_connection()
        return self.database["chat_messages"]


db = MongoDB()


def _serialize_id(document):
    """Convert Mongo's ObjectId into a string for app usage."""
    if document and "_id" in document:
        document["_id"] = str(document["_id"])
    return document


def _parse_object_id(value):
    """Safely convert a string id into ObjectId."""
    try:
        return ObjectId(value)
    except Exception:
        return None


class User:
    """Registered user account."""

    def __init__(self, document):
        self._doc = _serialize_id(document)

    def __getattr__(self, item):
        if item == "id":
            return self._doc.get("_id")
        return self._doc.get(item)

    def __setattr__(self, key, value):
        if key == "_doc":
            super().__setattr__(key, value)
            return
        if key == "id":
            self._doc["_id"] = value
            return
        self._doc[key] = value

    @classmethod
    def find_by_email(cls, email):
        document = db.users.find_one({"email": email})
        return cls(document) if document else None

    @classmethod
    def get_by_id(cls, user_id):
        object_id = _parse_object_id(user_id)
        if not object_id:
            return None
        document = db.users.find_one({"_id": object_id})
        return cls(document) if document else None

    @classmethod
    def create(cls, name, email, password):
        now = datetime.utcnow()
        document = {
            "email": email,
            "password_hash": generate_password_hash(password),
            "name": name,
            "age": None,
            "gender": None,
            "height_cm": None,
            "weight_kg": None,
            "goal_type": None,
            "target_weight": None,
            "activity_level": None,
            "dietary_preferences": None,
            "allergies": None,
            "medical_conditions": None,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
            "last_login": None,
        }
        try:
            result = db.users.insert_one(document)
        except DuplicateKeyError:
            raise ValueError("This email is already registered. Please login instead.")
        document["_id"] = result.inserted_id
        return cls(document)

    def save(self):
        self.updated_at = datetime.utcnow()
        payload = dict(self._doc)
        object_id = _parse_object_id(payload.pop("_id", None))
        if not object_id:
            raise ValueError("User id is missing or invalid.")
        db.users.update_one({"_id": object_id}, {"$set": payload})
        self._doc["_id"] = str(object_id)

    def set_password(self, password):
        """Hash and set password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password."""
        password_hash = self.password_hash or ""
        if password_hash.startswith("pbkdf2:") or password_hash.startswith("scrypt:"):
            return check_password_hash(password_hash, password)

        # Backward compatibility for older unsalted SHA-256 records.
        import hashlib
        legacy_hash = hashlib.sha256(password.encode()).hexdigest()
        if password_hash == legacy_hash:
            self.set_password(password)
            self.save()
            return True
        return False

    def get_bmi(self):
        """Calculate BMI."""
        if self.height_cm and self.weight_kg:
            return self.weight_kg / ((self.height_cm / 100) ** 2)
        return None

    def get_bmi_category(self):
        """Get BMI category."""
        bmi = self.get_bmi()
        if bmi:
            if bmi < 18.5:
                return "Underweight"
            if bmi < 25:
                return "Normal"
            if bmi < 30:
                return "Overweight"
            return "Obese"
        return None

    def get_profile_summary(self):
        """Generate a friendly text summary for AI context."""
        summary = []
        if self.name:
            summary.append(f"Name: {self.name}")
        if self.age:
            summary.append(f"Age: {self.age} years old")
        if self.gender:
            summary.append(f"Gender: {self.gender.capitalize()}")
        if self.height_cm and self.weight_kg:
            bmi = self.get_bmi()
            bmi_cat = self.get_bmi_category()
            summary.append(f"Height: {self.height_cm}cm | Weight: {self.weight_kg}kg | BMI: {bmi:.1f} ({bmi_cat})")
        if self.goal_type:
            goal_display = {
                "weight_loss": "losing weight",
                "muscle_gain": "gaining muscle",
                "maintain": "maintaining current weight",
                "improve_health": "improving overall health",
            }.get(self.goal_type, self.goal_type)
            summary.append(f"Goal: {goal_display}")
        if self.target_weight:
            summary.append(f"Target Weight: {self.target_weight}kg")
        if self.activity_level:
            summary.append(f"Activity Level: {self.activity_level.replace('_', ' ').title()}")
        if self.dietary_preferences:
            summary.append(f"Diet: {self.dietary_preferences}")
        if self.allergies:
            summary.append(f"Allergies: {self.allergies}")
        if self.medical_conditions:
            summary.append(f"Medical Conditions: {self.medical_conditions}")

        return "\n".join(summary) if summary else "Profile incomplete."

    def to_dict(self):
        """Convert to dictionary (exclude password)."""
        return {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "age": self.age,
            "gender": self.gender,
            "height_cm": self.height_cm,
            "weight_kg": self.weight_kg,
            "goal_type": self.goal_type,
            "target_weight": self.target_weight,
            "activity_level": self.activity_level,
            "bmi": self.get_bmi(),
            "bmi_category": self.get_bmi_category(),
        }


class ChatMessage:
    """Store chat history."""

    def __init__(self, document):
        self._doc = _serialize_id(document)

    def __getattr__(self, item):
        if item == "id":
            return self._doc.get("_id")
        return self._doc.get(item)

    @classmethod
    def create(cls, user_id, role, content):
        now = datetime.utcnow()
        document = {
            "user_id": user_id,
            "role": role,
            "content": content,
            "created_at": now,
        }
        result = db.chat_messages.insert_one(document)
        document["_id"] = result.inserted_id
        return cls(document)

    @classmethod
    def list_for_user(cls, user_id, limit=None, ascending=True):
        sort_order = ASCENDING if ascending else DESCENDING
        cursor = db.chat_messages.find({"user_id": user_id}).sort("created_at", sort_order)
        if limit:
            cursor = cursor.limit(limit)
        messages = [cls(document) for document in cursor]
        if limit and not ascending:
            messages.reverse()
        return messages

    @classmethod
    def delete_for_user(cls, user_id):
        db.chat_messages.delete_many({"user_id": user_id})

    def to_dict(self):
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "created_at": self.created_at.isoformat(),
        }
