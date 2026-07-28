import pytest
from datetime import datetime
from app.models import db, Student, Subject, Grade
from app.services.grade_service import GradeService
from app.repositories.sql_repo import SQLRepository

def test_conversion_scale_logic(app):
    """
    Tests that numerical marks (0-100) are converted correctly to letter grades
    and status labels.
    """
    with app.app_context():
        # Using seeded conversion rules
        # A: 90-100 (Excellent)
        # B: 80-89 (Très Bien)
        # E: 0-59 (Insuffisant)
        
        letter, status = GradeService.get_letter_and_status(95.0)
        assert letter == 'A'
        assert status == 'Excellent'
        
        letter, status = GradeService.get_letter_and_status(85.0)
        assert letter == 'B'
        assert status == 'Très Bien'
        
        letter, status = GradeService.get_letter_and_status(50.0)
        assert letter == 'E'
        assert status == 'Insuffisant'

def test_student_metrics_and_ranking(app):
    """
    Tests GPA calculations and dynamic student ranking within a term/year context.
    """
    with app.app_context():
        # 1. Create two test students (assigned to the seeded "Seconde" class)
        seconde = SQLRepository.get_class_by_name("Seconde")
        student1 = SQLRepository.create_student(
            first_name="Jean", last_name="Dupont", date_of_birth=datetime.strptime("2005-01-01", "%Y-%m-%d").date(),
            gender="Masculin", country="France", address="123 rue de Paris", phone_number="+33612345678", email="jean.dupont@school.com",
            class_id=seconde.id
        )
        student2 = SQLRepository.create_student(
            first_name="Alice", last_name="Martin", date_of_birth=datetime.strptime("2006-02-02", "%Y-%m-%d").date(),
            gender="Féminin", country="France", address="456 rue de Lyon", phone_number="+33687654321", email="alice.martin@school.com",
            class_id=seconde.id
        )
        
        # Get Math subject (seeded)
        math = SQLRepository.get_subject_by_name("Mathématiques")
        phys = SQLRepository.get_subject_by_name("Physique")
        
        # 2. Enter grades for Student 1 (Jean) -> Math: 80, Phys: 90 -> Average: 85
        GradeService.create_or_update_grade(student1.id, math.id, 80.0, "Trimestre 1", "2025-2026")
        GradeService.create_or_update_grade(student1.id, phys.id, 90.0, "Trimestre 1", "2025-2026")
        
        # 3. Enter grades for Student 2 (Alice) -> Math: 95, Phys: 95 -> Average: 95
        GradeService.create_or_update_grade(student2.id, math.id, 95.0, "Trimestre 1", "2025-2026")
        GradeService.create_or_update_grade(student2.id, phys.id, 95.0, "Trimestre 1", "2025-2026")
        
        # 4. Verify calculations for Student 1
        metrics1 = GradeService.calculate_student_metrics(student1.id, "Trimestre 1", "2025-2026")
        assert metrics1['total_points'] == 170.0
        assert metrics1['average'] == 85.0
        assert metrics1['letter_grade'] == 'B'
        assert metrics1['rank'] == 2 # Jean is 2nd because Alice has 95 average
        
        # 5. Verify calculations for Student 2
        metrics2 = GradeService.calculate_student_metrics(student2.id, "Trimestre 1", "2025-2026")
        assert metrics2['average'] == 95.0
        assert metrics2['letter_grade'] == 'A'
        assert metrics2['rank'] == 1 # Alice is 1st
        
        # 6. Verify class statistics
        stats = GradeService.get_class_statistics("Trimestre 1", "2025-2026")
        assert stats['class_average'] == 90.0 # (85 + 95) / 2
        assert stats['total_students'] == 2
        assert stats['subject_averages']['Mathématiques'] == 87.5 # (80 + 95) / 2
        assert stats['subject_averages']['Physique'] == 92.5 # (90 + 95) / 2
