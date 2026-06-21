"""
Docker Manager
Manages Docker containers for secure code execution
"""

from typing import Dict, Any, Optional
import docker
from docker.models.containers import Container
from loguru import logger
from app.core.config import settings
import time


class DockerManager:
    """
    Manages Docker containers for isolated code execution
    Provides security and resource limits
    """
    
    def __init__(self):
        """Initialize Docker client"""
        try:
            self.client = docker.from_env()
            self.enabled = settings.DOCKER_ENABLED
            logger.info("Docker client initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {str(e)}")
            self.client = None
            self.enabled = False
    
    def create_execution_container(
        self,
        language: str,
        timeout: int = 30
    ) -> Optional[Container]:
        """
        Create a container for code execution
        
        Args:
            language: Programming language
            timeout: Execution timeout in seconds
        
        Returns:
            Docker container instance
        """
        if not self.enabled or not self.client:
            logger.warning("Docker is not enabled or available")
            return None
        
        try:
            image = self._get_image_for_language(language)
            
            container = self.client.containers.create(
                image=image,
                detach=True,
                mem_limit=settings.DOCKER_MEMORY_LIMIT,
                cpu_quota=int(settings.DOCKER_CPU_LIMIT * 100000),
                network_disabled=True,  # No network access
                read_only=False,
                security_opt=['no-new-privileges'],
                cap_drop=['ALL'],
                cap_add=['CHOWN', 'SETUID', 'SETGID'],
            )
            
            logger.info(f"Created container {container.id[:12]} for {language}")
            return container
            
        except Exception as e:
            logger.error(f"Failed to create container: {str(e)}")
            return None
    
    def execute_code_in_container(
        self,
        container: Container,
        code: str,
        language: str,
        input_data: Optional[str] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Execute code inside container
        
        Args:
            container: Docker container
            code: Code to execute
            language: Programming language
            input_data: Input data for the code
            timeout: Execution timeout
        
        Returns:
            Execution result dictionary
        """
        try:
            # Start container
            container.start()
            
            # Prepare execution command
            command = self._prepare_execution_command(code, language, input_data)
            
            # Execute with timeout
            start_time = time.time()
            exec_result = container.exec_run(
                command,
                demux=True,
                stdin=True if input_data else False,
            )
            execution_time = (time.time() - start_time) * 1000  # Convert to ms
            
            # Get output
            stdout, stderr = exec_result.output
            exit_code = exec_result.exit_code
            
            # Decode output
            output = stdout.decode('utf-8') if stdout else ""
            error = stderr.decode('utf-8') if stderr else ""
            
            # Get resource usage
            stats = container.stats(stream=False)
            memory_used = stats['memory_stats'].get('usage', 0) / (1024 * 1024)  # MB
            
            return {
                "success": exit_code == 0,
                "output": output,
                "error": error,
                "exit_code": exit_code,
                "execution_time_ms": execution_time,
                "memory_used_mb": memory_used,
                "timeout": execution_time > (timeout * 1000)
            }
            
        except Exception as e:
            logger.error(f"Error executing code in container: {str(e)}")
            return {
                "success": False,
                "output": "",
                "error": str(e),
                "exit_code": -1,
                "execution_time_ms": 0,
                "memory_used_mb": 0,
                "timeout": False
            }
        finally:
            # Always clean up
            self.cleanup_container(container)
    
    def cleanup_container(self, container: Container):
        """
        Stop and remove container
        
        Args:
            container: Container to cleanup
        """
        try:
            container.stop(timeout=5)
            container.remove(force=True)
            logger.info(f"Cleaned up container {container.id[:12]}")
        except Exception as e:
            logger.error(f"Error cleaning up container: {str(e)}")
    
    def _get_image_for_language(self, language: str) -> str:
        """
        Get Docker image for language
        
        Args:
            language: Programming language
        
        Returns:
            Docker image name
        """
        images = {
            "python": "python:3.11-slim",
            "javascript": "node:18-alpine",
            "java": "openjdk:17-slim"
        }
        return images.get(language.lower(), "python:3.11-slim")
    
    def _prepare_execution_command(
        self,
        code: str,
        language: str,
        input_data: Optional[str] = None
    ) -> list:
        """
        Prepare execution command for language
        
        Args:
            code: Code to execute
            language: Programming language
            input_data: Input data
        
        Returns:
            Command as list
        """
        if language.lower() == "python":
            return ["python", "-c", code]
        elif language.lower() == "javascript":
            return ["node", "-e", code]
        elif language.lower() == "java":
            # Java requires compilation first
            return ["bash", "-c", f"echo '{code}' > Main.java && javac Main.java && java Main"]
        else:
            return ["sh", "-c", code]


# Singleton instance
docker_manager = DockerManager()