"""
Execution Metrics
=================
Tracks and records code execution metrics for monitoring and analysis.

Metrics tracked:
- Execution time
- Memory usage
- Success/failure rates
- Language distribution
- Error patterns

Author: AI Simulation Engine
Version: 1.0.0
"""

import logging
from typing import Dict, Any, List
from datetime import datetime, timedelta
from collections import defaultdict
import asyncio

logger = logging.getLogger(__name__)


class ExecutionMetrics:
    """
    Tracks execution metrics for monitoring.
    
    Stores metrics in memory (in production, would use Redis or database).
    """
    
    def __init__(self):
        """Initialize metrics storage"""
        self.metrics: List[Dict[str, Any]] = []
        self.stats: Dict[str, Any] = defaultdict(int)
        logger.info("ExecutionMetrics initialized")
    
    async def record(self, metric: Dict[str, Any]):
        """
        Record an execution metric.
        
        Args:
            metric: Metric data containing:
                - session_id
                - question_id
                - language
                - status
                - execution_time
                - memory_used
                - timestamp
        """
        self.metrics.append(metric)
        
        # Update stats
        self.stats["total_executions"] += 1
        self.stats[f"language_{metric['language']}"] += 1
        self.stats[f"status_{metric['status']}"] += 1
        
        # Keep only last 1000 metrics in memory
        if len(self.metrics) > 1000:
            self.metrics = self.metrics[-1000:]
        
        logger.debug(f"Recorded metric for session {metric['session_id']}")
    
    async def get_stats(self, time_window_minutes: int = 60) -> Dict[str, Any]:
        """
        Get aggregated statistics.
        
        Args:
            time_window_minutes: Time window for stats
            
        Returns:
            Dictionary with aggregated stats
        """
        cutoff = datetime.utcnow() - timedelta(minutes=time_window_minutes)
        
        recent_metrics = [
            m for m in self.metrics
            if m.get("timestamp", datetime.min) > cutoff
        ]
        
        if not recent_metrics:
            return {"message": "No metrics in time window"}
        
        # Calculate stats
        total = len(recent_metrics)
        successful = sum(1 for m in recent_metrics if m["status"] == "success")
        
        avg_time = sum(m["execution_time"] for m in recent_metrics) / total
        avg_memory = sum(m["memory_used"] for m in recent_metrics) / total
        
        # Language breakdown
        languages = defaultdict(int)
        for m in recent_metrics:
            languages[m["language"]] += 1
        
        return {
            "time_window_minutes": time_window_minutes,
            "total_executions": total,
            "successful_executions": successful,
            "success_rate": successful / total,
            "average_execution_time": avg_time,
            "average_memory_used": avg_memory,
            "language_breakdown": dict(languages)
        }