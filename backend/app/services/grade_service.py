from app.repositories.sql_repo import SQLRepository
from datetime import datetime

class GradeService:
    """
    GradeService handles adding/updating marks, subject management, conversion scale rules,
    and calculates all student metrics (averages, rankings, class distributions).
    """

    @staticmethod
    def get_letter_and_status(mark):
        """
        convertit dynamiquement une note (0-100) en une lettre de note et un label de statut
        en utilisant des règles configurées dans la base de données SQL.
        """
        scales = SQLRepository.get_all_conversion_scales()
        for scale in scales:
            if scale.min_score <= mark <= scale.max_score:
                return scale.letter_grade, scale.status_label
        # remplace les valeurs par défaut si l'échelle est vide ou si la plage est manquante
        if mark >= 90: return 'A', 'Excellent'
        elif mark >= 80: return 'B', 'Très Bien'
        elif mark >= 70: return 'C', 'Bien'
        elif mark >= 60: return 'D', 'Acceptable'
        else: return 'E', 'Insuffisant'

    @staticmethod
    def get_subject_average(student_id, subject_id, term, academic_year):
        """
        calcule la moyenne d'un élève pour une matière donnée au cours d'un trimestre :
        - La moyenne de toutes les notes de 'Devoir' compte pour 50 % de la moyenne de la matière.
        - La moyenne de toutes les notes d'Examen compte pour les 50 % restants.
        Si des notes n'existent jusqu'à présent que pour l'un des deux types, la moyenne de ce type est
        utilisée seule jusqu'à ce que l'autre type ait au moins une note.
        Renvoie None s'il n'y a pas de notes du tout pour cette matière/trimestre.
        """
        grades = SQLRepository.get_grades_by_student_subject_term_year(student_id, subject_id, term, academic_year)
        devoirs = [g.mark for g in grades if g.grade_type == 'Devoir']
        examens = [g.mark for g in grades if g.grade_type == 'Examen']

        devoir_avg = sum(devoirs) / len(devoirs) if devoirs else None
        examen_avg = sum(examens) / len(examens) if examens else None

        if devoir_avg is not None and examen_avg is not None:
            return round(devoir_avg * 0.5 + examen_avg * 0.5, 2)
        elif devoir_avg is not None:
            return round(devoir_avg, 2)
        elif examen_avg is not None:
            return round(examen_avg, 2)
        return None

    @staticmethod
    def add_grade(user, student_id, subject_id, mark, term, academic_year, grade_type, date_str=None):
        """
        Adds a Devoir or Examen grade. Only an Administrateur, or the Professeur
        assigned to this class/subject, is authorized to do so.
        `date_str` (format AAAA-MM-JJ) lets the teacher record the actual date
        the devoir/examen took place, instead of defaulting to today.
        """
        if not (0 <= mark <= 100):
            return None, "La note doit se situer entre 0 et 100."

        if grade_type not in ['Devoir', 'Examen']:
            return None, "Le type de note doit être 'Devoir' ou 'Examen'."

        student = SQLRepository.get_student_by_id(student_id)
        if not student:
            return None, "Étudiant introuvable."

        subject = SQLRepository.get_subject_by_id(subject_id)
        if not subject:
            return None, "Matière introuvable."

        from app.services.teacher_service import TeacherService
        if not TeacherService.is_authorized(user, subject_id, student.class_id):
            return None, "Vous n'êtes pas autorisé à saisir de notes pour cette classe/matière."

        created_at = None
        if date_str:
            try:
                created_at = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                return None, "Date invalide (format attendu AAAA-MM-JJ)."

        grade = SQLRepository.add_grade(student_id, subject_id, mark, term, academic_year, grade_type, created_at=created_at)

        # Best-effort automated alerting: compares this grade to the student's
        # previous grade of the same type (Devoir vs Devoir, Examen vs Examen).
        # Wrapped so a notification failure never breaks grade entry.
        try:
            from app.services.notification_service import NotificationService
            previous_grades = SQLRepository.get_grades_by_student_subject_term_year(
                student_id, subject_id, term, academic_year, grade_type=grade_type
            )
            previous_grades = [g for g in previous_grades if g.id != grade.id]
            if previous_grades:
                previous_mark = previous_grades[-1].mark
                NotificationService.check_grade_drop(student, subject.name, previous_mark, mark, term, academic_year)
        except Exception:
            pass

        return grade, None

    @staticmethod
    def update_grade(user, grade_id, mark, date_str=None):
        """
        Edits an existing grade's mark (and optionally its date). Only an
        Administrateur, or the Professeur assigned to this class/subject, is authorized.
        """
        if not (0 <= mark <= 100):
            return None, "La note doit se situer entre 0 et 100."

        grade = SQLRepository.get_grade_by_id(grade_id)
        if not grade:
            return None, "Note introuvable."

        student = SQLRepository.get_student_by_id(grade.student_id)
        if not student:
            return None, "Étudiant introuvable."

        from app.services.teacher_service import TeacherService
        if not TeacherService.is_authorized(user, grade.subject_id, student.class_id):
            return None, "Vous n'êtes pas autorisé à modifier une note pour cette classe/matière."

        created_at = None
        if date_str:
            try:
                created_at = datetime.strptime(date_str, '%Y-%m-%d')
            except ValueError:
                return None, "Date invalide (format attendu AAAA-MM-JJ)."

        updated = SQLRepository.update_grade(grade_id, mark, created_at=created_at)
        return updated, None

    @staticmethod
    def delete_grade(user, grade_id):
        """
        Deletes a grade. Only an Administrateur, or the Professeur assigned to
        this class/subject, is authorized.
        """
        grade = SQLRepository.get_grade_by_id(grade_id)
        if not grade:
            return False, "Note introuvable."

        student = SQLRepository.get_student_by_id(grade.student_id)
        if not student:
            return False, "Étudiant introuvable."

        from app.services.teacher_service import TeacherService
        if not TeacherService.is_authorized(user, grade.subject_id, student.class_id):
            return False, "Vous n'êtes pas autorisé à supprimer une note pour cette classe/matière."

        SQLRepository.delete_grade(grade_id)
        return True, None

    @staticmethod
    def get_full_subject_breakdown(student_id, term, academic_year):
        """
        Returns, for every subject in the school, this student's Devoir/Examen
        grades and weighted average for the given term/year (used by the
        read-only admin student profile view).
        """
        subjects = SQLRepository.get_all_subjects()
        breakdown = []
        for subject in subjects:
            grades = SQLRepository.get_grades_by_student_subject_term_year(student_id, subject.id, term, academic_year)
            devoirs = [g.to_dict() for g in grades if g.grade_type == 'Devoir']
            examens = [g.to_dict() for g in grades if g.grade_type == 'Examen']
            average = GradeService.get_subject_average(student_id, subject.id, term, academic_year)
            breakdown.append({
                'subject_id': subject.id,
                'subject_name': subject.name,
                'devoirs': devoirs,
                'examens': examens,
                'average': average
            })
        return breakdown

    @staticmethod
    def calculate_student_metrics(student_id, term, academic_year):
        """
        Calculates the overall average (based on weighted Devoir/Examen subject
        averages), letter grade, and rank for a student in a term/year.
        """
        student_grades = SQLRepository.get_grades_by_student(student_id)
        filtered_grades = [g for g in student_grades if g.term == term and g.academic_year == academic_year]

        if not filtered_grades:
            return {
                'total_points': 0.0,
                'average': 0.0,
                'count': 0,
                'letter_grade': 'N/A',
                'status_label': 'Pas de notes',
                'rank': 0
            }

        subject_ids = set(g.subject_id for g in filtered_grades)
        subject_averages = [
            avg for avg in (
                GradeService.get_subject_average(student_id, sid, term, academic_year)
                for sid in subject_ids
            ) if avg is not None
        ]

        average = sum(subject_averages) / len(subject_averages) if subject_averages else 0.0
        letter, status = GradeService.get_letter_and_status(average)
        rank = GradeService.calculate_student_rank(student_id, term, academic_year, average)

        return {
            'total_points': round(sum(subject_averages), 2),
            'average': round(average, 2),
            'count': len(filtered_grades),
            'letter_grade': letter,
            'status_label': status,
            'rank': rank
        }

    @staticmethod
    def calculate_student_rank(student_id, term, academic_year, student_avg):
        """
        Helper to calculate a student's rank based on the weighted overall
        averages of all classmates.
        """
        all_students = SQLRepository.get_all_students()
        averages = []

        for s in all_students:
            s_grades = SQLRepository.get_grades_by_student(s.id)
            s_filtered = [g for g in s_grades if g.term == term and g.academic_year == academic_year]
            if not s_filtered:
                continue
            s_subject_ids = set(g.subject_id for g in s_filtered)
            s_subject_averages = [
                avg for avg in (
                    GradeService.get_subject_average(s.id, sid, term, academic_year)
                    for sid in s_subject_ids
                ) if avg is not None
            ]
            if s_subject_averages:
                s_avg = sum(s_subject_averages) / len(s_subject_averages)
                averages.append((s.id, s_avg))

        # Sort desc
        averages.sort(key=lambda x: x[1], reverse=True)

        # Find position
        rank = 1
        for idx, (sid, avg) in enumerate(averages):
            if idx > 0 and avg < averages[idx-1][1]:
                rank = idx + 1
            if sid == student_id:
                return rank
        
        return rank

    @staticmethod
    def get_class_statistics(term, academic_year, class_id=None):
        """
        Gathers KPIs and graphs data for the dashboard, optionally scoped to one class:
        - Class average (mean of each student's weighted overall average)
        - Total students
        - Average attendance rate across the class
        - Number of Devoir grades recorded this term (simple completion proxy)
        - Average per subject
        - Performance distribution (based on weighted student averages)
        """
        all_students = SQLRepository.get_all_students()
        if class_id:
            target_students = [s for s in all_students if s.class_id == class_id]
        else:
            target_students = all_students

        student_ids = set(s.id for s in target_students)
        all_grades = SQLRepository.get_all_grades_for_term_year(term, academic_year)
        grades = [g for g in all_grades if g.student_id in student_ids]

        empty_distribution = {
            'A (90-100)': 0,
            'B (80-89)': 0,
            'C (70-79)': 0,
            'D (60-69)': 0,
            'E (0-59)': 0
        }

        # Attendance rate, averaged across the target students (independent of whether they have grades)
        attendance_rates = []
        for s in target_students:
            records = SQLRepository.get_attendance_records_for_student(s.id)
            if records:
                present = sum(1 for r in records if r.status == 'Présent')
                attendance_rates.append((present / len(records)) * 100)
        avg_attendance_rate = round(sum(attendance_rates) / len(attendance_rates), 1) if attendance_rates else 0.0

        homework_count = sum(1 for g in grades if g.grade_type == 'Devoir')

        if not grades:
            return {
                'class_average': 0.0,
                'total_students': len(target_students),
                'attendance_rate': avg_attendance_rate,
                'homework_count': homework_count,
                'subject_averages': {},
                'distribution': empty_distribution
            }

        # Average per subject (raw mark mean, for the bar chart)
        subject_data = {}
        for g in grades:
            subj_name = g.subject.name
            subject_data.setdefault(subj_name, []).append(g.mark)
        subject_averages = {
            subj: round(sum(marks) / len(marks), 2)
            for subj, marks in subject_data.items()
        }

        # Weighted overall average per student (Devoir 50% / Examen 50%, per subject, then averaged)
        student_averages = {}
        for s in target_students:
            metrics = GradeService.calculate_student_metrics(s.id, term, academic_year)
            if metrics['count'] > 0:
                student_averages[s.id] = metrics['average']

        class_average = sum(student_averages.values()) / len(student_averages) if student_averages else 0.0

        distribution = dict(empty_distribution)
        for avg in student_averages.values():
            letter, _ = GradeService.get_letter_and_status(avg)
            if letter == 'A': distribution['A (90-100)'] += 1
            elif letter == 'B': distribution['B (80-89)'] += 1
            elif letter == 'C': distribution['C (70-79)'] += 1
            elif letter == 'D': distribution['D (60-69)'] += 1
            else: distribution['E (0-59)'] += 1

        return {
            'class_average': round(class_average, 2),
            'total_students': len(target_students),
            'attendance_rate': avg_attendance_rate,
            'homework_count': homework_count,
            'subject_averages': subject_averages,
            'distribution': distribution
        }

    @staticmethod
    def get_student_alert_summary(term, academic_year, class_id=None, top_n=5):
        """
        Surfaces at-risk students for the dashboard: highest absence/lateness
        counts this term, and the most recent significant grade drops
        (sourced from the notifications already raised by NotificationService).
        """
        all_students = SQLRepository.get_all_students()
        target_students = [s for s in all_students if s.class_id == class_id] if class_id else all_students

        absence_counts = []
        late_counts = []
        for s in target_students:
            records = SQLRepository.get_attendance_records_for_student_term_year(s.id, term, academic_year)
            absences = sum(1 for r in records if r.status == 'Absent')
            lates = sum(1 for r in records if r.late)
            name = f"{s.first_name} {s.last_name}"
            if absences > 0:
                absence_counts.append({'student_id': s.id, 'name': name, 'count': absences})
            if lates > 0:
                late_counts.append({'student_id': s.id, 'name': name, 'count': lates})

        absence_counts.sort(key=lambda x: x['count'], reverse=True)
        late_counts.sort(key=lambda x: x['count'], reverse=True)

        recent_drops = SQLRepository.get_notifications(notif_type='student_grade_drop', limit=top_n)

        return {
            'top_absences': absence_counts[:top_n],
            'top_lates': late_counts[:top_n],
            'grade_drops': [n.to_dict() for n in recent_drops]
        }