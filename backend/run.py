import os
from dotenv import load_dotenv
from app import create_app

# Load local environment variables from .env file
load_dotenv()

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    # In production debug must be False.
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    
    print(f"Starting School Management Flask backend on http://127.0.0.1:{port} (Debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
