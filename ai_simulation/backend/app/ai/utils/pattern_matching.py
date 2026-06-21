"""
Pattern Matching Utilities
Detects patterns in code and text for evaluation
"""

import re
from typing import List, Dict, Any, Optional, Set
from loguru import logger


class PatternMatcher:
    """
    Matches patterns in code and text
    Used for code quality analysis and answer validation
    """
    
    def __init__(self):
        """Initialize pattern matcher"""
        self.python_patterns = self._init_python_patterns()
        self.javascript_patterns = self._init_javascript_patterns()
        self.java_patterns = self._init_java_patterns()
    
    def detect_code_patterns(
        self,
        code: str,
        language: str,
        pattern_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Detect code patterns in given language
        
        Args:
            code: Code to analyze
            language: Programming language
            pattern_types: Specific patterns to look for
        
        Returns:
            Dictionary of detected patterns
        """
        if language.lower() == "python":
            return self._detect_python_patterns(code, pattern_types)
        elif language.lower() == "javascript":
            return self._detect_javascript_patterns(code, pattern_types)
        elif language.lower() == "java":
            return self._detect_java_patterns(code, pattern_types)
        else:
            return {}
    
    def _detect_python_patterns(
        self,
        code: str,
        pattern_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Detect Python-specific patterns"""
        results = {
            "language": "python",
            "patterns_found": [],
            "quality_indicators": {},
            "complexity_indicators": {}
        }
        
        patterns = self.python_patterns
        
        # Control structures
        if re.search(r'\bfor\b', code):
            results["patterns_found"].append("for_loop")
        if re.search(r'\bwhile\b', code):
            results["patterns_found"].append("while_loop")
        if re.search(r'\bif\b', code):
            results["patterns_found"].append("conditional")
        
        # Data structures
        if re.search(r'\[.*\]', code):
            results["patterns_found"].append("list_usage")
        if re.search(r'\{.*\}', code):
            results["patterns_found"].append("dict_usage")
        if re.search(r'\bset\(', code):
            results["patterns_found"].append("set_usage")
        
        # Functions
        if re.search(r'def\s+\w+\s*\(', code):
            results["patterns_found"].append("function_definition")
            # Count functions
            func_count = len(re.findall(r'def\s+\w+\s*\(', code))
            results["quality_indicators"]["function_count"] = func_count
        
        # List comprehensions (good practice)
        if re.search(r'\[.+\s+for\s+.+\s+in\s+.+\]', code):
            results["patterns_found"].append("list_comprehension")
            results["quality_indicators"]["uses_comprehension"] = True
        
        # Error handling
        if re.search(r'\btry\b', code):
            results["patterns_found"].append("error_handling")
            results["quality_indicators"]["has_error_handling"] = True
        
        # Type hints (good practice)
        if re.search(r'->\s*\w+', code) or re.search(r':\s*\w+\s*=', code):
            results["patterns_found"].append("type_hints")
            results["quality_indicators"]["uses_type_hints"] = True
        
        # Docstrings
        if re.search(r'""".*?"""', code, re.DOTALL) or re.search(r"'''.*?'''", code, re.DOTALL):
            results["patterns_found"].append("docstring")
            results["quality_indicators"]["has_documentation"] = True
        
        # Complexity indicators
        # Nested loops (increases complexity)
        nested_loops = len(re.findall(r'for.*:\s*\n\s+.*for', code))
        if nested_loops > 0:
            results["complexity_indicators"]["nested_loops"] = nested_loops
        
        # Deep nesting
        max_indent = self._calculate_max_indentation(code)
        results["complexity_indicators"]["max_nesting_level"] = max_indent // 4
        
        return results
    
    def _detect_javascript_patterns(
        self,
        code: str,
        pattern_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Detect JavaScript-specific patterns"""
        results = {
            "language": "javascript",
            "patterns_found": [],
            "quality_indicators": {},
            "complexity_indicators": {}
        }
        
        # Modern JS features
        if re.search(r'\bconst\b', code):
            results["patterns_found"].append("const_usage")
            results["quality_indicators"]["uses_const"] = True
        if re.search(r'\blet\b', code):
            results["patterns_found"].append("let_usage")
            results["quality_indicators"]["uses_let"] = True
        
        # Arrow functions (modern)
        if re.search(r'=>', code):
            results["patterns_found"].append("arrow_function")
            results["quality_indicators"]["uses_arrow_functions"] = True
        
        # Array methods (good practice)
        array_methods = ['map', 'filter', 'reduce', 'forEach', 'find', 'some', 'every']
        for method in array_methods:
            if re.search(rf'\.{method}\(', code):
                results["patterns_found"].append(f"array_{method}")
        
        # Async/await
        if re.search(r'\basync\b', code) or re.search(r'\bawait\b', code):
            results["patterns_found"].append("async_await")
            results["quality_indicators"]["uses_async"] = True
        
        # Destructuring
        if re.search(r'\{.*\}\s*=', code) or re.search(r'\[.*\]\s*=', code):
            results["patterns_found"].append("destructuring")
            results["quality_indicators"]["uses_destructuring"] = True
        
        # Template literals
        if re.search(r'`.*\${.*}.*`', code):
            results["patterns_found"].append("template_literals")
            results["quality_indicators"]["uses_template_literals"] = True
        
        # Error handling
        if re.search(r'\btry\b', code):
            results["patterns_found"].append("error_handling")
            results["quality_indicators"]["has_error_handling"] = True
        
        # Strict mode
        if re.search(r"'use strict'", code) or re.search(r'"use strict"', code):
            results["patterns_found"].append("strict_mode")
            results["quality_indicators"]["uses_strict_mode"] = True
        
        return results
    
    def _detect_java_patterns(
        self,
        code: str,
        pattern_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Detect Java-specific patterns"""
        results = {
            "language": "java",
            "patterns_found": [],
            "quality_indicators": {},
            "complexity_indicators": {}
        }
        
        # OOP features
        if re.search(r'\bclass\b', code):
            results["patterns_found"].append("class_definition")
        if re.search(r'\binterface\b', code):
            results["patterns_found"].append("interface_definition")
            results["quality_indicators"]["uses_interfaces"] = True
        if re.search(r'\bextends\b', code):
            results["patterns_found"].append("inheritance")
        if re.search(r'\bimplements\b', code):
            results["patterns_found"].append("interface_implementation")
        
        # Access modifiers
        if re.search(r'\bprivate\b', code):
            results["patterns_found"].append("private_members")
            results["quality_indicators"]["uses_encapsulation"] = True
        if re.search(r'\bpublic\b', code):
            results["patterns_found"].append("public_members")
        if re.search(r'\bprotected\b', code):
            results["patterns_found"].append("protected_members")
        
        # Collections
        if re.search(r'\bArrayList\b|\bList\b', code):
            results["patterns_found"].append("list_usage")
        if re.search(r'\bHashMap\b|\bMap\b', code):
            results["patterns_found"].append("map_usage")
        if re.search(r'\bHashSet\b|\bSet\b', code):
            results["patterns_found"].append("set_usage")
        
        # Streams (modern Java)
        if re.search(r'\.stream\(\)', code):
            results["patterns_found"].append("stream_api")
            results["quality_indicators"]["uses_streams"] = True
        
        # Exception handling
        if re.search(r'\btry\b', code):
            results["patterns_found"].append("exception_handling")
            results["quality_indicators"]["has_exception_handling"] = True
        
        # Generics
        if re.search(r'<\w+>', code):
            results["patterns_found"].append("generics")
            results["quality_indicators"]["uses_generics"] = True
        
        return results
    
    def detect_algorithm_patterns(self, code: str) -> List[str]:
        """
        Detect common algorithm patterns
        
        Args:
            code: Code to analyze
        
        Returns:
            List of detected algorithm patterns
        """
        patterns = []
        
        # Two pointers
        if re.search(r'left.*right', code) and re.search(r'while.*left.*<.*right', code):
            patterns.append("two_pointers")
        
        # Sliding window
        if re.search(r'window', code, re.IGNORECASE):
            patterns.append("sliding_window")
        
        # Dynamic programming (memoization)
        if re.search(r'memo|dp|cache', code, re.IGNORECASE):
            patterns.append("dynamic_programming")
        
        # Binary search
        if re.search(r'binary.*search|mid.*=.*(left.*\+.*right)|while.*left.*<=.*right', code, re.IGNORECASE):
            patterns.append("binary_search")
        
        # BFS (Breadth-First Search)
        if re.search(r'queue|deque', code, re.IGNORECASE) and re.search(r'while.*queue', code):
            patterns.append("bfs")
        
        # DFS (Depth-First Search)
        if re.search(r'stack|recursion|dfs', code, re.IGNORECASE):
            patterns.append("dfs")
        
        # Sorting
        if re.search(r'sort|sorted', code, re.IGNORECASE):
            patterns.append("sorting")
        
        # Hash table
        if re.search(r'hash|dict|map|set', code, re.IGNORECASE):
            patterns.append("hash_table")
        
        return patterns
    
    def calculate_code_complexity(self, code: str) -> Dict[str, Any]:
        """
        Calculate code complexity metrics
        
        Args:
            code: Code to analyze
        
        Returns:
            Dictionary of complexity metrics
        """
        metrics = {
            "lines_of_code": len(code.split('\n')),
            "cyclomatic_complexity": self._calculate_cyclomatic_complexity(code),
            "max_nesting_depth": self._calculate_max_indentation(code) // 4,
            "number_of_functions": len(re.findall(r'def\s+\w+|function\s+\w+', code)),
            "number_of_loops": len(re.findall(r'\bfor\b|\bwhile\b', code)),
            "number_of_conditions": len(re.findall(r'\bif\b', code))
        }
        
        return metrics
    
    def _calculate_cyclomatic_complexity(self, code: str) -> int:
        """
        Calculate cyclomatic complexity (simplified)
        
        Args:
            code: Code to analyze
        
        Returns:
            Complexity score
        """
        # Start with 1
        complexity = 1
        
        # Add 1 for each decision point
        decision_points = [
            r'\bif\b',
            r'\belse\b',
            r'\belif\b',
            r'\bfor\b',
            r'\bwhile\b',
            r'\bcase\b',
            r'\bcatch\b',
            r'\band\b',
            r'\bor\b',
            r'\?',  # Ternary operator
        ]
        
        for pattern in decision_points:
            complexity += len(re.findall(pattern, code))
        
        return complexity
    
    def _calculate_max_indentation(self, code: str) -> int:
        """
        Calculate maximum indentation level
        
        Args:
            code: Code to analyze
        
        Returns:
            Maximum indentation in spaces
        """
        max_indent = 0
        
        for line in code.split('\n'):
            # Count leading spaces
            indent = len(line) - len(line.lstrip())
            max_indent = max(max_indent, indent)
        
        return max_indent
    
    def _init_python_patterns(self) -> Dict[str, str]:
        """Initialize Python pattern regex"""
        return {
            "function": r'def\s+\w+\s*\(',
            "class": r'class\s+\w+',
            "import": r'import\s+\w+|from\s+\w+\s+import',
            "list_comp": r'\[.+\s+for\s+.+\s+in\s+.+\]',
            "dict_comp": r'\{.+:\s*.+\s+for\s+.+\s+in\s+.+\}',
            "generator": r'\(.+\s+for\s+.+\s+in\s+.+\)',
            "lambda": r'lambda\s+.*:',
            "decorator": r'@\w+',
        }
    
    def _init_javascript_patterns(self) -> Dict[str, str]:
        """Initialize JavaScript pattern regex"""
        return {
            "function": r'function\s+\w+\s*\(',
            "arrow_function": r'\w+\s*=\s*\(.*\)\s*=>',
            "class": r'class\s+\w+',
            "const": r'const\s+\w+',
            "let": r'let\s+\w+',
            "async": r'async\s+function',
            "promise": r'new\s+Promise',
            "spread": r'\.\.\.\w+',
        }
    
    def _init_java_patterns(self) -> Dict[str, str]:
        """Initialize Java pattern regex"""
        return {
            "class": r'class\s+\w+',
            "interface": r'interface\s+\w+',
            "method": r'(public|private|protected)\s+\w+\s+\w+\s*\(',
            "constructor": r'public\s+\w+\s*\(',
            "generic": r'<\w+>',
            "annotation": r'@\w+',
        }


# Singleton instance
pattern_matcher = PatternMatcher()