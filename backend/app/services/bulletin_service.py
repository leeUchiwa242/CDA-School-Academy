import uuid
from datetime import datetime
from app.repositories.sql_repo import SQLRepository
from app.repositories.nosql_repo import NoSQLRepository
from app.services.grade_service import GradeService
from app.services.ai_service import AIService
from flask import current_app

class BulletinService:
    """
    BulletinService manages generating and retrieving report cards (bulletins).
    It orchestrates combining relational student details + grades and saving them
    as versioned semi-structured document in NoSQL database, including AI recommendations.
    """

    def __init__(self, nosql_repo: NoSQLRepository):
        self.nosql_repo = nosql_repo

    def get_or_generate_bulletin(self, student_id, term, academic_year, force_regenerate=False):
        """
        Retrieves an existing bulletin document from NoSQL, or generates a new one.
        """
        # 1. Check if already exists in NoSQL (unless force regeneration is requested)
        if not force_regenerate:
            existing = self.nosql_repo.get_bulletin_by_student_term_year(student_id, term, academic_year)
            if existing:
                return existing, None

        # 2. Get student details from SQL
        student = SQLRepository.get_student_by_id(student_id)
        if not student:
            return None, "Étudiant introuvable."

        # 3. Overall metrics (average/rank/letter). Gracefully returns zeros/N-A when no grades exist.
        metrics = GradeService.calculate_student_metrics(student_id, term, academic_year)
        class_stats = GradeService.get_class_statistics(term, academic_year, class_id=student.class_id)
        has_any_grades = metrics['count'] > 0

        # Total students in the student's own class, used to display the rank
        # as "Xe sur N élèves" (this was previously missing from `metrics`).
        classmates = SQLRepository.get_all_students(class_id=student.class_id) if student.class_id else []
        class_size = len(classmates) or 1

        # 4. Build exactly one row per subject in the school (never duplicated), whether
        #    the student has grades in it or not — subjects without grades show as empty.
        #    Also computes, per subject, the Min/Max of classmates' subject averages
        #    (used by the "Classe" columns of the grades table) and a short
        #    rule-based appreciation.
        subjects = SQLRepository.get_all_subjects()
        detailed_grades = []
        subject_grades_dict = {}  # only subjects with a computed average, used for the AI prompt

        for subject in subjects:
            subj_grades = SQLRepository.get_grades_by_student_subject_term_year(student_id, subject.id, term, academic_year)
            devoirs = [g.mark for g in subj_grades if g.grade_type == 'Devoir']
            examens = [g.mark for g in subj_grades if g.grade_type == 'Examen']
            average = GradeService.get_subject_average(student_id, subject.id, term, academic_year)

            if average is not None:
                letter, status = GradeService.get_letter_and_status(average)
                subject_grades_dict[subject.name] = average
            else:
                letter, status = 'N/A', 'Pas de notes'

            class_average = class_stats['subject_averages'].get(subject.name)
            classmate_averages = [
                a for a in (
                    GradeService.get_subject_average(mate.id, subject.id, term, academic_year)
                    for mate in classmates
                ) if a is not None
            ]
            class_min = min(classmate_averages) if classmate_averages else None
            class_max = max(classmate_averages) if classmate_averages else None
            subject_appreciation = self._subject_appreciation(average, class_average)

            detailed_grades.append({
                'subject_id': subject.id,
                'subject': subject.name,
                'devoirs': devoirs,
                'examens': examens,
                'average': average,
                'letter_grade': letter,
                'status_label': status,
                'class_average': class_average,
                'class_min': class_min,
                'class_max': class_max,
                'subject_appreciation': subject_appreciation
            })

        # Vie scolaire: absence/lateness counts for this student, this term
        attendance_records = SQLRepository.get_attendance_records_for_student_term_year(student_id, term, academic_year)
        nb_absences = sum(1 for r in attendance_records if r.status == 'Absent')
        nb_retards = sum(1 for r in attendance_records if r.late)

        # 5. appelle le service AI pour la recommandation (gère gracieusement un ensemble de notes vide)
        api_key = current_app.config.get('GEMINI_API_KEY')
        ai_result = AIService.get_orientation_recommendation(
            student_name=f"{student.first_name} {student.last_name}",
            subject_grades=subject_grades_dict,
            api_key=api_key
        )

        # 6. Generate appreciation string
        if not has_any_grades:
            appreciation = "Aucune note n'a été attribuée à cet élève pour ce trimestre."
        else:
            appreciation = f"Trimestre {metrics['status_label'].lower()} dans l'ensemble. "
            if metrics['average'] >= 85:
                appreciation += "Excellent travail, félicitations du conseil de classe."
            elif metrics['average'] >= 70:
                appreciation += "Bon trimestre. Poursuivez dans cette voie."
            elif metrics['average'] >= 60:
                appreciation += "Travail sérieux mais des progrès sont encore possibles."
            else:
                appreciation += "Des efforts significatifs de rigueur et d'approfondissement sont requis."

        # 7. Construct NoSQL Document
        bulletin_doc = {
            'bulletin_id': str(uuid.uuid4()),
            'student_id': student.id,
            'student_info': {
                'first_name': student.first_name,
                'last_name': student.last_name,
                'email': student.email,
                'photo_url': student.photo_url,
                'gender': student.gender,
                'country': student.country,
                'class_name': student.school_class.name if student.school_class else None
            },
            'term': term,
            'academic_year': academic_year,
            'has_grades': has_any_grades,
            'grades': detailed_grades,
            'calculations': {
                'total_points': metrics['total_points'],
                'average': metrics['average'],
                'rank': metrics['rank'],
                'letter_grade': metrics['letter_grade'],
                'status_label': metrics['status_label'],
                'class_average': class_stats['class_average'],
                'class_size': class_size
            },
            'vie_scolaire': {
                'absences': nb_absences,
                'retards': nb_retards
            },
            'appreciation': appreciation,
            'ai_recommendation': {
                'prompt': ai_result['prompt'],
                'recommendation': ai_result['recommendation'],
                'source': ai_result['source'],
                'generated_at': datetime.utcnow().isoformat()
            },
            'generated_at': datetime.utcnow(),
            'version': 1
        }

        # 8. Save to NoSQL database (MongoDB or file fallback)
        self.nosql_repo.save_bulletin(bulletin_doc)

        # Remove database object-id or python datetime before returning to route
        bulletin_doc['generated_at'] = bulletin_doc['generated_at'].isoformat()
        return bulletin_doc, None

    @staticmethod
    def _subject_appreciation(average, class_average):
        """
        Short, rule-based per-subject comment for the grades table
        (no extra AI call needed for this — kept fast and deterministic).
        """
        if average is None:
            return "Aucune évaluation ce trimestre."
        if average >= 85:
            return "Excellent travail, félicitations."
        if average >= 70:
            return "Bon niveau, continuez ainsi."
        if class_average is not None and average - class_average >= 5:
            return "Résultats au-dessus de la moyenne de la classe."
        if average >= 60:
            return "Niveau correct, des efforts sont encore possibles."
        return "Des efforts sont attendus dans cette matière."

    def get_bulletin_by_uuid(self, bulletin_uuid):
        """
        Fetches single bulletin document by its UUID.
        """
        return self.nosql_repo.get_bulletin_by_id(bulletin_uuid)

    def get_bulletins_for_student(self, student_id):
        """
        Fetches all bulletins generated for a student.
        """
        return self.nosql_repo.get_bulletins_by_student(student_id)