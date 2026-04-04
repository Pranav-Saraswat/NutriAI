import os
from flask import current_app

try:
    from groq import Groq
except ImportError:
    Groq = None

class LLMService:
    """Service class for Groq API integration."""
    
    def __init__(self):
        self.client = None
        self.model = None
        
    def _get_client(self):
        if Groq is None:
            current_app.logger.warning("Groq SDK is not installed. Chat service is unavailable.")
            return None
        if not self.client:
            api_key = current_app.config.get('GROQ_API_KEY')
            self.model = current_app.config.get('GROQ_MODEL', 'llama-3.1-8b-instant')
            if api_key:
                self.client = Groq(api_key=api_key)
                current_app.logger.info("Groq client initialized with model: %s", self.model)
            else:
                current_app.logger.warning("GROQ_API_KEY not found in configuration")
        return self.client
    
    def _get_system_prompt(self, user_profile_summary):
        """Strict AI Nutritionist prompt with domain restriction and table formatting."""
        return self._construct_full_prompt(user_profile_summary)

    def _construct_full_prompt(self, user_profile_summary):
        return f"""You are an AI Nutrition and Fitness Assistant.

RULE 1 — DOMAIN RESTRICTION
You ONLY answer questions related to:
* Nutrition
* Diet plans
* Weight loss
* Weight gain
* Muscle building
* Fitness and exercise
* Healthy lifestyle

If the user asks anything outside these topics, respond exactly with:
"I specialize only in nutrition and fitness. Please ask a health or diet related question."

RULE 2 — STRICT FORMATTING
All responses must follow structured formatting.
Use:
* Clear section headings
* Bullet points
* Tables for plans (diet plans, workout plans)

Never return long unstructured paragraphs.

Example format for diet plans:

User Profile
* Age: ...
* Height: ...
* Weight: ...
* Goal: ...

Daily Calories
* Recommended intake: ...

Meal Plan (Use Markdown Tables)
| Meal      | Food | Calories |
| --------- | ---- | -------- |
| Breakfast | ...  | ...      |
| Lunch     | ...  | ...      |
| Snack     | ...  | ...      |
| Dinner    | ...  | ...      |

Tips
* Tip 1
* Tip 2
* Tip 3

USER PROFILE DATA:
{user_profile_summary}
"""

    def _normalize_response_content(self, content):
        """Convert Groq response content into a plain string."""
        if isinstance(content, str):
            return content.strip()

        if isinstance(content, list):
            parts = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                    continue
                if not isinstance(item, dict):
                    continue
                text = item.get('text') or item.get('content')
                if isinstance(text, str):
                    parts.append(text)
            return "\n".join(part.strip() for part in parts if part and part.strip()).strip()

        if isinstance(content, dict):
            text = content.get('text') or content.get('content')
            if isinstance(text, str):
                return text.strip()

        if content is None:
            return ""

        return str(content).strip()

    def chat(self, user_message, user_profile_summary, chat_history=None):
        client = self._get_client()
        if not client:
            error_message = 'Groq SDK is not installed.' if Groq is None else 'Groq client not initialized.'
            return {'success': False, 'response': None, 'error': error_message}
        
        try:
            messages = [
                {"role": "system", "content": self._get_system_prompt(user_profile_summary)}
            ]
            
            # Add chat history
            if chat_history:
                for msg in chat_history[-10:]:
                    messages.append({"role": msg['role'], "content": msg['content']})
            
            # Add user message
            messages.append({"role": "user", "content": user_message})
            
            completion = client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.7,
                max_tokens=600,
                top_p=1,
                stream=False,
                stop=None,
            )
            
            ai_response = self._normalize_response_content(completion.choices[0].message.content)
            if not ai_response:
                current_app.logger.warning("Groq returned an empty response payload.")
                return {
                    'success': False,
                    'response': None,
                    'error': 'The AI service returned an empty response. Please try again.'
                }
            
            return {
                'success': True, 
                'response': ai_response, 
                'error': None
            }
            
        except Exception as e:
            current_app.logger.exception("Groq chat request failed")
            return {'success': False, 'response': None, 'error': str(e)}
    
    def test_connection(self):
        client = self._get_client()
        if client:
            return {'success': True, 'message': f'Groq client initialized with model: {self.model}'}
        return {'success': False, 'message': 'Groq client not initialized'}

llm_service = LLMService()
