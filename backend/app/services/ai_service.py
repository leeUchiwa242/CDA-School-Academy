import requests
import logging

logger = logging.getLogger(__name__)

class AIService:
    """
    AIService generates smart orientation recommendations based on student grades.
    It integrates with Gemini API, falling back to a detailed rule-based recommendation
    system if the Gemini API Key is missing or the request fails.
    """

    @staticmethod
    def generate_prompt(student_name, subject_grades):
        """
        Creates a high-quality prompt for the orientation counselor AI.
        """
        grades_summary = "\n".join([f"- {subj}: {mark}/100" for subj, mark in subject_grades.items()])
        
        prompt = f"""
        Tu es un conseiller d'orientation scolaire expérimenté dans le système éducatif français.
        Analyse les résultats académiques suivants pour l'élève {student_name} afin de formuler une recommandation d'orientation personnalisée d'environ 3 à 4 phrases.
        
        Notes de l'élève :
        {grades_summary}
        
        Ta recommandation doit :
        1. Identifier les points forts (matières où l'élève performe le mieux).
        2. Proposer des pistes d'orientation réalistes (ex: filière scientifique, littéraire, économique, artistique ou sportive) selon ses forces.
        3. Donner un conseil d'encouragement personnalisé et constructif pour l'avenir.
        
        Rédige ta réponse directement en français, sur un ton bienveillant et professionnel, sans aucune mise en forme markdown superflue (pas de gras, pas d'étoiles, juste du texte brut bien structuré).
        """
        return prompt.strip()

    @staticmethod
    def get_orientation_recommendation(student_name, subject_grades, api_key=None):
        """
        Generates orientation advice, calling Gemini API if available, else falling back.
        """
        prompt = AIService.generate_prompt(student_name, subject_grades)
        
        if not subject_grades:
            return {
                'prompt': prompt,
                'recommendation': "Aucune recommandation possible car l'élève ne possède pas encore de notes pour ce trimestre.",
                'source': 'Local Rule Engine'
            }

        if api_key:
            try:
                # Call Gemini 1.5 Flash API
                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                headers = {'Content-Type': 'application/json'}
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }]
                }
                
                response = requests.post(url, headers=headers, json=payload, timeout=8)
                if response.status_code == 200:
                    res_json = response.json()
                    recommendation_text = res_json['candidates'][0]['content']['parts'][0]['text']
                    return {
                        'prompt': prompt,
                        'recommendation': recommendation_text.strip(),
                        'source': 'Gemini 1.5 Flash API'
                    }
                else:
                    logger.warning(f"Gemini API returned status code {response.status_code}. Using local engine.")
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Using local engine.")

        # Local Rule-based Fallback
        # Let's categorize subjects
        math_phys = (subject_grades.get('Mathématiques', 0) + subject_grades.get('Physique', 0)) / 2
        humanities = (subject_grades.get('Français', 0) + subject_grades.get('Histoire', 0) + subject_grades.get('Espagnol', 0)) / 3
        sport = subject_grades.get('Sport', 0)
        
        # Analyze strengths
        recommendation = ""
        if math_phys >= 75:
            recommendation = (
                f"Au vu des excellents résultats de {student_name} en matières scientifiques "
                f"(notamment en Mathématiques et Physique), une orientation vers des filières "
                f"d'ingénierie, d'informatique ou de sciences fondamentales est vivement recommandée. "
                f"L'élève démontre des capacités de rigueur et d'analyse logique très solides."
            )
        elif humanities >= 75:
            recommendation = (
                f"Les performances de {student_name} dans les matières littéraires et de sciences humaines "
                f"(Français, Espagnol, Histoire) révèlent une excellente aisance rédactionnelle et des "
                f"compétences de communication remarquables. Une orientation vers des cursus de communication, "
                f"de langues étrangères, de droit ou de sciences politiques serait tout à fait adaptée."
            )
        elif sport >= 80:
            recommendation = (
                f"{student_name} s'illustre particulièrement dans la pratique sportive, révélant un goût prononcé "
                f"pour le dépassement de soi et l'esprit d'équipe. Des filières liées aux métiers du sport "
                f"(STAPS, animation sportive, management du sport) constitueraient un excellent choix de carrière."
            )
        else:
            overall_avg = sum(subject_grades.values()) / len(subject_grades)
            if overall_avg >= 70:
                recommendation = (
                    f"{student_name} présente un profil équilibré et des compétences homogènes dans l'ensemble des matières. "
                    f"Cette polyvalence ouvre la voie à de nombreuses opportunités, notamment des filières générales, "
                    f"économiques ou tertiaires. L'élève doit poursuivre ses efforts réguliers pour consolider ce bon niveau."
                )
            else:
                recommendation = (
                    f"Les résultats de {student_name} ce trimestre sont en retrait. L'objectif principal doit se porter "
                    f"sur le renforcement des acquis méthodologiques de base dans les matières clés. Une attention "
                    f"particulière apportée aux révisions quotidiennes permettra de dégager de nouvelles perspectives d'orientation."
                )
                
        return {
            'prompt': prompt,
            'recommendation': recommendation,
            'source': 'Local Rule Engine'
        }
