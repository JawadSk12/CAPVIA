"""
Code Security Validator
========================
Validates code for security issues before execution.

Detects:
- File system access
- Network operations
- Process spawning
- Dangerous imports
- Code obfuscation
- System calls

Author: AI Simulation Engine
Version: 1.0.0
"""

import re
import ast
import logging
from typing import List, Dict, Pattern
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class SecurityPattern:
    """Security pattern definition"""
    pattern: str
    message: str
    severity: str  # 'high', 'medium', 'low'
    category: str  # 'file', 'network', 'process', 'code_exec'


class CodeSecurityValidator:
    """
    Validates code for security vulnerabilities.
    
    This class performs static analysis to detect:
    - Dangerous function calls
    - Suspicious imports
    - Obfuscation attempts
    - Resource abuse patterns
    """
    
    # Dangerous patterns for Python
    PYTHON_PATTERNS = [
        SecurityPattern(
            pattern=r'\bopen\s*\(',
            message="File system access detected (open)",
            severity="high",
            category="file"
        ),
        SecurityPattern(
            pattern=r'\bfile\s*\(',
            message="File system access detected (file)",
            severity="high",
            category="file"
        ),
        SecurityPattern(
            pattern=r'os\.(system|popen|spawn|exec)',
            message="System command execution detected",
            severity="high",
            category="process"
        ),
        SecurityPattern(
            pattern=r'subprocess\.',
            message="Subprocess execution detected",
            severity="high",
            category="process"
        ),
        SecurityPattern(
            pattern=r'\beval\s*\(',
            message="eval() usage detected",
            severity="high",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'\bexec\s*\(',
            message="exec() usage detected",
            severity="high",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'\b__import__\s*\(',
            message="Dynamic import detected",
            severity="high",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'socket\.',
            message="Network socket usage detected",
            severity="high",
            category="network"
        ),
        SecurityPattern(
            pattern=r'urllib\.',
            message="Network request library detected",
            severity="medium",
            category="network"
        ),
        SecurityPattern(
            pattern=r'requests\.',
            message="HTTP library usage detected",
            severity="medium",
            category="network"
        ),
        SecurityPattern(
            pattern=r'compile\s*\(',
            message="Code compilation detected",
            severity="medium",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'globals\s*\(\)',
            message="globals() access detected",
            severity="medium",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'locals\s*\(\)',
            message="locals() access detected",
            severity="medium",
            category="code_exec"
        ),
    ]
    
    # Dangerous JavaScript patterns
    JAVASCRIPT_PATTERNS = [
        SecurityPattern(
            pattern=r'require\s*\(\s*[\'"]fs[\'"]\s*\)',
            message="File system module detected",
            severity="high",
            category="file"
        ),
        SecurityPattern(
            pattern=r'require\s*\(\s*[\'"]child_process[\'"]\s*\)',
            message="Child process module detected",
            severity="high",
            category="process"
        ),
        SecurityPattern(
            pattern=r'\beval\s*\(',
            message="eval() usage detected",
            severity="high",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'Function\s*\(',
            message="Function constructor detected",
            severity="high",
            category="code_exec"
        ),
        SecurityPattern(
            pattern=r'require\s*\(\s*[\'"]net[\'"]\s*\)',
            message="Network module detected",
            severity="high",
            category="network"
        ),
        SecurityPattern(
            pattern=r'require\s*\(\s*[\'"]http[\'"]\s*\)',
            message="HTTP module detected",
            severity="medium",
            category="network"
        ),
    ]
    
    # Dangerous Java patterns
    JAVA_PATTERNS = [
        SecurityPattern(
            pattern=r'Runtime\.getRuntime\(\)',
            message="Runtime execution detected",
            severity="high",
            category="process"
        ),
        SecurityPattern(
            pattern=r'ProcessBuilder',
            message="Process builder detected",
            severity="high",
            category="process"
        ),
        SecurityPattern(
            pattern=r'FileInputStream|FileOutputStream|FileWriter|FileReader',
            message="File I/O detected",
            severity="high",
            category="file"
        ),
        SecurityPattern(
            pattern=r'Socket|ServerSocket',
            message="Network socket detected",
            severity="high",
            category="network"
        ),
        SecurityPattern(
            pattern=r'Class\.forName',
            message="Dynamic class loading detected",
            severity="medium",
            category="code_exec"
        ),
    ]
    
    def __init__(self):
        """Initialize security validator"""
        self.pattern_cache: Dict[str, List[Pattern]] = {}
        logger.info("CodeSecurityValidator initialized")
    
    async def contains_pattern(
        self,
        code: str,
        pattern: str,
        flags: int = re.IGNORECASE
    ) -> bool:
        """
        Check if code contains a regex pattern.
        
        Args:
            code: Source code to check
            pattern: Regex pattern to search for
            flags: Regex flags
            
        Returns:
            True if pattern found, False otherwise
        """
        try:
            compiled_pattern = re.compile(pattern, flags)
            return bool(compiled_pattern.search(code))
        except re.error as e:
            logger.error(f"Invalid regex pattern: {pattern}, error: {e}")
            return False
    
    async def is_obfuscated(self, code: str) -> bool:
        """
        Detect if code appears to be obfuscated.
        
        Heuristics:
        - Excessive use of single-letter variables
        - Very long variable names
        - Base64 encoded strings
        - Hex encoded strings
        - Excessive nesting
        
        Args:
            code: Source code to check
            
        Returns:
            True if code appears obfuscated
        """
        # Check for base64 strings
        if re.search(r'[A-Za-z0-9+/]{50,}={0,2}', code):
            return True
        
        # Check for hex strings
        if re.search(r'\\x[0-9a-fA-F]{2}', code):
            return True
        
        # Check for excessive single-char variables
        single_char_vars = re.findall(r'\b[a-z]\b', code.lower())
        if len(single_char_vars) > len(code.split()) * 0.3:  # More than 30% single chars
            return True
        
        # Check for very long identifiers (possible obfuscation)
        long_identifiers = re.findall(r'\b\w{50,}\b', code)
        if len(long_identifiers) > 5:
            return True
        
        return False
    
    async def validate_python(self, code: str) -> List[Dict[str, str]]:
        """
        Validate Python code for security issues.
        
        Args:
            code: Python source code
            
        Returns:
            List of violations found
        """
        violations = []
        
        # Check patterns
        for sec_pattern in self.PYTHON_PATTERNS:
            if await self.contains_pattern(code.lower(), sec_pattern.pattern):
                violations.append({
                    "type": sec_pattern.category,
                    "message": sec_pattern.message,
                    "severity": sec_pattern.severity,
                    "pattern": sec_pattern.pattern
                })
        
        # Try to parse AST for deeper analysis
        try:
            tree = ast.parse(code)
            
            # Check for dangerous imports
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        if self._is_dangerous_import(alias.name):
                            violations.append({
                                "type": "import",
                                "message": f"Dangerous import detected: {alias.name}",
                                "severity": "high",
                                "pattern": f"import {alias.name}"
                            })
                
                elif isinstance(node, ast.ImportFrom):
                    if self._is_dangerous_import(node.module):
                        violations.append({
                            "type": "import",
                            "message": f"Dangerous import detected: {node.module}",
                            "severity": "high",
                            "pattern": f"from {node.module} import ..."
                        })
        
        except SyntaxError:
            # If code has syntax errors, it will be caught during execution
            pass
        
        return violations
    
    async def validate_javascript(self, code: str) -> List[Dict[str, str]]:
        """
        Validate JavaScript code for security issues.
        
        Args:
            code: JavaScript source code
            
        Returns:
            List of violations found
        """
        violations = []
        
        for sec_pattern in self.JAVASCRIPT_PATTERNS:
            if await self.contains_pattern(code, sec_pattern.pattern):
                violations.append({
                    "type": sec_pattern.category,
                    "message": sec_pattern.message,
                    "severity": sec_pattern.severity,
                    "pattern": sec_pattern.pattern
                })
        
        return violations
    
    async def validate_java(self, code: str) -> List[Dict[str, str]]:
        """
        Validate Java code for security issues.
        
        Args:
            code: Java source code
            
        Returns:
            List of violations found
        """
        violations = []
        
        for sec_pattern in self.JAVA_PATTERNS:
            if await self.contains_pattern(code, sec_pattern.pattern):
                violations.append({
                    "type": sec_pattern.category,
                    "message": sec_pattern.message,
                    "severity": sec_pattern.severity,
                    "pattern": sec_pattern.pattern
                })
        
        return violations
    
    def _is_dangerous_import(self, module_name: str) -> bool:
        """
        Check if module is dangerous.
        
        Args:
            module_name: Module name to check
            
        Returns:
            True if module is dangerous
        """
        if not module_name:
            return False
        
        dangerous_modules = {
            'os', 'sys', 'subprocess', 'socket', 'urllib',
            'requests', 'http', 'ftplib', 'telnetlib',
            'pickle', 'marshal', 'shelve', 'ctypes'
        }
        
        return module_name.split('.')[0] in dangerous_modules