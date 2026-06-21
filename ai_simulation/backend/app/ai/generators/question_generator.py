"""
Question Generator
AI-powered question generation for different modules
Generates contextual, role-specific questions
"""

from typing import List, Dict, Any, Optional
import openai
from loguru import logger
from app.core.config import settings
from app.models.question import QuestionType, DifficultyLevel, ProgrammingLanguage
import json
import random


class QuestionGenerator:
    """
    Generates questions using OpenAI GPT-4
    Creates realistic, role-specific simulation questions
    """
    
    def __init__(self):
        """Initialize OpenAI client"""
        openai.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
    
    def generate_module_1_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Generate Module 1 question - Problem Understanding
        
        Args:
            role: Job role (e.g., "Backend Developer")
            domain: Domain (e.g., "E-commerce")
            difficulty: Question difficulty
        
        Returns:
            Question data dictionary
        """
        prompt = f"""
You are an expert technical interviewer creating a realistic problem understanding question.

Role: {role}
Domain: {domain}
Difficulty: {difficulty}

Create a real-world problem scenario that tests the candidate's ability to:
1. Understand business requirements
2. Identify key technical challenges
3. Extract functional and non-functional requirements

Generate a JSON response with this exact structure:
{{
    "title": "Brief title",
    "problem_statement": "Detailed real-world problem description (200-300 words)",
    "context": "Business context and background",
    "scenario": "Specific scenario the candidate needs to analyze",
    "key_points": ["point1", "point2", "point3"],
    "evaluation_criteria": {{
        "must_include": ["requirement1", "requirement2"],
        "keywords": ["keyword1", "keyword2"],
        "concepts": ["concept1", "concept2"]
    }}
}}

Make it realistic, challenging, and relevant to {role} in {domain}.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON from response
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            question_data = json.loads(content)
            
            # Add metadata
            question_data.update({
                "question_type": QuestionType.PROBLEM_UNDERSTANDING,
                "module_number": 1,
                "difficulty": difficulty,
                "category": domain,
                "tags": [role.lower(), domain.lower(), "problem_understanding"]
            })
            
            logger.info(f"Generated Module 1 question: {question_data['title']}")
            return question_data
            
        except Exception as e:
            logger.error(f"Error generating Module 1 question: {str(e)}")
            return self._get_fallback_module_1_question(role, domain, difficulty)
    
    def generate_module_2_coding_question(
        self,
        role: str,
        language: ProgrammingLanguage,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Generate Module 2 question - Coding/Implementation
        
        Args:
            role: Job role
            language: Programming language
            difficulty: Question difficulty
        
        Returns:
            Question data dictionary
        """
        prompt = f"""
You are an expert technical interviewer creating a coding question.

Role: {role}
Language: {language.value}
Difficulty: {difficulty}

Create a realistic coding challenge that tests practical skills.

Generate a JSON response with this exact structure:
{{
    "title": "Brief title",
    "description": "Problem description",
    "problem_statement": "Detailed problem statement",
    "requirements": ["req1", "req2", "req3"],
    "constraints": ["Time: O(n)", "Space: O(1)"],
    "starter_code": "# Starter code template",
    "test_cases": [
        {{"input": "test input", "expected_output": "expected result", "explanation": "why"}},
        {{"input": "test input 2", "expected_output": "expected result 2", "explanation": "why"}}
    ],
    "solution": "Complete solution code",
    "explanation": "Explanation of solution approach",
    "hints": ["hint1", "hint2"],
    "evaluation_criteria": {{
        "code_patterns": ["pattern1", "pattern2"],
        "must_include": ["concept1", "concept2"],
        "complexity_requirements": "Time and space complexity"
    }}
}}

Make it practical, testable, and relevant to {role}.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert coding interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            question_data = json.loads(content)
            
            # Add metadata
            question_data.update({
                "question_type": QuestionType.CODING,
                "module_number": 2,
                "difficulty": difficulty,
                "language": language,
                "category": "coding",
                "tags": [role.lower(), language.value, "coding"]
            })
            
            logger.info(f"Generated Module 2 coding question: {question_data['title']}")
            return question_data
            
        except Exception as e:
            logger.error(f"Error generating Module 2 question: {str(e)}")
            return self._get_fallback_module_2_question(role, language, difficulty)
    
    def generate_module_3_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Generate Module 3 question - Decision Making
        
        Args:
            role: Job role
            domain: Domain
            difficulty: Question difficulty
        
        Returns:
            Question data dictionary
        """
        prompt = f"""
You are an expert technical interviewer creating a decision-making question.

Role: {role}
Domain: {domain}
Difficulty: {difficulty}

Create a scenario where the candidate must choose between multiple technical approaches.

Generate a JSON response with this exact structure:
{{
    "title": "Brief title",
    "description": "Scenario description",
    "problem_statement": "Technical decision scenario",
    "context": "Background and constraints",
    "options": [
        {{
            "id": "A",
            "title": "Approach A",
            "description": "Detailed description",
            "pros": ["pro1", "pro2"],
            "cons": ["con1", "con2"]
        }},
        {{
            "id": "B",
            "title": "Approach B",
            "description": "Detailed description",
            "pros": ["pro1", "pro2"],
            "cons": ["con1", "con2"]
        }},
        {{
            "id": "C",
            "title": "Approach C",
            "description": "Detailed description",
            "pros": ["pro1", "pro2"],
            "cons": ["con1", "con2"]
        }}
    ],
    "correct_option": "B",
    "explanation": "Why option B is best in this context",
    "evaluation_criteria": {{
        "must_include": ["consideration1", "consideration2"],
        "keywords": ["keyword1", "keyword2"]
    }}
}}

Make it thought-provoking with no obvious answer.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            question_data = json.loads(content)
            
            # Add metadata
            question_data.update({
                "question_type": QuestionType.DECISION_MAKING,
                "module_number": 3,
                "difficulty": difficulty,
                "category": domain,
                "tags": [role.lower(), domain.lower(), "decision_making"]
            })
            
            logger.info(f"Generated Module 3 question: {question_data['title']}")
            return question_data
            
        except Exception as e:
            logger.error(f"Error generating Module 3 question: {str(e)}")
            return self._get_fallback_module_3_question(role, domain, difficulty)
    
    def generate_module_4_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Generate Module 4 question - Explanation
        
        Args:
            role: Job role
            domain: Domain
            difficulty: Question difficulty
        
        Returns:
            Question data dictionary
        """
        prompt = f"""
You are an expert technical interviewer creating an explanation question.

Role: {role}
Domain: {domain}
Difficulty: {difficulty}

Create a scenario where the candidate must explain a technical concept or approach.

Generate a JSON response with this exact structure:
{{
    "title": "Brief title",
    "description": "What needs to be explained",
    "scenario": "Technical scenario or concept",
    "context": "Background information",
    "key_points": ["Expected point 1", "Expected point 2", "Expected point 3"],
    "evaluation_criteria": {{
        "must_include": ["concept1", "concept2", "concept3"],
        "keywords": ["keyword1", "keyword2", "keyword3"],
        "depth_indicators": ["indicator1", "indicator2"]
    }},
    "sample_good_answer": "Example of a good explanation",
    "hints": ["hint1", "hint2"]
}}

Focus on testing deep understanding and communication skills.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert technical interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            question_data = json.loads(content)
            
            # Add metadata
            question_data.update({
                "question_type": QuestionType.EXPLANATION,
                "module_number": 4,
                "difficulty": difficulty,
                "category": domain,
                "tags": [role.lower(), domain.lower(), "explanation"]
            })
            
            logger.info(f"Generated Module 4 question: {question_data['title']}")
            return question_data
            
        except Exception as e:
            logger.error(f"Error generating Module 4 question: {str(e)}")
            return self._get_fallback_module_4_question(role, domain, difficulty)
    
    def generate_module_5_debugging_question(
        self,
        role: str,
        language: ProgrammingLanguage,
        difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    ) -> Dict[str, Any]:
        """
        Generate Module 5 question - Debugging
        
        Args:
            role: Job role
            language: Programming language
            difficulty: Question difficulty
        
        Returns:
            Question data dictionary
        """
        prompt = f"""
You are an expert technical interviewer creating a debugging question.

Role: {role}
Language: {language.value}
Difficulty: {difficulty}

Create a realistic buggy code scenario that the candidate must debug.

Generate a JSON response with this exact structure:
{{
    "title": "Brief title",
    "description": "Problem description",
    "problem_statement": "What the code should do",
    "buggy_code": "Code with subtle bugs",
    "expected_output": "What the correct output should be",
    "actual_output": "What the buggy code produces",
    "bug_description": "Hidden - what bugs exist",
    "bugs": [
        {{
            "type": "logic_error",
            "line": 5,
            "description": "Off-by-one error",
            "fix": "Change < to <="
        }}
    ],
    "solution": "Fixed code",
    "explanation": "Explanation of bugs and fixes",
    "test_cases": [
        {{"input": "test", "expected": "result", "buggy_result": "wrong"}}
    ],
    "evaluation_criteria": {{
        "must_identify": ["bug1", "bug2"],
        "must_fix": ["fix1", "fix2"],
        "keywords": ["keyword1", "keyword2"]
    }}
}}

Include 2-3 subtle bugs (not syntax errors).
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert debugging interviewer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            question_data = json.loads(content)
            
            # Add metadata
            question_data.update({
                "question_type": QuestionType.DEBUGGING,
                "module_number": 5,
                "difficulty": difficulty,
                "language": language,
                "category": "debugging",
                "tags": [role.lower(), language.value, "debugging"]
            })
            
            logger.info(f"Generated Module 5 debugging question: {question_data['title']}")
            return question_data
            
        except Exception as e:
            logger.error(f"Error generating Module 5 question: {str(e)}")
            return self._get_fallback_module_5_question(role, language, difficulty)
    
    # ========================================
    # FALLBACK QUESTIONS (When API fails)
    # ========================================
    
    def _get_fallback_module_1_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel
    ) -> Dict[str, Any]:
        """Fallback Module 1 question"""
        return {
            "title": f"System Design: {domain} Platform",
            "problem_statement": f"You are tasked with designing a {domain} system for a growing startup. The platform needs to handle increasing user traffic and maintain high availability.",
            "context": f"The company currently has 10,000 daily active users and expects 10x growth in 6 months.",
            "scenario": "Design the core architecture and identify key technical challenges.",
            "key_points": [
                "Scalability requirements",
                "Data consistency needs",
                "Performance optimization",
                "Security considerations"
            ],
            "evaluation_criteria": {
                "must_include": ["scalability", "database", "caching"],
                "keywords": ["architecture", "distributed", "microservices"],
                "concepts": ["load balancing", "data modeling", "API design"]
            },
            "question_type": QuestionType.PROBLEM_UNDERSTANDING,
            "module_number": 1,
            "difficulty": difficulty,
            "category": domain,
            "tags": [role.lower(), domain.lower(), "problem_understanding"]
        }
    
    def _get_fallback_module_2_question(
        self,
        role: str,
        language: ProgrammingLanguage,
        difficulty: DifficultyLevel
    ) -> Dict[str, Any]:
        """Fallback Module 2 question"""
        
        # Determine basic syntax based on language
        starter_code = "def find_missing_number(nums):\n    # Your code here\n    pass"
        solution_code = "def find_missing_number(nums):\n    n = len(nums)\n    return (n * (n + 1) // 2) - sum(nums)"
        
        if language == ProgrammingLanguage.JAVA:
            starter_code = "class Solution {\n    public int findMissingNumber(int[] nums) {\n        // Your code here\n        return 0;\n    }\n}"
            solution_code = "class Solution {\n    public int findMissingNumber(int[] nums) {\n        int n = nums.length;\n        int expectedSum = n * (n + 1) / 2;\n        int actualSum = 0;\n        for (int num : nums) actualSum += num;\n        return expectedSum - actualSum;\n    }\n}"
        elif language == ProgrammingLanguage.JAVASCRIPT:
            starter_code = "function findMissingNumber(nums) {\n    // Your code here\n}"
            solution_code = "function findMissingNumber(nums) {\n    const n = nums.length;\n    const expectedSum = n * (n + 1) / 2;\n    const actualSum = nums.reduce((a, b) => a + b, 0);\n    return expectedSum - actualSum;\n}"
            
        return {
            "title": "Array Manipulation: Find Missing Number",
            "description": "Find the missing number in an array",
            "problem_statement": "Given an array containing n distinct numbers in range [0, n], find the missing number.",
            "requirements": [
                "Time complexity: O(n)",
                "Space complexity: O(1)",
                "Handle edge cases"
            ],
            "constraints": ["n == array length", "All numbers are unique"],
            "starter_code": starter_code,
            "test_cases": [
                {"input": "[3, 0, 1]", "expected_output": "2", "explanation": "2 is missing"},
                {"input": "[0, 1]", "expected_output": "2", "explanation": "2 is missing"},
                {"input": "[9,6,4,2,3,5,7,0,1]", "expected_output": "8", "explanation": "8 is missing"}
            ],
            "solution": solution_code,
            "explanation": "Use mathematical formula for sum of n numbers",
            "hints": ["Think about sum of first n natural numbers", "Can you use XOR?"],
            "evaluation_criteria": {
                "code_patterns": ["sum", "loop"],
                "must_include": ["return", "calculation"],
                "complexity_requirements": "O(n) time, O(1) space"
            },
            "question_type": QuestionType.CODING,
            "module_number": 2,
            "difficulty": difficulty,
            "language": language,
            "category": "coding",
            "tags": [role.lower(), language.value, "arrays"]
        }
    
    def _get_fallback_module_3_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel
    ) -> Dict[str, Any]:
        """Fallback Module 3 question"""
        return {
            "title": "Database Choice: SQL vs NoSQL",
            "description": "Choose the right database for a new feature",
            "problem_statement": "Your team is building a real-time analytics dashboard. Choose the best database approach.",
            "context": "High write throughput, read-heavy queries, need for real-time updates",
            "options": [
                {
                    "id": "A",
                    "title": "PostgreSQL with materialized views",
                    "description": "Traditional relational database with caching",
                    "pros": ["ACID compliance", "Complex queries", "Mature ecosystem"],
                    "cons": ["Write scalability", "Real-time refresh overhead"]
                },
                {
                    "id": "B",
                    "title": "MongoDB with aggregation pipeline",
                    "description": "Document database with flexible schema",
                    "pros": ["Horizontal scaling", "Flexible schema", "Fast writes"],
                    "cons": ["No ACID transactions", "Complex aggregations"]
                },
                {
                    "id": "C",
                    "title": "Redis with time-series data",
                    "description": "In-memory database for real-time data",
                    "pros": ["Extremely fast", "Real-time updates", "Pub/sub support"],
                    "cons": ["Memory constraints", "Persistence concerns", "Limited querying"]
                }
            ],
            "correct_option": "C",
            "explanation": "Redis is optimal for real-time analytics with high write throughput",
            "evaluation_criteria": {
                "must_include": ["performance", "scalability", "real-time"],
                "keywords": ["throughput", "latency", "memory"]
            },
            "question_type": QuestionType.DECISION_MAKING,
            "module_number": 3,
            "difficulty": difficulty,
            "category": domain,
            "tags": [role.lower(), domain.lower(), "decision_making"]
        }
    
    def _get_fallback_module_4_question(
        self,
        role: str,
        domain: str,
        difficulty: DifficultyLevel
    ) -> Dict[str, Any]:
        """Fallback Module 4 question"""
        return {
            "title": "Explain: Event-Driven Architecture",
            "description": "Explain event-driven architecture and when to use it",
            "scenario": "Your team is considering migrating from a monolithic to event-driven architecture",
            "context": "Current system has tight coupling between services",
            "key_points": [
                "What is event-driven architecture",
                "Benefits and trade-offs",
                "When to use it",
                "Implementation challenges"
            ],
            "evaluation_criteria": {
                "must_include": ["decoupling", "asynchronous", "message broker"],
                "keywords": ["events", "subscribers", "publishers", "kafka", "rabbitmq"],
                "depth_indicators": ["eventual consistency", "idempotency", "ordering"]
            },
            "sample_good_answer": "Event-driven architecture uses events to trigger and communicate between decoupled services...",
            "hints": ["Think about pub/sub patterns", "Consider scalability benefits"],
            "question_type": QuestionType.EXPLANATION,
            "module_number": 4,
            "difficulty": difficulty,
            "category": domain,
            "tags": [role.lower(), domain.lower(), "explanation"]
        }
    
    def _get_fallback_module_5_question(
        self,
        role: str,
        language: ProgrammingLanguage,
        difficulty: DifficultyLevel
    ) -> Dict[str, Any]:
        """Fallback Module 5 question"""
        
        buggy_code = "def reverse_list(arr):\n    left = 0\n    right = len(arr)\n    while left < right:\n        arr[left], arr[right] = arr[right], arr[left]\n        left += 1\n        right -= 1\n    return arr"
        solution_code = "def reverse_list(arr):\n    left = 0\n    right = len(arr) - 1\n    while left < right:\n        arr[left], arr[right] = arr[right], arr[left]\n        left += 1\n        right -= 1\n    return arr"
        fix_desc = "right = len(arr) - 1"
        
        if language == ProgrammingLanguage.JAVA:
            buggy_code = "class Solution {\n    public void reverseList(int[] arr) {\n        int left = 0;\n        int right = arr.length;\n        while (left < right) {\n            int temp = arr[left];\n            arr[left] = arr[right];\n            arr[right] = temp;\n            left++;\n            right--;\n        }\n    }\n}"
            solution_code = "class Solution {\n    public void reverseList(int[] arr) {\n        int left = 0;\n        int right = arr.length - 1;\n        while (left < right) {\n            int temp = arr[left];\n            arr[left] = arr[right];\n            arr[right] = temp;\n            left++;\n            right--;\n        }\n    }\n}"
            fix_desc = "right = arr.length - 1;"
        elif language == ProgrammingLanguage.JAVASCRIPT:
            buggy_code = "function reverseList(arr) {\n    let left = 0;\n    let right = arr.length;\n    while (left < right) {\n        let temp = arr[left];\n        arr[left] = arr[right];\n        arr[right] = temp;\n        left++;\n        right--;\n    }\n    return arr;\n}"
            solution_code = "function reverseList(arr) {\n    let left = 0;\n    let right = arr.length - 1;\n    while (left < right) {\n        let temp = arr[left];\n        arr[left] = arr[right];\n        arr[right] = temp;\n        left++;\n        right--;\n    }\n    return arr;\n}"
            fix_desc = "let right = arr.length - 1;"
            
        return {
            "title": "Debug: Array Reversal Bug",
            "description": "Fix the bugs in this array reversal function",
            "problem_statement": "The function should reverse an array in-place but has bugs",
            "buggy_code": buggy_code,
            "expected_output": "For input [1,2,3,4,5], output should be [5,4,3,2,1]",
            "actual_output": "Index out of bounds error",
            "bug_description": "Off-by-one error in right pointer initialization",
            "bugs": [
                {
                    "type": "logic_error",
                    "line": 3,
                    "description": "right pointer initialized out of bounds",
                    "fix": fix_desc
                }
            ],
            "solution": solution_code,
            "explanation": "The right pointer was initialized to the array length which is out of bounds",
            "test_cases": [
                {"input": "[1,2,3,4,5]", "expected": "[5,4,3,2,1]", "buggy_result": "Error"}
            ],
            "evaluation_criteria": {
                "must_identify": ["off-by-one error", "out of bounds"],
                "must_fix": [fix_desc],
                "keywords": ["pointer", "bounds", "index"]
            },
            "question_type": QuestionType.DEBUGGING,
            "module_number": 5,
            "difficulty": difficulty,
            "language": language,
            "category": "debugging",
            "tags": [role.lower(), language.value, "debugging"]
        }


# Singleton instance
question_generator = QuestionGenerator()