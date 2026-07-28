import os
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NoSQLRepository:
    """
    NoSQLRepository manages storing semi-structured, versioned documents (bulletins).
    It implements a MongoDB client if configured, and falls back to a persistent JSON-file-based
    repository for local development where MongoDB is not available.
    """

    def __init__(self, app=None):
        self.db = None
        self.client = None
        self.fallback_file = None
        self.use_fallback = True

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        mongo_uri = app.config.get('MONGO_URI')
        db_name = app.config.get('MONGO_DB_NAME', 'school_management')
        
        # Setup fallback path
        upload_folder = app.config.get('UPLOAD_FOLDER')
        if not os.path.exists(upload_folder):
            os.makedirs(upload_folder)
        self.fallback_file = os.path.join(upload_folder, 'bulletins_nosql.json')

        if mongo_uri:
            try:
                from pymongo import MongoClient
                logger.info(f"Connecting to MongoDB at: {mongo_uri}")
                self.client = MongoClient(mongo_uri, serverSelectionTimeoutMS=2000)
                # Check connection
                self.client.server_info()
                self.db = self.client[db_name]
                self.use_fallback = False
                logger.info("Successfully connected to MongoDB.")
            except Exception as e:
                logger.warning(f"MongoDB connection failed: {e}. Falling back to file-based document store.")
                self.use_fallback = True
        else:
            logger.info("No MONGO_URI configured. Using file-based document store.")
            self.use_fallback = True

    def _read_fallback(self):
        if not os.path.exists(self.fallback_file):
            return []
        try:
            with open(self.fallback_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error reading NoSQL fallback file: {e}")
            return []

    def _write_fallback(self, data):
        try:
            with open(self.fallback_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error writing NoSQL fallback file: {e}")
            return False

    def save_bulletin(self, bulletin):
        """
        Saves or updates a bulletin document.
        """
        # Ensure timestamp is string for JSON storage if fallback is used
        doc = bulletin.copy()
        if isinstance(doc.get('generated_at'), datetime):
            doc['generated_at'] = doc['generated_at'].isoformat()
        
        if not self.use_fallback:
            try:
                # Add or update MongoDB
                # Remove _id if it's there
                doc_id = doc.get('bulletin_id')
                self.db.bulletins.update_one(
                    {'bulletin_id': doc_id},
                    {'$set': doc},
                    upsert=True
                )
                return True
            except Exception as e:
                logger.error(f"MongoDB save_bulletin error: {e}. Falling back to file store.")
                # Fallback on failure
                pass

        # File fallback execution
        docs = self._read_fallback()
        doc_id = doc.get('bulletin_id')
        
        # Remove existing if exists
        docs = [d for d in docs if d.get('bulletin_id') != doc_id]
        docs.append(doc)
        
        return self._write_fallback(docs)

    def get_bulletin_by_id(self, bulletin_id):
        """
        Retrieves a bulletin document by its custom UUID.
        """
        if not self.use_fallback:
            try:
                doc = self.db.bulletins.find_one({'bulletin_id': bulletin_id})
                if doc:
                    doc['_id'] = str(doc['_id'])
                    return doc
            except Exception as e:
                logger.error(f"MongoDB get_bulletin_by_id error: {e}")
        
        docs = self._read_fallback()
        for doc in docs:
            if doc.get('bulletin_id') == bulletin_id:
                return doc
        return None

    def get_bulletins_by_student(self, student_id):
        """
        Retrieves all versioned bulletins for a specific student.
        """
        # Convert student_id to int if necessary
        try:
            student_id = int(student_id)
        except (ValueError, TypeError):
            pass

        if not self.use_fallback:
            try:
                cursor = self.db.bulletins.find({'student_id': student_id})
                results = []
                for doc in cursor:
                    doc['_id'] = str(doc['_id'])
                    results.append(doc)
                return results
            except Exception as e:
                logger.error(f"MongoDB get_bulletins_by_student error: {e}")

        docs = self._read_fallback()
        return [d for d in docs if d.get('student_id') == student_id]

    def get_bulletin_by_student_term_year(self, student_id, term, academic_year):
        """
        Retrieves a specific bulletin for a student, term, and academic year.
        """
        try:
            student_id = int(student_id)
        except (ValueError, TypeError):
            pass

        if not self.use_fallback:
            try:
                doc = self.db.bulletins.find_one({
                    'student_id': student_id,
                    'term': term,
                    'academic_year': academic_year
                })
                if doc:
                    doc['_id'] = str(doc['_id'])
                    return doc
            except Exception as e:
                logger.error(f"MongoDB get_bulletin_by_student_term_year error: {e}")

        docs = self._read_fallback()
        for doc in docs:
            if (doc.get('student_id') == student_id and 
                doc.get('term') == term and 
                doc.get('academic_year') == academic_year):
                return doc
        return None

    def get_all_bulletins(self):
        """
        Retrieves all bulletins in the database.
        """
        if not self.use_fallback:
            try:
                cursor = self.db.bulletins.find()
                results = []
                for doc in cursor:
                    doc['_id'] = str(doc['_id'])
                    results.append(doc)
                return results
            except Exception as e:
                logger.error(f"MongoDB get_all_bulletins error: {e}")

        return self._read_fallback()
