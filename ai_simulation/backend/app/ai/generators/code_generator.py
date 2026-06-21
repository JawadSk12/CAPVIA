"""
Code Generator
Generates starter code, test cases, and solutions for coding questions
"""

from typing import Dict, Any, List, Optional
import openai
from loguru import logger
from app.core.config import settings
from app.models.question import ProgrammingLanguage
import json


class CodeGenerator:
    """
    AI-powered code generation for questions
    Creates starter templates, test cases, and reference solutions
    """
    
    def __init__(self):
        """Initialize OpenAI client"""
        openai.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
    
    def generate_starter_code(
        self,
        problem_description: str,
        language: ProgrammingLanguage,
        function_name: str = "solution"
    ) -> str:
        """
        Generate starter code template
        
        Args:
            problem_description: Description of the problem
            language: Programming language
            function_name: Name of the function
        
        Returns:
            Starter code template
        """
        prompt = f"""
Generate a starter code template for this problem:

Problem: {problem_description}
Language: {language.value}
Function name: {function_name}

Requirements:
- Include function signature with type hints (if applicable)
- Add docstring explaining parameters and return value
- Include TODO comments for implementation
- Keep it minimal - just the skeleton

Return ONLY the code, no explanations.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert programmer. Generate clean, minimal starter code."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            code = response.choices[0].message.content.strip()
            
            # Remove markdown code blocks if present
            if "```" in code:
                code = code.split("```")[1]
                if code.startswith(language.value):
                    code = code[len(language.value):].strip()
                code = code.strip()
            
            logger.info(f"Generated starter code for {language.value}")
            return code
            
        except Exception as e:
            logger.error(f"Error generating starter code: {str(e)}")
            return self._get_default_starter_code(language, function_name)
    
    def generate_test_cases(
        self,
        problem_description: str,
        language: ProgrammingLanguage,
        num_cases: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Generate comprehensive test cases
        
        Args:
            problem_description: Description of the problem
            language: Programming language
            num_cases: Number of test cases to generate
        
        Returns:
            List of test case dictionaries
        """
        prompt = f"""
Generate {num_cases} comprehensive test cases for this problem:

Problem: {problem_description}
Language: {language.value}

Include:
- Edge cases (empty input, single element, etc.)
- Normal cases
- Large input cases
- Corner cases

Return a JSON array with this structure:
[
    {{
        "input": "test input as string",
        "expected_output": "expected result as string",
        "explanation": "why this test case is important",
        "type": "edge_case" | "normal" | "large" | "corner"
    }}
]

Return ONLY valid JSON, nothing else.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert test case designer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            test_cases = json.loads(content)
            logger.info(f"Generated {len(test_cases)} test cases")
            return test_cases
            
        except Exception as e:
            logger.error(f"Error generating test cases: {str(e)}")
            return self._get_default_test_cases()
    
    def generate_solution(
        self,
        problem_description: str,
        language: ProgrammingLanguage,
        function_name: str = "solution",
        include_comments: bool = True
    ) -> str:
        """
        Generate complete solution with optimal approach
        
        Args:
            problem_description: Description of the problem
            language: Programming language
            function_name: Name of the function
            include_comments: Whether to include explanatory comments
        
        Returns:
            Complete solution code
        """
        prompt = f"""
Generate an optimal solution for this problem:

Problem: {problem_description}
Language: {language.value}
Function name: {function_name}

Requirements:
- Use the most efficient algorithm
- Include time/space complexity in comments
- {'Add explanatory comments' if include_comments else 'Minimal comments'}
- Follow best practices for {language.value}
- Handle edge cases

Return ONLY the code, no explanations before or after.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert competitive programmer."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            code = response.choices[0].message.content.strip()
            
            # Clean up markdown
            if "```" in code:
                code = code.split("```")[1]
                if code.startswith(language.value):
                    code = code[len(language.value):].strip()
                code = code.strip()
            
            logger.info(f"Generated solution for {language.value}")
            return code
            
        except Exception as e:
            logger.error(f"Error generating solution: {str(e)}")
            return "# Solution generation failed\npass"
    
    def generate_explanation(
        self,
        problem_description: str,
        solution_code: str,
        language: ProgrammingLanguage
    ) -> str:
        """
        Generate detailed explanation of solution approach
        
        Args:
            problem_description: Description of the problem
            solution_code: The solution code
            language: Programming language
        
        Returns:
            Detailed explanation text
        """
        prompt = f"""
Explain this solution in detail:

Problem: {problem_description}

Solution:
```{language.value}{solution_code}

Provide:
1. Overall approach and intuition
2. Step-by-step walkthrough
3. Time complexity analysis
4. Space complexity analysis
5. Why this approach is optimal

Keep it clear and educational.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an expert algorithm teacher."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=1000
            )
            
            explanation = response.choices[0].message.content.strip()
            logger.info("Generated solution explanation")
            return explanation
            
        except Exception as e:
            logger.error(f"Error generating explanation: {str(e)}")
            return "Explanation generation failed."
    
    def generate_hints(
        self,
        problem_description: str,
        num_hints: int = 3
    ) -> List[str]:
        """
        Generate progressive hints for the problem
        
        Args:
            problem_description: Description of the problem
            num_hints: Number of hints to generate
        
        Returns:
            List of hints (from subtle to obvious)
        """
        prompt = f"""
Generate {num_hints} progressive hints for this problem:

Problem: {problem_description}

Requirements:
- Start with subtle hints
- Progressively reveal more
- Don't give away the complete solution
- Each hint should build on the previous

Return a JSON array of strings:
["hint1", "hint2", "hint3"]

Return ONLY valid JSON.
"""
        
        try:
            response = openai.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a helpful coding mentor."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.6,
                max_tokens=500
            )
            
            content = response.choices[0].message.content.strip()
            
            # Extract JSON
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()
            
            hints = json.loads(content)
            logger.info(f"Generated {len(hints)} hints")
            return hints
            
        except Exception as e:
            logger.error(f"Error generating hints: {str(e)}")
            return [
                "Think about the time complexity you need",
                "Consider using a data structure to optimize lookups",
                "A two-pointer approach might work here"
            ]
    
    def validate_code_syntax(
        self,
        code: str,
        language: ProgrammingLanguage
    ) -> Dict[str, Any]:
        """
        Validate code syntax
        
        Args:
            code: Code to validate
            language: Programming language
        
        Returns:
            Validation result dictionary
        """
        if language == ProgrammingLanguage.PYTHON:
            return self._validate_python_syntax(code)
        elif language == ProgrammingLanguage.JAVASCRIPT:
            return self._validate_javascript_syntax(code)
        else:
            return {"valid": True, "errors": []}
    
    def _validate_python_syntax(self, code: str) -> Dict[str, Any]:
        """Validate Python syntax"""
        import ast
        try:
            ast.parse(code)
            return {"valid": True, "errors": []}
        except SyntaxError as e:
            return {
                "valid": False,
                "errors": [{
                    "line": e.lineno,
                    "message": str(e.msg),
                    "type": "SyntaxError"
                }]
            }
    
    def _validate_javascript_syntax(self, code: str) -> Dict[str, Any]:
        """Validate JavaScript syntax (basic check)"""
        # Basic validation - in production, use a proper JS parser
        common_errors = []
        
        # Check for basic syntax issues
        if code.count('{') != code.count('}'):
            common_errors.append({"message": "Mismatched braces", "type": "SyntaxError"})
        if code.count('(') != code.count(')'):
            common_errors.append({"message": "Mismatched parentheses", "type": "SyntaxError"})
        if code.count('[') != code.count(']'):
            common_errors.append({"message": "Mismatched brackets", "type": "SyntaxError"})
        
        return {
            "valid": len(common_errors) == 0,
            "errors": common_errors
        }
    
    # ========================================
    # DEFAULT/FALLBACK CODE
    # ========================================
    
    def _get_default_starter_code(
        self,
        language: ProgrammingLanguage,
        function_name: str
    ) -> str:
        """Get default starter code template"""
        if language == ProgrammingLanguage.PYTHON:
            return f"""def {function_name}(nums):
    \"\"\"
    TODO: Implement your solution here
    
    Args:
        nums: Input parameter
    
    Returns:
        Result
    \"\"\"
    pass
"""
        elif language == ProgrammingLanguage.JAVASCRIPT:
            return f"""function {function_name}(nums) {{
    /**
     * TODO: Implement your solution here
     * @param {{Array}} nums - Input parameter
     * @returns Result
     */
    
}}
"""
        else:
            return "// Starter code"
    
    def _get_default_test_cases(self) -> List[Dict[str, Any]]:
        """Get default test cases"""
        return [
            {
                "input": "[1, 2, 3]",
                "expected_output": "6",
                "explanation": "Sum of array",
                "type": "normal"
            },
            {
                "input": "[]",
                "expected_output": "0",
                "explanation": "Empty array edge case",
                "type": "edge_case"
            }
        ]


# Singleton instance
code_generator = CodeGenerator()