from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, ConfigDict

T = TypeVar("T")

class ErrorResponse(BaseModel):
    code: str
    message: str
    details: Optional[dict[str, Any]] = None

class APIResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    error: Optional[ErrorResponse] = None
    
    model_config = ConfigDict(populate_by_name=True)

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    data: list[T]
    total: int
    page: int
    size: int
    error: Optional[ErrorResponse] = None
