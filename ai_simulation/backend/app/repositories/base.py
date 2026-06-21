"""
Base Repository
Generic CRUD operations for all repositories
"""

from typing import Generic, TypeVar, Type, Optional, List, Any, Dict
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
from app.db.session import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Base repository with CRUD operations
    All repositories inherit from this
    """
    
    def __init__(self, model: Type[ModelType]):
        """
        Initialize repository with model class
        
        Args:
            model: SQLAlchemy model class
        """
        self.model = model
    
    def get(self, db: Session, id: Any) -> Optional[ModelType]:
        """
        Get single record by ID
        
        Args:
            db: Database session
            id: Record ID
        
        Returns:
            Model instance or None
        """
        return db.query(self.model).filter(self.model.id == id).first()
    
    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: str = "id",
        order_dir: str = "desc"
    ) -> List[ModelType]:
        """
        Get multiple records with pagination
        
        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            order_by: Field to order by
            order_dir: Order direction (asc/desc)
        
        Returns:
            List of model instances
        """
        query = db.query(self.model)
        
        # Apply ordering
        order_column = getattr(self.model, order_by, self.model.id)
        if order_dir == "desc":
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(asc(order_column))
        
        return query.offset(skip).limit(limit).all()
    
    def create(self, db: Session, *, obj_in: CreateSchemaType) -> ModelType:
        """
        Create new record
        
        Args:
            db: Database session
            obj_in: Pydantic schema with data
        
        Returns:
            Created model instance
        """
        obj_in_data = jsonable_encoder(obj_in)
        db_obj = self.model(**obj_in_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def create_from_dict(self, db: Session, *, obj_in: Dict[str, Any]) -> ModelType:
        """
        Create new record from dictionary
        
        Args:
            db: Database session
            obj_in: Dictionary with data
        
        Returns:
            Created model instance
        """
        db_obj = self.model(**obj_in)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def update(
        self,
        db: Session,
        *,
        db_obj: ModelType,
        obj_in: UpdateSchemaType | Dict[str, Any]
    ) -> ModelType:
        """
        Update existing record
        
        Args:
            db: Database session
            db_obj: Existing model instance
            obj_in: Pydantic schema or dict with update data
        
        Returns:
            Updated model instance
        """
        obj_data = jsonable_encoder(db_obj)
        
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj
    
    def delete(self, db: Session, *, id: int) -> ModelType:
        """
        Delete record by ID
        
        Args:
            db: Database session
            id: Record ID
        
        Returns:
            Deleted model instance
        """
        obj = db.query(self.model).get(id)
        db.delete(obj)
        db.commit()
        return obj
    
    def count(self, db: Session, **filters) -> int:
        """
        Count records with optional filters
        
        Args:
            db: Database session
            **filters: Filter conditions
        
        Returns:
            Number of records
        """
        query = db.query(self.model)
        
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        
        return query.count()
    
    def exists(self, db: Session, **filters) -> bool:
        """
        Check if record exists with given filters
        
        Args:
            db: Database session
            **filters: Filter conditions
        
        Returns:
            True if record exists
        """
        query = db.query(self.model)
        
        for key, value in filters.items():
            if hasattr(self.model, key):
                query = query.filter(getattr(self.model, key) == value)
        
        return query.first() is not None
    
    def get_by_field(self, db: Session, field: str, value: Any) -> Optional[ModelType]:
        """
        Get record by specific field value
        
        Args:
            db: Database session
            field: Field name
            value: Field value
        
        Returns:
            Model instance or None
        """
        if hasattr(self.model, field):
            return db.query(self.model).filter(
                getattr(self.model, field) == value
            ).first()
        return None
    
    def get_multi_by_field(
        self,
        db: Session,
        field: str,
        value: Any,
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Get multiple records by field value
        
        Args:
            db: Database session
            field: Field name
            value: Field value
            skip: Number to skip
            limit: Maximum to return
        
        Returns:
            List of model instances
        """
        if hasattr(self.model, field):
            return db.query(self.model).filter(
                getattr(self.model, field) == value
            ).offset(skip).limit(limit).all()
        return []
    
    def bulk_create(self, db: Session, *, objs_in: List[CreateSchemaType]) -> List[ModelType]:
        """
        Create multiple records at once
        
        Args:
            db: Database session
            objs_in: List of create schemas
        
        Returns:
            List of created instances
        """
        db_objs = []
        for obj_in in objs_in:
            obj_in_data = jsonable_encoder(obj_in)
            db_obj = self.model(**obj_in_data)
            db_objs.append(db_obj)
        
        db.bulk_save_objects(db_objs)
        db.commit()
        
        return db_objs
    
    def search(
        self,
        db: Session,
        search_term: str,
        search_fields: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[ModelType]:
        """
        Search records across multiple fields
        
        Args:
            db: Database session
            search_term: Term to search for
            search_fields: Fields to search in
            skip: Number to skip
            limit: Maximum to return
        
        Returns:
            List of matching records
        """
        from sqlalchemy import or_
        
        query = db.query(self.model)
        
        search_filters = []
        for field in search_fields:
            if hasattr(self.model, field):
                column = getattr(self.model, field)
                search_filters.append(column.ilike(f"%{search_term}%"))
        
        if search_filters:
            query = query.filter(or_(*search_filters))
        
        return query.offset(skip).limit(limit).all()