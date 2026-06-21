"""
Java Code Runner
Executes Java code with test cases
"""

from typing import Dict, Any, List, Optional
import subprocess
import tempfile
import os
import json
import time
from loguru import logger
from app.core.config import settings


class JavaRunner:
    """
    Executes Java code safely
    Compiles and runs with test cases
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
        Run Java code
        
        Args:
            code: Java code to execute
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
        temp_dir = None
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            
            # Extract class name
            import re
            match = re.search(r'public\s+class\s+(\w+)', code)
            class_name = match.group(1) if match else 'Solution'
            
            # Write code to file
            java_file = os.path.join(temp_dir, f"{class_name}.java")
            with open(java_file, 'w') as f:
                f.write(code)
            
            # Compile
            compile_result = subprocess.run(
                ['javac', java_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=temp_dir
            )
            
            if compile_result.returncode != 0:
                return {
                    "status": "compilation_error",
                    "output": None,
                    "error_message": compile_result.stderr,
                    "execution_time_ms": 0,
                    "exit_code": compile_result.returncode
                }
            
            # Execute
            start_time = time.time()
            
            result = subprocess.run(
                ['java', class_name],
                input=input_data,
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=temp_dir
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            return {
                "status": "success" if result.returncode == 0 else "runtime_error",
                "output": result.stdout,
                "error_message": result.stderr if result.returncode != 0 else None,
                "execution_time_ms": execution_time,
                "exit_code": result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                "status": "timeout",
                "output": None,
                "error_message": f"Execution exceeded {self.timeout} seconds",
                "execution_time_ms": self.timeout * 1000,
                "exit_code": -1
            }
        except Exception as e:
            return {
                "status": "runtime_error",
                "output": None,
                "error_message": str(e),
                "execution_time_ms": 0,
                "exit_code": -1
            }
        finally:
            # Clean up
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
    
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
            result = self._run_single_test(test_code, test_input)
            
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
        # Extract method name and class
        import re
        class_match = re.search(r'public\s+class\s+(\w+)', code)
        method_match = re.search(r'public\s+\w+\s+(\w+)\s*\(', code)
        
        class_name = class_match.group(1) if class_match else 'Solution'
        method_name = method_match.group(1) if method_match else 'solution'
        
        # Add main method for testing
        test_code = code.replace(
            f'public class {class_name}',
            f'''public class {class_name} {{
    public static void main(String[] args) {{
        {class_name} obj = new {class_name}();
        // Test input: {test_input}
        System.out.println(obj.{method_name}({test_input}));
    }}
    
    public static class {class_name}_Original'''
        )
        
        return test_code
    
    def _run_single_test(self, code: str, input_data: str) -> Dict[str, Any]:
        """Run a single test case"""
        return self._run_simple(code, input_data)
    
    def validate_syntax(self, code: str) -> Dict[str, Any]:
        """
        Validate Java syntax
        
        Args:
            code: Code to validate
        
        Returns:
            Validation result
        """
        temp_dir = None
        try:
            # Create temp directory
            temp_dir = tempfile.mkdtemp()
            
            # Extract class name
            import re
            match = re.search(r'public\s+class\s+(\w+)', code)
            class_name = match.group(1) if match else 'Solution'
            
            # Write code
            java_file = os.path.join(temp_dir, f"{class_name}.java")
            with open(java_file, 'w') as f:
                f.write(code)
            
            # Try to compile
            result = subprocess.run(
                ['javac', java_file],
                capture_output=True,
                text=True,
                timeout=10,
                cwd=temp_dir
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
                        "type": "CompilationError"
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
        finally:
            if temp_dir and os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)


# Singleton instance
java_runner = JavaRunner()