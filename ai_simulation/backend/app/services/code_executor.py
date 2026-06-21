"""
Code Executor Service
Main service for executing code in different languages
Routes to appropriate language runner
"""

from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from loguru import logger
from app.core.config import settings
from app.models.question import ProgrammingLanguage
from app.models.execution import CodeExecution, ExecutionStatus
from app.services.language_runners.python_runner import python_runner
from app.services.language_runners.javascript_runner import javascript_runner
from app.services.language_runners.java_runner import java_runner
from app.services.docker_manager import docker_manager
from app.repositories.base import BaseRepository


class CodeExecutorService:
    """
    Executes code in different programming languages
    Manages execution environment and captures results
    """
    
    def __init__(self):
        """Initialize service"""
        self.runners = {
            "python": python_runner,
            "javascript": javascript_runner,
            "java": java_runner
        }
        self.docker_manager = docker_manager
    
    def execute_code(
        self,
        db: Session,
        code: str,
        language: str,
        test_cases: Optional[List[Dict[str, Any]]] = None,
        input_data: Optional[str] = None,
        submission_id: Optional[int] = None,
        use_docker: bool = True
    ) -> Dict[str, Any]:
        """
        Execute code in specified language
        
        Args:
            db: Database session
            code: Code to execute
            language: Programming language
            test_cases: Optional test cases
            input_data: Optional input data
            submission_id: Optional submission ID for tracking
            use_docker: Whether to use Docker for isolation
        
        Returns:
            Execution result dictionary
        """
        logger.info(f"Executing {language} code")
        
        # Validate language
        if language.lower() not in self.runners:
            return {
                "status": "error",
                "error_message": f"Unsupported language: {language}",
                "output": None
            }
        
        # Get appropriate runner
        runner = self.runners[language.lower()]
        
        # Execute code
        if use_docker and settings.DOCKER_ENABLED:
            result = self._execute_with_docker(code, language, test_cases, input_data)
        else:
            result = runner.run_code(code, test_cases, input_data)
        
        # Save execution record if submission_id provided
        if submission_id:
            self._save_execution_record(db, submission_id, code, language, result)
        
        return result
    
    def _execute_with_docker(
        self,
        code: str,
        language: str,
        test_cases: Optional[List[Dict[str, Any]]],
        input_data: Optional[str]
    ) -> Dict[str, Any]:
        """
        Execute code in Docker container
        
        Args:
            code: Code to execute
            language: Programming language
            test_cases: Test cases
            input_data: Input data
        
        Returns:
            Execution result
        """
        container = None
        try:
            # Create container
            container = self.docker_manager.create_execution_container(language)
            
            if not container:
                # Fallback to direct execution
                logger.warning("Failed to create container, falling back to direct execution")
                runner = self.runners[language.lower()]
                return runner.run_code(code, test_cases, input_data)
            
            # Execute in container
            result = self.docker_manager.execute_code_in_container(
                container,
                code,
                language,
                input_data
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Docker execution error: {str(e)}")
            # Fallback to direct execution
            runner = self.runners[language.lower()]
            return runner.run_code(code, test_cases, input_data)
        finally:
            if container:
                self.docker_manager.cleanup_container(container)
    
    def validate_code_syntax(
        self,
        code: str,
        language: str
    ) -> Dict[str, Any]:
        """
        Validate code syntax without executing
        
        Args:
            code: Code to validate
            language: Programming language
        
        Returns:
            Validation result
        """
        if language.lower() not in self.runners:
            return {
                "valid": False,
                "errors": [{
                    "message": f"Unsupported language: {language}",
                    "type": "LanguageError"
                }]
            }
        
        runner = self.runners[language.lower()]
        return runner.validate_syntax(code)
    
    def run_test_cases(
        self,
        db: Session,
        code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
        submission_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Run code against test cases
        
        Args:
            db: Database session
            code: Code to test
            language: Programming language
            test_cases: List of test cases
            submission_id: Optional submission ID
        
        Returns:
            Test results
        """
        return self.execute_code(
            db,
            code,
            language,
            test_cases=test_cases,
            submission_id=submission_id
        )
    
    def _save_execution_record(
        self,
        db: Session,
        submission_id: int,
        code: str,
        language: str,
        result: Dict[str, Any]
    ):
        """
        Save code execution record to database
        
        Args:
            db: Database session
            submission_id: Submission ID
            code: Executed code
            language: Programming language
            result: Execution result
        """
        try:
            # Map result status to ExecutionStatus
            status_mapping = {
                "success": ExecutionStatus.SUCCESS,
                "compilation_error": ExecutionStatus.COMPILATION_ERROR,
                "runtime_error": ExecutionStatus.RUNTIME_ERROR,
                "timeout": ExecutionStatus.TIMEOUT,
                "memory_limit": ExecutionStatus.MEMORY_LIMIT
            }
            
            status = status_mapping.get(
                result.get('status', 'runtime_error'),
                ExecutionStatus.RUNTIME_ERROR
            )
            
            # Create execution record
            execution = CodeExecution(
                submission_id=submission_id,
                language=language,
                code=code,
                status=status,
                output=result.get('output'),
                error_message=result.get('error_message'),
                execution_time_ms=result.get('execution_time_ms'),
                memory_used_mb=result.get('memory_used_mb'),
                test_cases_results=result.get('test_cases_results'),
                test_cases_passed=result.get('test_cases_passed', 0),
                test_cases_total=result.get('test_cases_total', 0)
            )
            
            db.add(execution)
            db.commit()
            
            logger.info(f"Saved execution record for submission {submission_id}")
            
        except Exception as e:
            logger.error(f"Failed to save execution record: {str(e)}")
            db.rollback()
    
    def get_supported_languages(self) -> List[str]:
        """
        Get list of supported programming languages
        
        Returns:
            List of language names
        """
        return list(self.runners.keys())
    
    def estimate_execution_time(self, code: str, language: str) -> int:
        """
        Estimate execution time for code
        
        Args:
            code: Code to analyze
            language: Programming language
        
        Returns:
            Estimated time in milliseconds
        """
        # Simple heuristic based on code length and complexity
        lines = code.count('\n')
        
        # Base time
        base_time = 100
        
        # Add time per line
        time_per_line = 10
        
        # Add time for loops
        loop_keywords = ['for', 'while', 'forEach', 'map', 'filter']
        loop_count = sum(code.lower().count(keyword) for keyword in loop_keywords)
        loop_time = loop_count * 50
        
        total_time = base_time + (lines * time_per_line) + loop_time
        
        return min(total_time, settings.CODE_EXECUTION_TIMEOUT * 1000)


# Singleton instance
code_executor = CodeExecutorService()