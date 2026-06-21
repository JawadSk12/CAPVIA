"""
Bug Injector
Intelligently injects bugs into working code for debugging questions
"""

from typing import List, Dict, Any, Tuple
import random
import re
from app.models.question import ProgrammingLanguage


class BugInjector:
    """
    Injects realistic bugs into code
    Creates debugging challenges
    """
    
    def __init__(self):
        """Initialize bug patterns"""
        self.python_bug_patterns = [
            self._off_by_one_error,
            self._wrong_operator,
            self._variable_naming_error,
            self._logic_reversal,
            self._missing_base_case,
            self._wrong_comparison,
            self._index_error,
            self._type_coercion_bug,
        ]
        
        self.javascript_bug_patterns = [
            self._js_equality_bug,
            self._js_scope_bug,
            self._js_async_bug,
            self._js_null_check_bug,
        ]
    
    def inject_bugs(
        self,
        code: str,
        language: ProgrammingLanguage,
        num_bugs: int = 2
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """
        Inject bugs into working code
        
        Args:
            code: Working code
            language: Programming language
            num_bugs: Number of bugs to inject
        
        Returns:
            Tuple of (buggy_code, bug_descriptions)
        """
        if language == ProgrammingLanguage.PYTHON:
            return self._inject_python_bugs(code, num_bugs)
        elif language == ProgrammingLanguage.JAVASCRIPT:
            return self._inject_javascript_bugs(code, num_bugs)
        else:
            return code, []
    
    def _inject_python_bugs(
        self,
        code: str,
        num_bugs: int
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Inject Python-specific bugs"""
        buggy_code = code
        bugs_injected = []
        
        # Select random bug patterns
        patterns = random.sample(
            self.python_bug_patterns,
            min(num_bugs, len(self.python_bug_patterns))
        )
        
        for pattern in patterns:
            buggy_code, bug_info = pattern(buggy_code)
            if bug_info:
                bugs_injected.append(bug_info)
        
        return buggy_code, bugs_injected
    
    def _inject_javascript_bugs(
        self,
        code: str,
        num_bugs: int
    ) -> Tuple[str, List[Dict[str, Any]]]:
        """Inject JavaScript-specific bugs"""
        buggy_code = code
        bugs_injected = []
        
        patterns = random.sample(
            self.javascript_bug_patterns,
            min(num_bugs, len(self.javascript_bug_patterns))
        )
        
        for pattern in patterns:
            buggy_code, bug_info = pattern(buggy_code)
            if bug_info:
                bugs_injected.append(bug_info)
        
        return buggy_code, bugs_injected
    
    # ========================================
    # PYTHON BUG PATTERNS
    # ========================================
    
    def _off_by_one_error(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Inject off-by-one error"""
        # Change range(n) to range(n+1) or vice versa
        pattern = r'range\((\w+)\)'
        matches = list(re.finditer(pattern, code))
        
        if matches:
            match = random.choice(matches)
            var = match.group(1)
            
            # Randomly add or subtract 1
            if random.choice([True, False]):
                new_range = f'range({var} + 1)'
            else:
                new_range = f'range({var} - 1)'
            
            buggy_code = code[:match.start()] + new_range + code[match.end():]
            
            return buggy_code, {
                "type": "off_by_one_error",
                "description": "Loop boundary incorrect",
                "original": match.group(0),
                "buggy": new_range,
                "fix": f"Change back to range({var})"
            }
        
        return code, None
    
    def _wrong_operator(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Change comparison operator"""
        operators = {
            '<': '<=',
            '<=': '<',
            '>': '>=',
            '>=': '>',
            '==': '!=',
            '!=': '=='
        }
        
        for original, buggy in operators.items():
            if original in code:
                buggy_code = code.replace(original, buggy, 1)
                return buggy_code, {
                    "type": "wrong_operator",
                    "description": f"Changed {original} to {buggy}",
                    "original": original,
                    "buggy": buggy,
                    "fix": f"Change {buggy} back to {original}"
                }
        
        return code, None
    
    def _variable_naming_error(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Use wrong variable name"""
        # Find variable assignments
        pattern = r'(\w+)\s*='
        matches = list(re.finditer(pattern, code))
        
        if len(matches) >= 2:
            # Pick two variables and swap one usage
            var1 = matches[0].group(1)
            var2 = matches[1].group(1)
            
            # Find usage of var1 and replace with var2
            usage_pattern = rf'\b{var1}\b'
            usage_matches = list(re.finditer(usage_pattern, code))
            
            if len(usage_matches) > 1:
                # Replace one usage (not the definition)
                match = usage_matches[1]
                buggy_code = code[:match.start()] + var2 + code[match.end():]
                
                return buggy_code, {
                    "type": "variable_naming_error",
                    "description": f"Used {var2} instead of {var1}",
                    "original": var1,
                    "buggy": var2,
                    "fix": f"Change {var2} back to {var1}"
                }
        
        return code, None
    
    def _logic_reversal(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Reverse logic condition"""
        # Find if statements
        pattern = r'if\s+(.+?):'
        matches = list(re.finditer(pattern, code))
        
        if matches:
            match = random.choice(matches)
            condition = match.group(1)
            
            # Add 'not' to reverse logic
            if 'not' not in condition:
                new_condition = f'not ({condition})'
                buggy_code = code[:match.start(1)] + new_condition + code[match.end(1):]
                
                return buggy_code, {
                    "type": "logic_reversal",
                    "description": "Reversed boolean condition",
                    "original": condition,
                    "buggy": new_condition,
                    "fix": "Remove 'not' from condition"
                }
        
        return code, None
    
    def _missing_base_case(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Remove base case from recursion"""
        # Find return statements
        pattern = r'if .+?:\s*return .+?\n'
        match = re.search(pattern, code)
        
        if match:
            buggy_code = code.replace(match.group(0), '', 1)
            return buggy_code, {
                "type": "missing_base_case",
                "description": "Removed recursion base case",
                "original": match.group(0).strip(),
                "buggy": "(removed)",
                "fix": "Add back the base case condition"
            }
        
        return code, None
    
    def _wrong_comparison(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Change comparison to assignment"""
        pattern = r'if\s+(\w+)\s*==\s*(\w+)'
        match = re.search(pattern, code)
        
        if match:
            var1 = match.group(1)
            var2 = match.group(2)
            buggy_version = f'if {var1} = {var2}'
            
            buggy_code = code[:match.start()] + buggy_version + code[match.end():]
            
            return buggy_code, {
                "type": "wrong_comparison",
                "description": "Used assignment (=) instead of comparison (==)",
                "original": f'{var1} == {var2}',
                "buggy": f'{var1} = {var2}',
                "fix": "Change = to =="
            }
        
        return code, None
    
    def _index_error(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Create index out of bounds"""
        pattern = r'(\w+)\[(\w+)\s*-\s*1\]'
        match = re.search(pattern, code)
        
        if match:
            arr = match.group(1)
            var = match.group(2)
            buggy_version = f'{arr}[{var}]'
            
            buggy_code = code[:match.start()] + buggy_version + code[match.end():]
            
            return buggy_code, {
                "type": "index_error",
                "description": "Index out of bounds - missing -1",
                "original": f'{arr}[{var} - 1]',
                "buggy": f'{arr}[{var}]',
                "fix": f"Change to {arr}[{var} - 1]"
            }
        
        return code, None
    
    def _type_coercion_bug(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Create type coercion issue"""
        pattern = r'int\((.+?)\)'
        match = re.search(pattern, code)
        
        if match:
            value = match.group(1)
            buggy_version = f'str({value})'
            
            buggy_code = code[:match.start()] + buggy_version + code[match.end():]
            
            return buggy_code, {
                "type": "type_coercion",
                "description": "Wrong type conversion - str instead of int",
                "original": f'int({value})',
                "buggy": f'str({value})',
                "fix": f"Change str() back to int()"
            }
        
        return code, None
    
    # ========================================
    # JAVASCRIPT BUG PATTERNS
    # ========================================
    
    def _js_equality_bug(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Change === to =="""
        if '===' in code:
            buggy_code = code.replace('===', '==', 1)
            return buggy_code, {
                "type": "equality_bug",
                "description": "Used == instead of ===",
                "original": "===",
                "buggy": "==",
                "fix": "Change == to === for strict equality"
            }
        return code, None
    
    def _js_scope_bug(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Change let/const to var"""
        pattern = r'\blet\s+(\w+)'
        match = re.search(pattern, code)
        
        if match:
            var_name = match.group(1)
            buggy_code = code.replace(f'let {var_name}', f'var {var_name}', 1)
            
            return buggy_code, {
                "type": "scope_bug",
                "description": "Used var instead of let (scope issue)",
                "original": f'let {var_name}',
                "buggy": f'var {var_name}',
                "fix": "Change var to let for block scope"
            }
        
        return code, None
    
    def _js_async_bug(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Missing await keyword"""
        pattern = r'await\s+(\w+)\('
        match = re.search(pattern, code)
        
        if match:
            func = match.group(1)
            buggy_version = f'{func}('
            buggy_code = code.replace(match.group(0), buggy_version, 1)
            
            return buggy_code, {
                "type": "async_bug",
                "description": "Missing await keyword",
                "original": f'await {func}(',
                "buggy": f'{func}(',
                "fix": "Add await keyword before async function"
            }
        
        return code, None
    
    def _js_null_check_bug(self, code: str) -> Tuple[str, Dict[str, Any]]:
        """Remove null check"""
        pattern = r'if\s*\((.+?)\s*!==?\s*null\)'
        match = re.search(pattern, code)
        
        if match:
            var = match.group(1).strip()
            buggy_version = f'if ({var})'
            buggy_code = code[:match.start()] + buggy_version + code[match.end():]
            
            return buggy_code, {
                "type": "null_check_bug",
                "description": "Removed explicit null check",
                "original": match.group(0),
                "buggy": buggy_version,
                "fix": "Add explicit null check"
            }
        
        return code, None


# Singleton instance
bug_injector = BugInjector()