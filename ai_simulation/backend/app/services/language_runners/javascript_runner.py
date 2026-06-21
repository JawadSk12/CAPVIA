"""
JavaScript Code Runner
Executes JavaScript code with test cases
"""

from typing import Dict, Any, List, Optional
import subprocess
import tempfile
import os
import json
import time
from loguru import logger
from app.core.config import settings


class JavaScriptRunner:
    """
    Executes JavaScript code safely
    Runs test cases and captures results
    """
    
    def __init__(self):
        """Initialize runner"""
        self.timeout = settings.CODE_EXECUTION_TIMEOUT
    
    def run_code(
        self,
        code: str,
        test_cases: Optional[List[Dict[str, Any]]] = None,
        input_data: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Run JavaScript code
        
        Args:
            code: JavaScript code to execute
            test_cases: List of test cases
            input_data: Input data for the code
        
        Returns:
            Execution result dictionary
        """
        if test_cases:
            return self._run_with_test_cases(code, test_cases)
        else:
            return self._run_simple(code, input_data)
    
    def _run_simple(self, code: str, input_data: Optional[str] = None) -> Dict[str, Any]:
        """
        Run code without test cases
        
        Args:
            code: Code to run
            input_data: Optional input data
        
        Returns:
            Execution result
        """
        try:
            # Create temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(code)
                temp_file = f.name
            
            # Execute with Node.js
            start_time = time.time()
            
            result = subprocess.run(
                ['node', temp_file],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.timeout
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            # Clean up
            os.unlink(temp_file)
            
            return {
                "status": "success" if result.returncode == 0 else "runtime_error",
                "output": result.stdout,
                "error_message": result.stderr if result.returncode != 0 else None,
                "execution_time_ms": execution_time,
                "exit_code": result.returncode
            }
            
        except subprocess.TimeoutExpired:
            if 'temp_file' in locals():
                os.unlink(temp_file)
            return {
                "status": "timeout",
                "output": None,
                "error_message": f"Execution exceeded {self.timeout} seconds",
                "execution_time_ms": self.timeout * 1000,
                "exit_code": -1
            }
        except Exception as e:
            if 'temp_file' in locals():
                os.unlink(temp_file)
            return {
                "status": "runtime_error",
                "output": None,
                "error_message": str(e),
                "execution_time_ms": 0,
                "exit_code": -1
            }
    
    def _run_with_test_cases(
        self,
        code: str,
        test_cases: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Run code with test cases
        
        Args:
            code: Code to run
            test_cases: List of test cases with input/expected output
        
        Returns:
            Execution result with test case results
        """
        results = []
        passed_count = 0
        total_time = 0
        
        for i, test_case in enumerate(test_cases):
            test_input = test_case.get('input', '')
            expected_output = test_case.get('expected_output', '')
            
            # Prepare test code
            test_code = self._prepare_test_code(code, test_input, expected_output)
            
            # Run test
            result = self._run_single_test(test_code)
            
            # Check if passed
            actual_output = result.get('output', '').strip()
            expected_clean = str(expected_output).strip()
            passed = actual_output == expected_clean
            
            if passed:
                passed_count += 1
            
            total_time += result.get('execution_time_ms', 0)
            
            results.append({
                "test_case_number": i + 1,
                "input": test_input,
                "expected_output": expected_output,
                "actual_output": actual_output,
                "passed": passed,
                "execution_time_ms": result.get('execution_time_ms', 0),
                "error": result.get('error_message')
            })
        
        return {
            "status": "success",
            "test_cases_passed": passed_count,
            "test_cases_total": len(test_cases),
            "test_cases_results": results,
            "execution_time_ms": total_time / len(test_cases) if test_cases else 0,
            "all_passed": passed_count == len(test_cases)
        }
    
    def _prepare_test_code(
        self,
        code: str,
        test_input: str,
        expected_output: str
    ) -> str:
        """
        Prepare code with test case
        
        Args:
            code: Original code
            test_input: Test input
            expected_output: Expected output
        
        Returns:
            Code with test execution
        """
        # Extract function name from code
        import re
        match = re.search(r'function\s+(\w+)\s*\(', code)
        function_name = match.group(1) if match else 'solution'
        
        test_code = f"""
{code}

// Test execution
const testInput = {json.dumps(test_input)};
const result = {function_name}(testInput);
console.log(result);
"""
        return test_code
    
    def _run_single_test(self, code: str) -> Dict[str, Any]:
        """Run a single test case"""
        return self._run_simple(code)
    
    def validate_syntax(self, code: str) -> Dict[str, Any]:
        """
        Validate JavaScript syntax
        
        Args:
            code: Code to validate
        
        Returns:
            Validation result
        """
        try:
            # Use Node.js to check syntax
            result = subprocess.run(
                ['node', '--check'],
                input=code,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                return {
                    "valid": True,
                    "errors": []
                }
            else:
                return {
                    "valid": False,
                    "errors": [{
                        "message": result.stderr,
                        "type": "SyntaxError"
                    }]
                }
        except Exception as e:
            return {
                "valid": False,
                "errors": [{
                    "message": str(e),
                    "type": "ValidationError"
                }]
            }


# Singleton instance
javascript_runner = JavaScriptRunner()